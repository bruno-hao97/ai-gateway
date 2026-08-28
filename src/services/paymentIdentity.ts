import { config } from '../config.js';
import { gommoServerDeviceFields } from './gommoDevice.js';

export const PAYMENT_DOMAIN_ERROR_MESSAGE =
  'Vui lòng truy cập đúng Domain mà bạn đăng ký để có thể nạp credit.';

const DOMAIN_PROBE_PLAN_ID = '__gateway_domain_probe__';

interface GommoMeResponse {
  success?: boolean;
  error?: unknown;
  message?: string;
  url?: string;
  url_embedded?: string;
  userInfo?: {
    id_base?: string;
    email?: string;
    username?: string;
  };
}

export class PaymentIdentityError extends Error {
  status: number;
  code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH' | 'ACCOUNT_MISMATCH';

  constructor(
    message: string,
    status: number,
    code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH' | 'ACCOUNT_MISMATCH',
  ) {
    super(message);
    this.name = 'PaymentIdentityError';
    this.status = status;
    this.code = code;
  }
}

export function bearerAccessToken(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function isDomainMismatchMessage(message: string): boolean {
  return /domain|đúng\s*domain|đối\s*tác|không cùng hệ thống/i.test(message);
}

function isAuthMessage(message: string): boolean {
  return /token|đăng nhập|login|unauthori[sz]ed|expired|hết hạn/i.test(message);
}

async function fetchGommoMe(accessToken: string): Promise<GommoMeResponse> {
  const body = new URLSearchParams({
    access_token: accessToken,
    domain: config.gommo.apiDomain,
    ...gommoServerDeviceFields(),
  }).toString();
  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/ai/me`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as GommoMeResponse;
  } catch {
    throw new Error(text || `Không thể xác minh tài khoản (HTTP ${response.status})`);
  }
}

async function probeGommoPaymentDomain(accessToken: string, amountVnd?: number): Promise<void> {
  const body = new URLSearchParams({
    access_token: accessToken,
    domain: config.gommo.apiDomain,
    plan_id: DOMAIN_PROBE_PLAN_ID,
    subscribe_type: 'MEMBER_PLAN_AI',
    type: 'ai_plan',
    gateway: 'payos',
    amount: String(Math.max(1, Math.floor(Number(amountVnd) || 50_000))),
    order_code: `PROBE-${Date.now().toString().slice(-8)}`,
    ...gommoServerDeviceFields(),
  }).toString();

  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/subscriptions/create_payment`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await response.text();
  let raw: GommoMeResponse;
  try {
    raw = JSON.parse(text) as GommoMeResponse;
  } catch {
    throw new Error(text || `Không thể xác minh domain (HTTP ${response.status})`);
  }

  const message = String(raw.message || '');
  if (isDomainMismatchMessage(message)) {
    throw new PaymentIdentityError(PAYMENT_DOMAIN_ERROR_MESSAGE, 403, 'DOMAIN_MISMATCH');
  }
  if (isAuthMessage(message)) {
    throw new PaymentIdentityError(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      401,
      'AUTH_REQUIRED',
    );
  }
}

/** Bearer token → username, without PayOS domain probe (list/history). */
export async function verifyBearerUsername(input: {
  accessToken: string;
  expectedUsername: string;
}): Promise<{ username: string }> {
  if (!input.accessToken) {
    throw new PaymentIdentityError('Vui lòng đăng nhập trước khi nạp credit.', 401, 'AUTH_REQUIRED');
  }

  const me = await fetchGommoMe(input.accessToken);
  const user = me.userInfo;
  if (me.error || me.success === false || (!user?.id_base && !user?.email)) {
    const upstreamMessage = String(me.message || '');
    if (isAuthMessage(upstreamMessage)) {
      throw new PaymentIdentityError('Phiên đăng nhập đã hết hạn.', 401, 'AUTH_REQUIRED');
    }
    throw new PaymentIdentityError(PAYMENT_DOMAIN_ERROR_MESSAGE, 403, 'DOMAIN_MISMATCH');
  }

  const username = String(user.username || '').trim();
  const expected = String(input.expectedUsername || '').trim();
  if (!username || username.toLocaleLowerCase() !== expected.toLocaleLowerCase()) {
    throw new PaymentIdentityError(
      'Tài khoản thanh toán không khớp với tài khoản đang đăng nhập.',
      403,
      'ACCOUNT_MISMATCH',
    );
  }

  return { username };
}

export async function verifyPaymentIdentity(input: {
  accessToken: string;
  expectedUsername: string;
  amountVnd?: number;
}): Promise<{ username: string }> {
  await probeGommoPaymentDomain(input.accessToken, input.amountVnd);
  return verifyBearerUsername({
    accessToken: input.accessToken,
    expectedUsername: input.expectedUsername,
  });
}
