import { config } from '../config.js';
import { gommoServerDeviceFields } from './gommoDevice.js';

export class ByokIdentityError extends Error {
  status: number;
  code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH';

  constructor(message: string, status: number, code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH') {
    super(message);
    this.name = 'ByokIdentityError';
    this.status = status;
    this.code = code;
  }
}

interface GommoMePayload {
  success?: boolean;
  error?: unknown;
  message?: string;
  userInfo?: {
    id_base?: string;
    username?: string;
    email?: string;
    credits_ai?: number;
  };
  balancesInfo?: {
    credits_ai?: number;
    credits?: number;
  };
}

function isAuthMessage(message: string): boolean {
  return /token|đăng nhập|login|unauthori[sz]ed|expired|hết hạn/i.test(message);
}

function isDomainMismatchMessage(message: string): boolean {
  return /domain|đúng\s*domain|đối\s*tác|không cùng hệ thống/i.test(message);
}

export async function fetchGommoMeForDomain(
  accessToken: string,
  domain: string,
): Promise<GommoMePayload> {
  const body = new URLSearchParams({
    access_token: accessToken.trim(),
    domain: domain.trim() || config.gommo.apiDomain,
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
    return JSON.parse(text) as GommoMePayload;
  } catch {
    throw new ByokIdentityError(text || `Cannot verify account (HTTP ${response.status})`, 502, 'AUTH_REQUIRED');
  }
}

export async function resolveByokOwner(
  accessToken: string,
  domain: string,
): Promise<{ ownerId: string; username: string; email?: string }> {
  if (!accessToken.trim()) {
    throw new ByokIdentityError('Authorization Bearer token required', 401, 'AUTH_REQUIRED');
  }

  const me = await fetchGommoMeForDomain(accessToken, domain);
  const user = me.userInfo;
  const message = String(me.message || '');

  if (me.error || me.success === false || (!user?.id_base && !user?.email)) {
    if (isAuthMessage(message)) {
      throw new ByokIdentityError('Session expired — sign in again.', 401, 'AUTH_REQUIRED');
    }
    throw new ByokIdentityError(message || 'Invalid Gommo session for this domain.', 403, 'DOMAIN_MISMATCH');
  }

  const ownerId = String(user.id_base || user.username || user.email || '').trim();
  if (!ownerId) {
    throw new ByokIdentityError('Cannot resolve account id from /ai/me.', 403, 'DOMAIN_MISMATCH');
  }

  return {
    ownerId,
    username: String(user.username || '').trim(),
    email: user.email?.trim(),
  };
}
