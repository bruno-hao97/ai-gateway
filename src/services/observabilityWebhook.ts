import { createHmac } from 'node:crypto';
import { config } from '../config.js';
import { resolveByokOwner } from './byokIdentity.js';
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

async function deliverWebhook(
  webhook: WebhookDestination,
  ownerId: string,
  envelope: { type: ObservabilityEventType; timestamp: string; data: unknown },
): Promise<void> {
  const body = JSON.stringify(envelope);
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.observability.deliveryTimeoutMs);

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      await recordWebhookDelivery(ownerId, webhook.id, {
        ok: false,
        error: `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      });
      return;
    }
    await recordWebhookDelivery(ownerId, webhook.id, { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordWebhookDelivery(ownerId, webhook.id, { ok: false, error: message });
  } finally {
    clearTimeout(timer);
  }
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.observability.deliveryTimeoutMs);

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
      await recordWebhookDelivery(ownerId, webhook.id, { ok: false, error });
      return { ok: false, error };
    }
    await recordWebhookDelivery(ownerId, webhook.id, { ok: true });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await recordWebhookDelivery(ownerId, webhook.id, { ok: false, error });
    return { ok: false, error };
  } finally {
    clearTimeout(timer);
  }
}
