import { API_BASE } from '@/lib/env';
import { getAccessToken, loadAuth, saveAuth } from '@/lib/authStore';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface GatewayEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  code?: string;
  raw?: Record<string, unknown>;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function authHeaders(json = true): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  const body = (await parseJson(res)) as GatewayEnvelope & { code?: string; message?: string };

  if (!res.ok) {
    throw new ApiError(body.message || `HTTP ${res.status}`, res.status, body.code);
  }
  return body as T;
}

export async function gatewayGet<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { headers: authHeaders(false) });
}

export async function gatewayPost<T = unknown>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data),
  });
}

export async function loginWithPassword(email: string, password: string, domain: string) {
  const body = new URLSearchParams({ email, password, domain });
  const res = await fetch(`${API_BASE}/api/apps/go-mmo/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await parseJson(res)) as { access_token?: string; message?: string; error?: unknown };
  if (!res.ok || data.error || !data.access_token) {
    throw new ApiError(String(data.message || 'Đăng nhập thất bại'), res.status);
  }
  return data.access_token;
}

export interface MeResponse {
  success?: boolean;
  userInfo?: {
    name?: string;
    email?: string;
    username?: string;
    avatar?: string;
  };
  balancesInfo?: {
    credits_ai?: number;
  };
  message?: string;
  error?: unknown;
}

export async function fetchMe(accessToken: string, domain: string): Promise<MeResponse> {
  const body = new URLSearchParams({ access_token: accessToken, domain });
  const res = await fetch(`${API_BASE}/api/apps/go-mmo/ai/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await parseJson(res)) as MeResponse;
  if (!res.ok || data.error) {
    throw new ApiError(String(data.message || 'Không lấy được thông tin user'), res.status);
  }
  return data;
}

export async function refreshMe(): Promise<MeResponse> {
  const token = getAccessToken();
  const auth = loadAuth();
  if (!token || !auth) throw new ApiError('Chưa đăng nhập', 401);
  const me = await fetchMe(token, auth.domain);
  saveAuth({ ...auth, me });
  return me;
}
