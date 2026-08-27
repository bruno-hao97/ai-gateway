import { config } from '../config.js';

export class GommoAuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'GommoAuthError';
    this.status = status;
  }
}

function parseAuthResponse(res: Response, text: string): Record<string, unknown> {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GommoAuthError(text || `HTTP ${res.status}`, res.status || 502);
  }
  return raw;
}

export function extractAccessTokenFromPayload(payload: Record<string, unknown>): string {
  if (typeof payload.access_token === 'string') return payload.access_token.trim();
  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const token = (data as Record<string, unknown>).access_token;
    if (typeof token === 'string') return token.trim();
  }
  return '';
}

/** User login — proxied from gateway (no merchant token). */
export async function loginGommoUser(
  email: string,
  password: string,
  domain: string,
): Promise<{ accessToken: string; message?: string }> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) throw new GommoAuthError('Email is required');
  if (!password) throw new GommoAuthError('Password is required');

  const body = new URLSearchParams({
    email: trimmedEmail,
    password,
    domain: domain.trim() || config.gommo.apiDomain,
  }).toString();

  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  const raw = parseAuthResponse(res, text);
  const message = typeof raw.message === 'string' ? raw.message : '';
  const accessToken = extractAccessTokenFromPayload(raw);
  const hasError = Boolean(raw.error) || raw.success === false;

  if (!res.ok || hasError || !accessToken) {
    throw new GommoAuthError(message || 'Login failed', res.status || 401);
  }

  return { accessToken, message: message || undefined };
}
