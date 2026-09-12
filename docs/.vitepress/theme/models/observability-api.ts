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

export interface ObservabilityWebhook {
  id: string;
  ownerId: string;
  label?: string;
  url: string;
  secretHint?: string;
  enabled: boolean;
  events: string[];
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'ok' | 'error';
  lastDeliveryError?: string;
}

export async function fetchObservabilityWebhooks(): Promise<ObservabilityWebhook[]> {
  const res = await fetch(`${apiBase()}/gateway/observability/webhooks`, { headers: authHeaders() });
  const body = await parseJson<{ success: boolean; data: { webhooks: ObservabilityWebhook[] } }>(res);
  return body.data?.webhooks ?? [];
}

export async function createObservabilityWebhook(input: {
  url: string;
  label?: string;
  secret?: string;
}): Promise<ObservabilityWebhook> {
  const res = await fetch(`${apiBase()}/gateway/observability/webhooks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ success: boolean; data: ObservabilityWebhook }>(res);
  return body.data;
}

export async function updateObservabilityWebhook(
  id: string,
  patch: { enabled?: boolean; label?: string },
): Promise<ObservabilityWebhook> {
  const res = await fetch(`${apiBase()}/gateway/observability/webhooks/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  const body = await parseJson<{ success: boolean; data: ObservabilityWebhook }>(res);
  return body.data;
}

export async function deleteObservabilityWebhook(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/gateway/observability/webhooks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJson(res);
}

export async function testObservabilityWebhook(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${apiBase()}/gateway/observability/webhooks/${id}/test`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const body = await parseJson<{ success: boolean; data: { ok: boolean; error?: string } }>(res);
  return body.data ?? { ok: body.success };
}
