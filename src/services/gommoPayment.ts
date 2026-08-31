import { config } from '../config.js';
import {
  gommo79aiDeviceFields,
  type Gommo79aiDevicePayload,
} from './gommoDevice.js';
import { PAYMENT_DOMAIN_ERROR_MESSAGE, PaymentIdentityError } from './paymentIdentity.js';

const CREATE_PAYMENT_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}${config.gommo.authPath}/subscriptions/create_payment`;
const PAYMENT_SYNC_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}${config.gommo.authPath}/subscriptions/payment_sync`;

export const DEFAULT_INVOICE_BUYER = {
  type: 'consumer',
  name: 'Bán cho người tiêu dùng',
  email: '',
} as const;

export interface InvoiceBuyer {
  type: string;
  name: string;
  email?: string;
  [key: string]: unknown;
}

export interface CreateGommoPaymentInput {
  accessToken: string;
  domain?: string;
  idBase: string;
  amountVnd: number;
  invoiceBuyer?: InvoiceBuyer;
  promoCode?: string;
  referralCode?: string;
  device?: Gommo79aiDevicePayload;
}

export interface GommoPaymentVat {
  enabled?: boolean;
  percent?: number;
  baseAmountVnd: number;
  vatAmountVnd: number;
  chargeAmountVnd: number;
}

export interface CreateGommoPaymentResult {
  url: string;
  orderCode: string;
  content: string;
  amountVnd: number;
  amountBaseVnd: number;
  vatAmountVnd: number;
  vatPercent: number;
  qrImage: string;
  qrFallback?: string;
  gateway: string;
  paymentServer?: string;
  bank?: string;
  acc?: string;
  holder?: string;
  store?: string;
  vat?: GommoPaymentVat;
}

export interface SyncGommoPaymentInput {
  accessToken: string;
  domain?: string;
  orderCode: string;
  device?: Gommo79aiDevicePayload;
}

export interface GommoPaymentDeposit {
  order_code?: string;
  status?: string;
  amount?: string;
  gateway?: string;
  created_time?: string;
}

export interface SyncGommoPaymentResult {
  paid: boolean;
  orderCode: string;
  sync?: {
    ok?: number;
    scanned?: number;
    matched?: number;
    fulfilled?: number;
  };
  deposit?: GommoPaymentDeposit;
  runtime?: number;
}

export class GommoPaymentError extends Error {
  status: number;
  code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH' | 'UPSTREAM_ERROR' | 'VALIDATION_ERROR';

  constructor(
    message: string,
    status: number,
    code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH' | 'UPSTREAM_ERROR' | 'VALIDATION_ERROR',
  ) {
    super(message);
    this.name = 'GommoPaymentError';
    this.status = status;
    this.code = code;
  }
}

function isDomainMismatchMessage(message: string): boolean {
  return /domain|đúng\s*domain|đối\s*tác|không cùng hệ thống/i.test(message);
}

function isAuthMessage(message: string): boolean {
  return /token|đăng nhập|login|unauthori[sz]ed|expired|hết hạn/i.test(message);
}

function resolveDevice(device?: Gommo79aiDevicePayload): Gommo79aiDevicePayload {
  if (device?.device_id && device.device_name && device.device_info) return device;
  return gommo79aiDeviceFields();
}

export function readPaymentDevice(body: Record<string, unknown> | undefined): Gommo79aiDevicePayload | undefined {
  const device_id = typeof body?.device_id === 'string' ? body.device_id.trim() : '';
  const device_name = typeof body?.device_name === 'string' ? body.device_name.trim() : '';
  const device_info = typeof body?.device_info === 'string' ? body.device_info.trim() : '';
  if (!device_id || !device_name || !device_info) return undefined;
  return { device_id, device_name, device_info };
}

export function parseOrderCodeFromPaymentUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const des = parsed.searchParams.get('des')?.trim();
    if (des) return des;
  } catch {
    /* fall through */
  }

  const match = url.match(/[?&]des=([^&]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);

  throw new GommoPaymentError('Không đọc được mã đơn từ URL thanh toán.', 502, 'UPSTREAM_ERROR');
}

function throwUpstreamError(message: string): never {
  if (isDomainMismatchMessage(message)) {
    throw new GommoPaymentError(PAYMENT_DOMAIN_ERROR_MESSAGE, 403, 'DOMAIN_MISMATCH');
  }
  if (isAuthMessage(message)) {
    throw new GommoPaymentError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401, 'AUTH_REQUIRED');
  }
  throw new GommoPaymentError(message || 'Gommo payment failed', 502, 'UPSTREAM_ERROR');
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GommoPaymentError(text || `Gommo payment HTTP ${response.status}`, 502, 'UPSTREAM_ERROR');
  }
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

function resolveOrderCode(url: string, raw: Record<string, unknown>): string {
  const nested = raw.data as Record<string, unknown> | undefined;
  const direct = pickString(raw.order_code, raw.content, nested?.order_code, nested?.content);
  if (direct) return direct;
  if (url) return parseOrderCodeFromPaymentUrl(url);
  throw new GommoPaymentError('Không đọc được mã đơn từ phản hồi thanh toán.', 502, 'UPSTREAM_ERROR');
}

