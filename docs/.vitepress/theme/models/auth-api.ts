import { apiBase } from './gateway-base';
import { clearCachedMe } from './user-api';

export const STORAGE_TOKEN = 'gw_access_token';
export const STORAGE_DOMAIN = 'gw_login_domain';
export const DEFAULT_DOMAIN = '79ai.net';

export function gatewayBase(): string {
  return apiBase();
}

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(STORAGE_TOKEN) || '').trim();
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  const t = token.trim();
  if (t) localStorage.setItem(STORAGE_TOKEN, t);
  else localStorage.removeItem(STORAGE_TOKEN);
}

export function getStoredDomain(): string {
  if (typeof window === 'undefined') return DEFAULT_DOMAIN;
  return (localStorage.getItem(STORAGE_DOMAIN) || DEFAULT_DOMAIN).trim();
}

export function setStoredDomain(domain: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_DOMAIN, domain.trim() || DEFAULT_DOMAIN);
}

export function clearAuth(): void {
  setStoredToken('');
  clearCachedMe();
}

function extractToken(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  if (typeof p.access_token === 'string') return p.access_token.trim();
  if (p.data && typeof p.data === 'object' && p.data !== null) {
    const d = p.data as Record<string, unknown>;
    if (typeof d.access_token === 'string') return d.access_token.trim();
  }
  return '';
}

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
}

export async function loginWithEmail(email: string, password: string): Promise<string> {
  const res = await fetch(`${gatewayBase()}/gateway/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(String(data.message || data.error || 'Login failed'));
  }
  const token = extractToken(data);
  if (!token) throw new Error('No access_token in response');
  setStoredToken(token);
  setStoredDomain(DEFAULT_DOMAIN);
  return token;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  phone: string;
  name?: string;
}): Promise<string> {
  const res = await fetch(`${gatewayBase()}/gateway/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      phone: input.phone.trim(),
      name: input.name?.trim() || undefined,
    }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(String(data.message || data.error || 'Registration failed'));
  }
  const token = extractToken(data);
  if (!token) throw new Error('No access_token in response');
  setStoredToken(token);
  setStoredDomain(DEFAULT_DOMAIN);
  return token;
}
