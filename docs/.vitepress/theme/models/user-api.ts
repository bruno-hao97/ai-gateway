import { apiBase } from './gateway-base';
import { getStoredDomain, getStoredToken } from './auth-api';
import { appendDeviceToForm, gommoClientDeviceFields } from './gommo-device';
import type { UsageRecord } from './usage-history';
import type {
  UsageListData,
  UsageLogsData,
  UsageStatsData,
  UsageStatsPeriod,
  UsageStatsType,
} from './usage-stats';
import { listItemCreatedAt } from './usage-stats';

export const STORAGE_ME = 'gw_user_me';

export interface MeResponse {
  success?: boolean;
  userInfo?: {
    name?: string;
    email?: string;
    username?: string;
    avatar?: string;
    credits_ai?: number;
    credits_all?: number;
    balance?: number;
  };
  balancesInfo?: {
    credits_ai?: number;
    credits_all?: number;
    balance?: number;
    credits?: number;
  };
  data?: {
    userInfo?: MeResponse['userInfo'];
    balancesInfo?: MeResponse['balancesInfo'];
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

export interface TopupPaymentVat {
  enabled?: boolean;
  percent?: number;
  baseAmountVnd: number;
  vatAmountVnd: number;
  chargeAmountVnd: number;
}

export interface TopupPayment {
  url?: string;
  qrImage?: string;
  qrFallback?: string;
  orderCode?: string | number;
  content?: string;
  credits?: number;
  packageId?: string;
  amountVnd?: number;
  amountBaseVnd?: number;
  vatAmountVnd?: number;
  vatPercent?: number;
  paid?: boolean;
  paymentServer?: string;
  bank?: string;
  acc?: string;
  holder?: string;
  store?: string;
  vat?: TopupPaymentVat;
  deposit?: {
    status?: string;
    amount?: string;
    gateway?: string;
    created_time?: string;
  };
  bankTransfer?: { content?: string; amountFormatted?: string };
}

export interface PaymentSyncResult {
  paid: boolean;
  orderCode: string;
  deposit?: TopupPayment['deposit'];
  sync?: {
    ok?: number;
    scanned?: number;
    matched?: number;
    fulfilled?: number;
  };
}

export interface InvoiceBuyer {
  type: 'consumer' | 'personal' | 'company' | string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  national_id?: string;
  tax_code?: string;
  gui_name?: string;
  referral_code?: string;
}

export type TopupOrderStatus = 'pending' | 'paid' | 'credited' | 'failed';

export interface TopupOrder {
  orderCode: string;
  username: string;
  packageId: string;
  amountVnd: number;
  credits: number;
  status: TopupOrderStatus;
  source?: 'gommo' | 'payos';
  createdAt: string;
  paidAt?: string;
  creditedAt?: string;
}

export interface BillingStatus {
  gommoPayment?: boolean;
  billingMode?: 'gommo' | 'legacy';
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

function gatewayQueryParams(extra?: URLSearchParams): string {
  const params = extra ?? new URLSearchParams();
  const domain = getStoredDomain();
  if (domain && !params.has('domain')) params.set('domain', domain);
  return params.toString();
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

export function getEmail(me?: MeResponse | null): string {
  return me?.userInfo?.email?.trim() || '';
}

export function getAvatarUrl(me?: MeResponse | null): string {
  return me?.userInfo?.avatar?.trim() || '';
}

export function getCredits(me?: MeResponse | null): number {
  const sources = [
    me?.balancesInfo,
    me?.data?.balancesInfo,
    me?.userInfo,
    me?.data?.userInfo,
  ];
  for (const b of sources) {
    if (!b) continue;
    for (const key of ['credits_ai', 'credits_all', 'balance', 'credits'] as const) {
      const n = Number((b as Record<string, unknown>)[key]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return 0;
}

export function formatCredits(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function normalizeMeResponse(raw: Record<string, unknown>): MeResponse {
  const nested =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : null;
  const userInfo = (raw.userInfo || nested?.userInfo) as MeResponse['userInfo'];
  const balancesInfo = (raw.balancesInfo || nested?.balancesInfo) as MeResponse['balancesInfo'];
  return {
    ...(raw as MeResponse),
    userInfo,
    balancesInfo,
  };
}

export async function fetchMe(): Promise<MeResponse> {
  const token = getStoredToken();
  const domain = getStoredDomain();
  if (!token) throw new Error('Not signed in');

  const body = new URLSearchParams({ access_token: token, domain });
  appendDeviceToForm(body);
  const res = await fetch(`${apiBase()}/ai/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const data = normalizeMeResponse(raw);
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

export async function createTopup(
  username: string,
  packageId: string,
  invoiceBuyer?: InvoiceBuyer,
  promoCode?: string,
): Promise<TopupPayment> {
  const device = gommoClientDeviceFields('vi');
  const referralCode =
    typeof invoiceBuyer?.referral_code === 'string' ? invoiceBuyer.referral_code.trim() : '';
  const res = await fetch(`${apiBase()}/billing/payment/create`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      username,
      packageId,
      invoiceBuyer,
      promoCode: promoCode?.trim() || undefined,
      referralCode: referralCode || undefined,
      device_id: device.device_id,
      device_name: device.device_name,
      device_info: device.device_info,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: TopupPayment;
    message?: string;
  };
  if (!res.ok) throw new Error(String(data.message || 'Topup failed'));
  return data.data || {};
}

export async function syncGommoPayment(orderCode: string): Promise<PaymentSyncResult> {
  const device = gommoClientDeviceFields('vi');
  const res = await fetch(`${apiBase()}/billing/payment/sync`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      orderCode,
      device_id: device.device_id,
      device_name: device.device_name,
      device_info: device.device_info,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: PaymentSyncResult;
    message?: string;
  };
  if (!res.ok) throw new Error(String(data.message || 'Payment sync failed'));
  return data.data || { paid: false, orderCode };
}

export async function fetchTopupOrders(username: string, limit = 20): Promise<TopupOrder[]> {
  const params = new URLSearchParams({ username, limit: String(limit) });
  const res = await fetch(`${apiBase()}/billing/topup/orders?${params}`, {
    headers: authHeaders(false),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: TopupOrder[];
    message?: string;
  };
  if (!res.ok) throw new Error(String(data.message || 'Could not load topup history'));
  return data.data || [];
}

export function formatTopupOrderStatus(status: TopupOrderStatus, isVi: boolean): string {
  const labels: Record<TopupOrderStatus, [string, string]> = {
    pending: ['Pending', 'Chờ thanh toán'],
    paid: ['Paid', 'Đã thanh toán'],
    credited: ['Credited', 'Đã cộng credits'],
    failed: ['Failed', 'Thất bại'],
  };
  const pair = labels[status] || labels.pending;
  return isVi ? pair[1] : pair[0];
}

export function formatOrderDate(iso: string, isVi: boolean): string {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return iso;
  return new Date(d).toLocaleString(isVi ? 'vi-VN' : undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export interface AudioListItem {
  id_base: string;
  file_url: string;
  text?: string;
  status?: string;
  created_at?: string;
}

export async function fetchAudioLists(): Promise<AudioListItem[]> {
  const q = gatewayQueryParams();
  const res = await fetch(`${apiBase()}/gateway/audio/lists${q ? `?${q}` : ''}`, {
    headers: authHeaders(false),
  });
  const data = (await res.json().catch(() => ({}))) as { data?: AudioListItem[]; message?: string };
  if (!res.ok) throw new Error(String(data.message || 'Could not load audio history'));
  return data.data || [];
}

function usageFormBase(opts: {
  period?: UsageStatsPeriod;
  type?: UsageStatsType;
  language?: string;
  page?: number;
  limit?: number;
}): URLSearchParams {
  const form = new URLSearchParams();
  form.set('domain', getStoredDomain());
  if (opts.period) form.set('period', opts.period);
  if (opts.type) form.set('type', opts.type);
  form.set('language', opts.language || 'vi');
  if (opts.page != null) form.set('page', String(opts.page));
  if (opts.limit != null) form.set('limit', String(opts.limit));
  const locale = (opts.language || 'vi').toLowerCase();
  appendDeviceToForm(form, locale);
  return form;
}

async function postUsage<T>(path: 'stats' | 'logs', form: URLSearchParams): Promise<T> {
  const res = await fetch(`${apiBase()}/gateway/usage/${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders(false),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
  if (!res.ok) throw new Error(String(data.message || `Could not load usage ${path}`));
  if (data.data == null) throw new Error(`Empty usage ${path} response`);
  return data.data;
}

export async function fetchUsageStats(opts?: {
  period?: UsageStatsPeriod;
  type?: UsageStatsType;
  language?: string;
}): Promise<UsageStatsData> {
  const form = usageFormBase({
    period: opts?.period,
    type: opts?.type,
    language: opts?.language || 'vi',
  });
  return postUsage<UsageStatsData>('stats', form);
}

export async function fetchUsageLogs(opts?: {
  period?: UsageStatsPeriod;
  type?: UsageStatsType;
  language?: string;
  page?: number;
  limit?: number;
}): Promise<UsageLogsData> {
  const form = usageFormBase({
    period: opts?.period,
    type: opts?.type,
    language: opts?.language || 'VI',
    page: opts?.page ?? 1,
    limit: opts?.limit ?? 30,
  });
  return postUsage<UsageLogsData>('logs', form);
}

/** @deprecated Use fetchUsageLogs */
export async function fetchUsageList(opts?: {
  period?: UsageStatsPeriod;
  type?: UsageStatsType;
  language?: string;
  page?: number;
  limit?: number;
}): Promise<UsageListData> {
  return fetchUsageLogs(opts);
}

export type UsageHistoryType = 'all' | 'image' | 'video';

export async function fetchUsageHistory(opts?: {
  type?: UsageHistoryType;
  limit?: number;
  period?: UsageStatsPeriod;
}): Promise<UsageRecord[]> {
  const list = await fetchUsageLogs({
    type: opts?.type === 'image' || opts?.type === 'video' ? opts.type : 'all',
    period: opts?.period ?? '30d',
    limit: opts?.limit ?? 30,
  });
  return list.items.map((item, idx) => ({
    id: item.id_base || `usage-${idx}`,
    jobType: (item.type as UsageRecord['jobType']) || 'other',
    model: item.model || '—',
    prompt: (item.prompt || '').slice(0, 500),
    status:
      /fail|error/i.test(String(item.status || ''))
        ? ('failed' as const)
        : ('success' as const),
    credits: Number(item.credit ?? item.credit_fee ?? 0) || null,
    jobId: item.id_base,
    createdAt: listItemCreatedAt(item) || new Date().toISOString(),
    source: 'server' as const,
  }));
}