function parseVatBlock(raw: Record<string, unknown>, fallbackBase: number): GommoPaymentVat {
  const vat = (raw.vat ?? {}) as Record<string, unknown>;
  const baseAmountVnd = pickNumber(vat.base_amount) ?? fallbackBase;
  const vatAmountVnd = pickNumber(vat.vat_amount) ?? Math.round(baseAmountVnd * 0.05);
  const chargeAmountVnd =
    pickNumber(vat.charge_amount) ?? baseAmountVnd + vatAmountVnd;
  const percent = pickNumber(vat.percent) ?? 5;
  return {
    enabled: Number(vat.enabled ?? 1) === 1,
    percent,
    baseAmountVnd,
    vatAmountVnd,
    chargeAmountVnd,
  };
}

export async function createGommoPayment(input: CreateGommoPaymentInput): Promise<CreateGommoPaymentResult> {
  if (!input.accessToken) {
    throw new GommoPaymentError('Vui lòng đăng nhập trước khi nạp credit.', 401, 'AUTH_REQUIRED');
  }

  const device = resolveDevice(input.device);
  const invoiceBuyer = input.invoiceBuyer ?? DEFAULT_INVOICE_BUYER;
  const body = new URLSearchParams({
    access_token: input.accessToken,
    domain: (input.domain || config.gommo.apiDomain).trim(),
    id_base: input.idBase,
    gateway: 'payos',
    amount: String(Math.max(1, Math.floor(input.amountVnd))),
    invoice_buyer: JSON.stringify(invoiceBuyer),
    language: 'vi',
    device_id: device.device_id,
    device_name: device.device_name,
    device_info: device.device_info,
  });

  const promoCode = String(input.promoCode || '').trim();
  const referralCode = String(input.referralCode || '').trim();
  if (promoCode) body.set('promo_code', promoCode);
  if (referralCode) body.set('referral_code', referralCode);

  const response = await fetch(CREATE_PAYMENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const raw = await parseJsonResponse(response);
  const status = String(raw.status || '');
  const error = Number(raw.error ?? 0);
  const message = String(raw.message || '');
  const nested = raw.data as Record<string, unknown> | undefined;
  const url = pickString(raw.url, raw.qr, nested?.checkoutUrl, nested?.qrUrl);
  const qrImage = pickString(raw.qr, raw.url, nested?.qrUrl, nested?.checkoutUrl, url);
  const qrFallback = pickString(raw.qr_fallback, nested?.qr_fallback);

  if (error !== 0 || (status && status !== 'success') || !url) {
    throwUpstreamError(message || 'Không tạo được đơn thanh toán.');
  }

  const orderCode = resolveOrderCode(url, raw);
  const content = pickString(raw.content, nested?.content, orderCode);
  const vat = parseVatBlock(raw, input.amountVnd);
  const amountFromUrl = (() => {
    try {
      const amount = new URL(url).searchParams.get('amount');
      const n = Number(amount);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    } catch {
      return undefined;
    }
  })();
  const chargeAmountVnd = vat.chargeAmountVnd || amountFromUrl || input.amountVnd;

  return {
    url,
    orderCode,
    content,
    amountVnd: chargeAmountVnd,
    amountBaseVnd: vat.baseAmountVnd,
    vatAmountVnd: vat.vatAmountVnd,
    vatPercent: vat.percent ?? 5,
    qrImage,
    qrFallback: qrFallback || undefined,
    gateway: 'payos',
    paymentServer: pickString(raw.payment_server) || undefined,
    bank: pickString(raw.bank, nested?.bank) || undefined,
    acc: pickString(raw.acc, nested?.acc) || undefined,
    holder: pickString(raw.holder, nested?.holder) || undefined,
    store: pickString(raw.store, nested?.store) || undefined,
    vat,
  };
}

export async function syncGommoPayment(input: SyncGommoPaymentInput): Promise<SyncGommoPaymentResult> {
  if (!input.accessToken) {
    throw new GommoPaymentError('Vui lòng đăng nhập trước khi đồng bộ thanh toán.', 401, 'AUTH_REQUIRED');
  }

  const orderCode = String(input.orderCode || '').trim();
  if (!orderCode) {
    throw new GommoPaymentError('orderCode bắt buộc', 400, 'VALIDATION_ERROR');
  }

  const device = resolveDevice(input.device);
  const body = new URLSearchParams({
    access_token: input.accessToken,
    domain: (input.domain || config.gommo.apiDomain).trim(),
    order_code: orderCode,
    language: 'vi',
    device_id: device.device_id,
    device_name: device.device_name,
    device_info: device.device_info,
  });

  const response = await fetch(PAYMENT_SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const raw = await parseJsonResponse(response);
  const error = Number(raw.error ?? 0);
  const message = String(raw.message || '');

  if (error !== 0 && message) {
    throwUpstreamError(message);
  }

  const paid = Number(raw.paid ?? 0) === 1;
  const sync = raw.sync as SyncGommoPaymentResult['sync'];
  const deposit = raw.deposit as GommoPaymentDeposit | undefined;
  const runtime = Number(raw.runtime);

  return {
    paid,
    orderCode,
    sync,
    deposit,
    runtime: Number.isFinite(runtime) ? runtime : undefined,
  };
}

export function mapGommoPaymentError(err: unknown): { status: number; message: string; code: string } {
  if (err instanceof GommoPaymentError) {
    return { status: err.status, message: err.message, code: err.code };
  }
  if (err instanceof PaymentIdentityError) {
    return { status: err.status, message: err.message, code: err.code };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { status: 500, message, code: 'INTERNAL_ERROR' };
}
