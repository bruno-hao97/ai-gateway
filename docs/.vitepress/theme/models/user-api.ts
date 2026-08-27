import { apiBase } from './gateway-base';
import { getStoredDomain, getStoredToken } from './auth-api';

export const STORAGE_ME = 'gw_user_me';

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

export interface CreditPackage {
  id: string;
  name: string;
  amountVnd: number;
  credits: number;
  bonusPercent: number;
  featured?: boolean;
}

export interface TopupPayment {
  url?: string;
  qrImage?: string;
  orderCode?: number;
  credits?: number;
  bankTransfer?: { content?: string; amountFormatted?: string };
}

export interface BillingStatus {
  payosConfigured?: boolean;
  merchantReady?: boolean;
}

function authHeaders(json = true): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export function getCachedMe(): MeResponse | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_ME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

export function setCachedMe(me: MeResponse): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_ME, JSON.stringify(me));
}

export function clearCachedMe(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_ME);
}

export function getDisplayName(me?: MeResponse | null): string {
  const u = me?.userInfo;
  return u?.name?.trim() || u?.username?.trim() || u?.email?.trim() || 'User';
}

export function getUsername(me?: MeResponse | null): string {
  return me?.userInfo?.username?.trim() || '';
}

export function getCredits(me?: MeResponse | null): number {
  return me?.balancesInfo?.credits_ai ?? 0;
}

export function formatCredits(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export async function fetchMe(): Promise<MeResponse> {
  const token = getStoredToken();
  const domain = getStoredDomain();
  if (!token) throw new Error('Not signed in');

  const body = new URLSearchParams({ access_token: token, domain });
  const res = await fetch(`${apiBase()}/ai/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as MeResponse;
  if (!res.ok || data.error) {
    throw new Error(String(data.message || 'Could not load profile'));
  }
  setCachedMe(data);
  return data;
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const res = await fetch(`${apiBase()}/billing/status`, { headers: authHeaders(false) });
  const data = (await res.json().catch(() => ({}))) as { data?: BillingStatus };
  if (!res.ok) throw new Error('Could not load billing status');
  return data.data || {};
}

export async function fetchBillingPackages(): Promise<CreditPackage[]> {
  const res = await fetch(`${apiBase()}/billing/packages`, { headers: authHeaders(false) });
  const data = (await res.json().catch(() => ({}))) as { data?: CreditPackage[] };
  if (!res.ok) throw new Error('Could not load packages');
  return data.data || [];
}

export async function createTopup(username: string, packageId: string): Promise<TopupPayment> {
  const res = await fetch(`${apiBase()}/billing/topup/create`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ username, packageId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: TopupPayment;
    message?: string;
  };
  if (!res.ok) throw new Error(String(data.message || 'Topup failed'));
  return data.data || {};
}
