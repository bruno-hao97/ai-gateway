import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { decryptSecret, encryptSecret, secretHint } from './byokCrypto.js';

export type ObservabilityEventType = 'job.completed' | 'job.failed' | 'webhook.test';

export interface WebhookDestination {
  id: string;
  ownerId: string;
  label?: string;
  url: string;
  encryptedSecret?: string;
  secretHint?: string;
  enabled: boolean;
  events: ObservabilityEventType[];
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'ok' | 'error';
  lastDeliveryError?: string;
}

export interface WebhookDestinationPublic extends Omit<WebhookDestination, 'encryptedSecret'> {}

interface ObservabilityStoreFile {
  webhooks: WebhookDestination[];
}

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStoreFile(): Promise<void> {
  const file = config.observability.storeFile;
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify({ webhooks: [] } satisfies ObservabilityStoreFile, null, 2), 'utf8');
  }
}

async function readStore(): Promise<ObservabilityStoreFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(config.observability.storeFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as ObservabilityStoreFile;
    if (!Array.isArray(parsed?.webhooks)) return { webhooks: [] };
    return { webhooks: parsed.webhooks };
  } catch {
    return { webhooks: [] };
  }
}

function queueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function writeStore(store: ObservabilityStoreFile): Promise<void> {
  await fs.writeFile(config.observability.storeFile, JSON.stringify(store, null, 2), 'utf8');
}

function toPublic(webhook: WebhookDestination): WebhookDestinationPublic {
  const { encryptedSecret: _secret, ...rest } = webhook;
  return rest;
}

export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function listWebhooks(ownerId: string): Promise<WebhookDestinationPublic[]> {
  const store = await readStore();
  return store.webhooks.filter((w) => w.ownerId === ownerId).map(toPublic);
}

export async function getWebhook(ownerId: string, id: string): Promise<WebhookDestination | null> {
  const store = await readStore();
  const webhook = store.webhooks.find((w) => w.id === id && w.ownerId === ownerId);
  return webhook ?? null;
}

export function decryptWebhookSecret(webhook: WebhookDestination): string | undefined {
  if (!webhook.encryptedSecret) return undefined;
  try {
    return decryptSecret(webhook.encryptedSecret);
  } catch {
    return undefined;
  }
}

export async function createWebhook(input: {
  ownerId: string;
  url: string;
  label?: string;
  secret?: string;
  events?: ObservabilityEventType[];
}): Promise<WebhookDestinationPublic> {
  const store = await readStore();
  const existing = store.webhooks.filter((w) => w.ownerId === input.ownerId);
  if (existing.length >= config.observability.maxWebhooksPerOwner) {
    throw new Error(`Maximum ${config.observability.maxWebhooksPerOwner} webhooks per account`);
  }

  const now = new Date().toISOString();
  const secret = input.secret?.trim();
  const webhook: WebhookDestination = {
    id: randomUUID(),
    ownerId: input.ownerId,
    label: input.label?.trim() || undefined,
    url: input.url.trim(),
    encryptedSecret: secret ? encryptSecret(secret) : undefined,
    secretHint: secret ? secretHint(secret) : undefined,
    enabled: true,
    events: input.events?.length ? input.events : ['job.completed', 'job.failed'],
    createdAt: now,
    updatedAt: now,
  };

  store.webhooks.push(webhook);
  await queueWrite(() => writeStore(store));
  return toPublic(webhook);
}

export async function updateWebhook(
  ownerId: string,
  id: string,
  patch: { enabled?: boolean; label?: string },
): Promise<WebhookDestinationPublic | null> {
  const store = await readStore();
  const webhook = store.webhooks.find((w) => w.id === id && w.ownerId === ownerId);
  if (!webhook) return null;

  if (typeof patch.enabled === 'boolean') webhook.enabled = patch.enabled;
  if (patch.label !== undefined) webhook.label = patch.label.trim() || undefined;
  webhook.updatedAt = new Date().toISOString();

  await queueWrite(() => writeStore(store));
  return toPublic(webhook);
}

export async function deleteWebhook(ownerId: string, id: string): Promise<boolean> {
  const store = await readStore();
  const idx = store.webhooks.findIndex((w) => w.id === id && w.ownerId === ownerId);
  if (idx < 0) return false;
  store.webhooks.splice(idx, 1);
  await queueWrite(() => writeStore(store));
  return true;
}

export async function recordWebhookDelivery(
  ownerId: string,
  id: string,
  result: { ok: boolean; error?: string },
): Promise<void> {
  const store = await readStore();
  const webhook = store.webhooks.find((w) => w.id === id && w.ownerId === ownerId);
  if (!webhook) return;

  webhook.lastDeliveryAt = new Date().toISOString();
  webhook.lastDeliveryStatus = result.ok ? 'ok' : 'error';
  webhook.lastDeliveryError = result.ok ? undefined : result.error?.slice(0, 500);
  webhook.updatedAt = webhook.lastDeliveryAt;

  await queueWrite(() => writeStore(store));
}

export async function listEnabledWebhooksForOwner(
  ownerId: string,
  eventType: ObservabilityEventType,
): Promise<WebhookDestination[]> {
  const store = await readStore();
  return store.webhooks.filter(
    (w) => w.ownerId === ownerId && w.enabled && w.events.includes(eventType),
  );
}
