import { apiBase } from './gateway-base';
import { getStoredToken } from './auth-api';

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (raw as { message?: string }).message === 'string'
        ? (raw as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return raw as T;
}

export interface ByokProviderInfo {
  slug: string;
  name: string;
  chatSupported: boolean;
  configured: boolean;
  credentialCount: number;
}

export interface ByokSupportedChatModel {
  gatewayModelId: string;
  byokProvider: string;
  upstreamModel: string;
  gommoServer?: string;
}

export interface ByokCredential {
  id: string;
  ownerId: string;
  kind: 'provider' | 'gommo';
  providerSlug: string;
  label?: string;
  secretHint: string;
  allowedModels: string[] | null;
  priority: number;
  isFallback: boolean;
  strictOnly: boolean;
  sharedFallback: boolean;
  disabled: boolean;
  gommoDomain?: string;
  gommoUsername?: string;
  isPrimary?: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastError?: string;
}

export interface ByokStatus {
  enabled: boolean;
  beta?: boolean;
  platformFeePercent: number;
  platformFeePerRequest?: number;
  defaultSharedFallback: boolean;
  gommoLinked: boolean;
  primaryGommo?: {
    linked: boolean;
    primary?: {
      id: string;
      domain: string;
      username?: string;
      label?: string;
    };
  };
  platformFees?: {
    accruedCredits: number;
    settledCredits: number;
    outstandingCredits: number;
  };
  platformCredits?: number;
  providers: ByokProviderInfo[];
  supportedChatModels?: ByokSupportedChatModel[];
  ownerId: string;
}

export async function fetchByokStatus(): Promise<ByokStatus> {
  const res = await fetch(`${apiBase()}/gateway/byok/status`, { headers: authHeaders() });
  const body = await parseJson<{ success: boolean; data: ByokStatus }>(res);
  return body.data;
}

export async function fetchByokCredentials(kind?: 'provider' | 'gommo'): Promise<ByokCredential[]> {
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  const res = await fetch(`${apiBase()}/gateway/byok/credentials${q}`, { headers: authHeaders() });
  const body = await parseJson<{ success: boolean; data: ByokCredential[] }>(res);
  return body.data;
}

export async function createByokProviderCredential(input: {
  providerSlug: string;
  secret: string;
  label?: string;
  sharedFallback?: boolean;
  strictOnly?: boolean;
}): Promise<ByokCredential> {
  const res = await fetch(`${apiBase()}/gateway/byok/credentials`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ success: boolean; data: ByokCredential }>(res);
  return body.data;
}

export async function deleteByokCredential(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/gateway/byok/credentials/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJson(res);
}

export async function testByokCredential(id: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${apiBase()}/gateway/byok/credentials/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const body = await parseJson<{ success: boolean; data: { ok: boolean; message: string } }>(res);
  return body.data;
}

export async function linkGommoAccount(input: {
  domain: string;
  access_token?: string;
  label?: string;
  setPrimary?: boolean;
}): Promise<ByokCredential> {
  const res = await fetch(`${apiBase()}/gateway/byok/gommo-accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ success: boolean; data: ByokCredential }>(res);
  return body.data;
}

export async function setPrimaryGommoAccount(id: string): Promise<ByokCredential> {
  const res = await fetch(`${apiBase()}/gateway/byok/gommo-accounts/${encodeURIComponent(id)}/primary`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const body = await parseJson<{ success: boolean; data: ByokCredential }>(res);
  return body.data;
}

export async function patchByokCredential(
  id: string,
  patch: Partial<Pick<ByokCredential, 'label' | 'sharedFallback' | 'strictOnly' | 'disabled'>>,
): Promise<ByokCredential> {
  const res = await fetch(`${apiBase()}/gateway/byok/credentials/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  const body = await parseJson<{ success: boolean; data: ByokCredential }>(res);
  return body.data;
}

export interface ByokUsageSummary {
  byokRequests: number;
  platformRequests: number;
  byokErrors: number;
  totalPlatformFeeCredits: number;
}

export interface ByokUsageEvent {
  id: string;
  source: 'byok' | 'platform';
  route: 'chat' | 'openai';
  provider?: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  at: string;
  errorCode?: string;
}

export async function fetchByokUsage(days = 7, limit = 20): Promise<{
  summary: ByokUsageSummary;
  events: ByokUsageEvent[];
  days: number;
}> {
  const params = new URLSearchParams({
    days: String(days),
    limit: String(limit),
  });
  const res = await fetch(`${apiBase()}/gateway/byok/usage?${params}`, { headers: authHeaders() });
  const body = await parseJson<{
    success: boolean;
    data: { summary: ByokUsageSummary; events: ByokUsageEvent[]; days: number };
  }>(res);
  return body.data;
}
