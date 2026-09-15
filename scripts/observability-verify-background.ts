#!/usr/bin/env tsx
/**
 * Live verify: wait=false async job → background poll → webhook delivery.
 *
 * Prerequisites:
 *   - Gateway running (npm run dev or docs:stack)
 *   - OBSERVABILITY_BACKGROUND_POLL not false
 *   - User Bearer token with credits for a small image job
 *
 * Usage:
 *   OBSERVABILITY_VERIFY_TOKEN=<access_token> npm run observability:verify-background
 *
 * Optional:
 *   OBSERVABILITY_VERIFY_GATEWAY_URL=http://localhost:3001
 *   OBSERVABILITY_VERIFY_DOMAIN=79ai.net
 *   OBSERVABILITY_VERIFY_MODEL_SLUG=flux-schnell
 *   OBSERVABILITY_VERIFY_TIMEOUT_MS=360000
 */
import 'dotenv/config';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const GATEWAY_URL = (
  process.env.OBSERVABILITY_VERIFY_GATEWAY_URL ||
  process.env.GATEWAY_VERIFY_URL ||
  'http://localhost:3001'
).replace(/\/$/, '');

const TOKEN = (
  process.env.OBSERVABILITY_VERIFY_TOKEN ||
  process.env.GATEWAY_VERIFY_TOKEN ||
  process.env.BILLING_VERIFY_TOKEN ||
  ''
).trim();
const DOMAIN = (process.env.OBSERVABILITY_VERIFY_DOMAIN || process.env.GOMMO_API_DOMAIN || '79ai.net').trim();
const MODEL_SLUG = (process.env.OBSERVABILITY_VERIFY_MODEL_SLUG || '').trim();
const TIMEOUT_MS = Number(process.env.OBSERVABILITY_VERIFY_TIMEOUT_MS) || 6 * 60 * 1000;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function skip(msg: string): never {
  console.log(`SKIP: ${msg}`);
  process.exit(0);
}

