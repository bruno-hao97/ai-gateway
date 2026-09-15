import { createHmac } from 'node:crypto';
import { resolveByokOwner } from './byokIdentity.js';
import { postWithDeliveryRetries } from './observabilityDelivery.js';
import {
  decryptWebhookSecret,
  listEnabledWebhooksForOwner,
  recordWebhookDelivery,
  type ObservabilityEventType,
  type WebhookDestination,
} from './observabilityStore.js';

export interface JobObservabilityPayload {
  jobType: string;
  modelSlug: string;
  jobId?: string;
  resultUrl?: string | null;
  coverUrl?: string | null;
  status: 'success' | 'failed' | 'created';
  error?: string;
  /** True when delivered after server-side poll for wait=false async jobs. */
  background?: boolean;
}

export interface ObservabilityDispatchInput {
  accessToken: string;
  domain: string;
  type: ObservabilityEventType;
  data: JobObservabilityPayload | Record<string, unknown>;
}

function signBody(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function buildWebhookHeaders(
  webhook: WebhookDestination,
  envelope: { type: ObservabilityEventType; timestamp: string; data: unknown },
  body: string,
): Record<string, string> {
  const timestamp = envelope.timestamp;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ai-gateway-observability/1.0',
    'X-Gateway-Event': envelope.type,
    'X-Gateway-Timestamp': timestamp,
  };

  const secret = decryptWebhookSecret(webhook);
  if (secret) {
    headers['X-Gateway-Signature'] = signBody(secret, timestamp, body);
  }

  return headers;
}

async function deliverWebhook(
  webhook: WebhookDestination,
  ownerId: string,
  envelope: { type: ObservabilityEventType; timestamp: string; data: unknown },
): Promise<void> {
  const body = JSON.stringify(envelope);
  const headers = buildWebhookHeaders(webhook, envelope, body);
  const result = await postWithDeliveryRetries(webhook.url, {
    method: 'POST',
    headers,
    body,
  });

  if (result.ok) {
    await recordWebhookDelivery(ownerId, webhook.id, { ok: true });
    return;
  }

  await recordWebhookDelivery(ownerId, webhook.id, {
    ok: false,
    error: result.error,
  });
}

export async function dispatchObservabilityEvent(input: ObservabilityDispatchInput): Promise<void> {
  let ownerId = '';
  try {
    const owner = await resolveByokOwner(input.accessToken, input.domain);
    ownerId = owner.ownerId;
  } catch {
    return;
  }

  const webhooks = await listEnabledWebhooksForOwner(ownerId, input.type);
  if (!webhooks.length) return;

  const envelope = {
    type: input.type,
    timestamp: new Date().toISOString(),
    data: input.data,
  };

  await Promise.allSettled(webhooks.map((webhook) => deliverWebhook(webhook, ownerId, envelope)));
}

export async function sendTestWebhook(
  ownerId: string,
  webhook: WebhookDestination,
): Promise<{ ok: boolean; error?: string }> {
  const envelope = {
    type: 'webhook.test' as ObservabilityEventType,
    timestamp: new Date().toISOString(),
    data: {
      message: 'AI Gateway observability test event',
      webhookId: webhook.id,
    },
  };

  const body = JSON.stringify(envelope);
  const headers = buildWebhookHeaders(webhook, envelope, body);
  const result = await postWithDeliveryRetries(webhook.url, {
    method: 'POST',
    headers,
    body,
  });

  if (result.ok) {
    await recordWebhookDelivery(ownerId, webhook.id, { ok: true });
    return { ok: true };
  }

  await recordWebhookDelivery(ownerId, webhook.id, { ok: false, error: result.error });
  return { ok: false, error: result.error };
}
