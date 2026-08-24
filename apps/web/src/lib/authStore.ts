import type { MeResponse } from '@/lib/apiClient';
import { GOMMO_DOMAIN } from '@/lib/env';

const SESSION_KEY = 'ai_gateway_session';

export interface AuthSession {
  access_token: string;
  domain: string;
  me?: MeResponse;
}

export function loadAuth(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveAuth(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAuth(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(loadAuth()?.access_token);
}

export function getAccessToken(): string {
  return loadAuth()?.access_token || '';
}

export function getUsername(): string {
  return loadAuth()?.me?.userInfo?.username?.trim() || '';
}

export function getCreditsAi(): number {
  return loadAuth()?.me?.balancesInfo?.credits_ai ?? 0;
}

export function getDisplayName(): string {
  const u = loadAuth()?.me?.userInfo;
  return u?.name?.trim() || u?.username?.trim() || u?.email?.trim() || 'User';
}

export function defaultDomain(): string {
  return loadAuth()?.domain || GOMMO_DOMAIN;
}