async function gatewayJson<T>(
  path: string,
  init: RequestInit & { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; success?: boolean };
  if (!res.ok) {
    fail(`${path} → HTTP ${res.status}: ${data.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

interface CaptureServer {
  url: string;
  waitForEvent: () => Promise<Record<string, unknown>>;
  close: () => Promise<void>;
}

async function createCaptureServer(): Promise<CaptureServer> {
  let resolver: ((value: Record<string, unknown>) => void) | null = null;
  const queue: Record<string, unknown>[] = [];

  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
          queue.push(parsed);
          resolver?.(parsed);
          resolver = null;
        } catch {
          /* ignore */
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/hook`;

  return {
    url,
    waitForEvent: () =>
      new Promise((resolve, reject) => {
        if (queue.length) {
          resolve(queue[0]!);
          return;
        }
        const timer = setTimeout(() => reject(new Error('Timed out waiting for webhook POST')), TIMEOUT_MS);
        resolver = (value) => {
          clearTimeout(timer);
          resolve(value);
        };
      }),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function extractJobIdBase(envelope: Record<string, unknown>): string | null {
  const data = envelope.data;
  const raw = envelope.raw;
  const fromData =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const fromRaw =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const imageInfo =
    (fromData.imageInfo as Record<string, unknown> | undefined) ||
    (fromRaw.imageInfo as Record<string, unknown> | undefined);
  const candidates = [
    imageInfo?.id_base,
    fromData.id_base,
    fromData.id,
    fromRaw.id_base,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

function extractResultUrl(envelope: Record<string, unknown>): string | null {
  const data = envelope.data;
  const raw = envelope.raw;
  const fromData =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const fromRaw =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const imageInfo =
    (fromData.imageInfo as Record<string, unknown> | undefined) ||
    (fromRaw.imageInfo as Record<string, unknown> | undefined);
  const candidates = [fromData.result_url, fromData.url, imageInfo?.url, imageInfo?.result_url];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c)) return c.trim();
  }
  return null;
}

function pickCatalogValue(item: unknown): string {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item && typeof item === 'object') {
    const row = item as Record<string, unknown>;
    const v =
      row.value ?? row.type ?? row.ratio ?? row.mode ?? row.resolution ?? row.duration ?? row.id;
    if (v != null && String(v).trim()) return String(v).trim();
    const name = row.name ?? row.label;
    if (name != null && String(name).trim()) return String(name).trim();
  }
  return '';
}

function pickCatalogList(model: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const val = model[key];
    if (Array.isArray(val) && val.length) {
      return val.map(pickCatalogValue).filter(Boolean);
    }
  }
  return [];
}

function modelSlugFromRow(row: Record<string, unknown>): string {
  return String(row.model ?? row.slug ?? row.model_id ?? row.id ?? '').trim();
}

async function pickImageModel(): Promise<{ slug: string; fields: Record<string, string> }> {
  const models = await gatewayJson<{ data?: unknown[] }>(
    `/gateway/models?type=image&domain=${encodeURIComponent(DOMAIN)}`,
  );
  const list = (Array.isArray(models.data) ? models.data : []).filter(
    (m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object' && !Array.isArray(m),
  );
  if (!list.length) fail('No image models in catalog');

  const preferred =
    (MODEL_SLUG ? list.find((m) => modelSlugFromRow(m) === MODEL_SLUG) : null) ??
    list.find((m) => modelSlugFromRow(m) === 'flux-schnell') ??
    list[0];
  const slug = modelSlugFromRow(preferred);
  if (!slug) fail('Could not read model slug from catalog');

  const fields: Record<string, string> = {};
  const ratios = pickCatalogList(preferred, 'ratios', 'ratio');
  if (ratios.length) fields.ratio = ratios[0];
  const resolutions = pickCatalogList(preferred, 'resolutions', 'resolution');
  if (resolutions.length) fields.resolution = resolutions[0];
  const modes = pickCatalogList(preferred, 'modes', 'mode');
  if (modes.length) fields.mode = modes[0];

  return { slug, fields };
}

async function main() {
  if (!TOKEN) {
    skip('Set OBSERVABILITY_VERIFY_TOKEN (or GATEWAY_VERIFY_TOKEN or BILLING_VERIFY_TOKEN) in .env');
  }

  console.log(`Observability background verify — gateway ${GATEWAY_URL}, domain ${DOMAIN}`);

  const health = await fetch(`${GATEWAY_URL}/health`);
  if (!health.ok) fail(`/health → HTTP ${health.status} (is the gateway running?)`);

  const capture = await createCaptureServer();
  let webhookId = '';

  try {
    console.log(`Local receiver: ${capture.url}`);

    const created = await gatewayJson<{ data: { id: string } }>('/gateway/observability/webhooks', {
      method: 'POST',
      body: {
        url: capture.url,
        label: 'observability-verify-background',
        secret: 'verify-whsec-test',
      },
    });
    webhookId = created.data.id;
    console.log(`Registered webhook ${webhookId}`);

    const { slug, fields: catalogFields } = await pickImageModel();
    const fieldSummary = Object.entries(catalogFields)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    console.log(`Creating async image job model=${slug} ${fieldSummary} wait=false`);

    const jobEnvelope = await gatewayJson<Record<string, unknown>>('/gateway/jobs/image', {
      method: 'POST',
      body: {
        modelSlug: slug,
        wait: false,
        domain: DOMAIN,
        fields: {
          prompt: 'Observability background verify — small test image',
          ...catalogFields,
        },
      },
    });

    const resultUrl = extractResultUrl(jobEnvelope);
    const jobId = extractJobIdBase(jobEnvelope);

    if (resultUrl) {
      skip(
        'Job returned resultUrl immediately (sync path). Pick a slower model or retry — background poll only runs for async jobs.',
      );
    }
    if (!jobId) fail('Create response missing id_base — cannot verify background poll');

    console.log(`Job accepted id_base=${jobId} — waiting for background webhook (timeout ${Math.round(TIMEOUT_MS / 1000)}s)…`);

    const event = await capture.waitForEvent();
    const type = event.type;
    const data =
      event.data && typeof event.data === 'object' && !Array.isArray(event.data)
        ? (event.data as Record<string, unknown>)
        : {};

    if (type !== 'job.completed' && type !== 'job.failed') {
      fail(`Unexpected event type: ${String(type)}`);
    }
    if (data.background !== true) {
      fail(`Expected data.background=true, got ${JSON.stringify(data.background)}`);
    }
    if (String(data.jobId || '') !== jobId && !String(data.jobId || '').includes(jobId)) {
      console.warn(`WARN: jobId mismatch payload=${data.jobId} expected=${jobId}`);
    }

    console.log(`PASS: received ${type} background=${data.background} status=${data.status}`);
    if (data.resultUrl) console.log(`  resultUrl: ${data.resultUrl}`);
    if (data.error) console.log(`  error: ${data.error}`);
  } finally {
    if (webhookId) {
      try {
        await gatewayJson(`/gateway/observability/webhooks/${encodeURIComponent(webhookId)}`, {
          method: 'DELETE',
        });
        console.log(`Deleted webhook ${webhookId}`);
      } catch {
        console.warn(`WARN: could not delete webhook ${webhookId}`);
      }
    }
    await capture.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
