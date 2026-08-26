import { Blob } from 'node:buffer';
import { config } from '../config.js';
import type { GommoEnvelope, GommoModel, JobType, PollMedia } from '../types/gommo.js';
import { gommoDeviceFields } from './gommoDevice.js';

/** Upstream V2 base — tương đương proxy mount `/v2` trên gateway. */
export const BASE_URL = config.gommo.baseUrl.replace(/\/$/, '');

export interface GommoClientOptions {
  accessToken: string;
  domain?: string;
  projectId?: string;
}

export class GommoApiError extends Error {
  status?: number;
  envelope?: GommoEnvelope;

  constructor(message: string, opts?: { status?: number; envelope?: GommoEnvelope }) {
    super(message);
    this.name = 'GommoApiError';
    this.status = opts?.status;
    this.envelope = opts?.envelope;
  }
}

export class GommoClient {
  accessToken: string;
  domain: string;
  projectId: string;

  constructor({
    accessToken,
    domain = config.gommo.apiDomain,
    projectId = 'default',
  }: GommoClientOptions) {
    this.accessToken = accessToken;
    this.domain = domain;
    this.projectId = projectId;
  }

  headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { ...extra };
    if (this.accessToken) {
      h.Authorization = `Bearer ${this.accessToken}`;
    }
    return h;
  }

  async parseResponse(res: Response): Promise<GommoEnvelope> {
    const text = await res.text();
    try {
      return JSON.parse(text) as GommoEnvelope;
    } catch {
      return { _rawText: text };
    }
  }

  async request(
    path: string,
    {
      method = 'GET',
      body,
      headers,
      retries = 2,
    }: {
      method?: string;
      body?: string | FormData | URLSearchParams | Buffer | null;
      headers?: Record<string, string>;
      retries?: number;
    } = {},
  ): Promise<GommoEnvelope> {
    let lastError: GommoApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: this.headers(headers),
          body,
        });
        const envelope = await this.parseResponse(res);

        if (res.status === 401 || res.status === 403) {
          throw new GommoApiError(envelope.message || `HTTP ${res.status}`, {
            status: res.status,
            envelope,
          });
        }

        if (res.status === 429 && attempt < retries) {
          await sleep(1000 * (attempt + 1) * 2);
          continue;
        }

        if (res.status >= 500 && attempt < retries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }

        if (!res.ok || envelope.success === false) {
          throw new GommoApiError(envelope.message || `HTTP ${res.status}`, {
            status: res.status,
            envelope,
          });
        }

        return envelope;
      } catch (err) {
        if (err instanceof GommoApiError) {
          if (err.status === 401 || err.status === 403 || attempt >= retries) throw err;
          lastError = err;
        } else if (attempt >= retries) {
          throw err;
        }
        await sleep(1000 * (attempt + 1));
        lastError = err instanceof GommoApiError ? err : new GommoApiError(String(err));
      }
    }

    throw lastError ?? new GommoApiError('Request failed');
  }

  flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(obj)) {
      const k = prefix ? `${prefix}[${key}]` : key;
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(out, this.flatten(value as Record<string, unknown>, k));
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (item != null && typeof item === 'object') {
            Object.assign(out, this.flatten(item as Record<string, unknown>, `${k}[${i}]`));
          } else if (item != null) out[`${k}[${i}]`] = item as string | number | boolean;
        });
      } else if (value != null && value !== '') {
        out[k] = value as string | number | boolean;
      }
    }
    return out;
  }

  toForm(fields: Record<string, unknown>): string {
    const p = new URLSearchParams();
    Object.entries(this.flatten(fields)).forEach(([k, v]) => p.append(k, String(v)));
    return p.toString();
  }

  async postForm(path: string, fields: Record<string, unknown>): Promise<GommoEnvelope> {
    return this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: this.toForm(fields),
    });
  }

  async uploadImage(
    data: Buffer | Uint8Array,
    fileName = 'image.png',
    mimeType = 'image/png',
  ): Promise<{ url: string; envelope: GommoEnvelope }> {
    if (!this.accessToken) throw new GommoApiError('Chưa có access token');
    const form = new FormData();
    form.append('access_token', this.accessToken);
    form.append('domain', this.domain);
    form.append('project_id', this.projectId);
    form.append('file', new Blob([data], { type: mimeType }), fileName);
    form.append('file_name', fileName);
    form.append('size', String(data.byteLength));

    const res = await fetch(`${BASE_URL}/ai/upload/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    const envelope = await this.parseResponse(res);
    if (!res.ok || envelope.success === false) {
      throw new GommoApiError(envelope.message || `Upload HTTP ${res.status}`, {
        status: res.status,
        envelope,
      });
    }
    const payload = envelope.data as Record<string, string> | undefined;
    const url = payload?.url || payload?.result_url || payload?.image_url;
    if (!url) throw new GommoApiError('Upload thành công nhưng không có URL', { envelope });
    return { url, envelope };
  }

  async uploadVideo(
    data: Buffer | Uint8Array,
    fileName = 'video.mp4',
    mimeType = 'video/mp4',
  ): Promise<{ url: string; envelope: GommoEnvelope }> {
    if (!this.accessToken) throw new GommoApiError('Chưa có access token');
    const form = new FormData();
    form.append('access_token', this.accessToken);
    form.append('domain', this.domain);
    form.append('project_id', this.projectId);
    form.append('video_file', new Blob([data], { type: mimeType }), fileName);

    const res = await fetch(`${BASE_URL}/ai/upload/video`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    const envelope = await this.parseResponse(res);
    if (!res.ok || envelope.success === false) {
      throw new GommoApiError(envelope.message || `Upload HTTP ${res.status}`, {
        status: res.status,
        envelope,
      });
    }
    const payload = envelope.data as Record<string, string> | undefined;
    const url = payload?.url || payload?.result_url || payload?.video_url;
    if (!url) throw new GommoApiError('Upload video thành công nhưng không có URL', { envelope });
    return { url, envelope };
  }

  async fetchModels(type: JobType): Promise<GommoEnvelope> {
    const q = `type=${encodeURIComponent(type)}&domain=${encodeURIComponent(this.domain)}`;
    const fields = { type, domain: this.domain, ...gommoDeviceFields() };
    try {
      return await this.postForm(`/ai/models?${q}`, fields);
    } catch {
      return await this.request(`/ai/models?${q}`);
    }
  }

  listModels(envelope: GommoEnvelope): GommoModel[] {
    const d = envelope?.data;
    if (Array.isArray(d)) return d as GommoModel[];
    if (d && Array.isArray((d as { models?: GommoModel[] }).models)) {
      return (d as { models: GommoModel[] }).models;
    }
    return [];
  }

  async createJob(
    type: JobType,
    modelId: string,
    fields: Record<string, unknown>,
  ): Promise<GommoEnvelope> {
    return this.postForm(`/ai/jobs/${type}/${modelId}`, {
      domain: this.domain,
      project_id: this.projectId,
      ...fields,
    });
  }

  async pollOnce(jobId: string, media: PollMedia): Promise<GommoEnvelope> {
    return this.postForm(`/ai/jobs/${encodeURIComponent(jobId)}?media=${media}`, {
      domain: this.domain,
      ...(media === 'music' ? { project_id: this.projectId } : {}),
    });
  }
}

/** Public catalog — user token → no auth → merchant token (server-only fallback). */
export async function fetchModelsCatalog(
  type: JobType,
  domain: string,
  userAccessToken?: string | null,
): Promise<GommoEnvelope> {
  const candidates: (string | null)[] = [];
  const user = userAccessToken?.trim();
  if (user) candidates.push(user);
  candidates.push(null);
  const merchant = config.gommo.accessToken;
  if (merchant && merchant !== user) candidates.push(merchant);

  const seen = new Set<string>();
  const tokens = candidates.filter((t) => {
    const key = t ?? '__public__';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastError: GommoApiError | null = null;
  for (const token of tokens) {
    try {
      const client = new GommoClient({ accessToken: token ?? '', domain });
      return await client.fetchModels(type);
    } catch (err) {
      if (err instanceof GommoApiError && (err.status === 401 || err.status === 403)) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new GommoApiError('Could not fetch models catalog');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
