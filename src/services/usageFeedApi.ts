import { config } from '../config.js';
import { GommoApiError } from './gommoClient.js';
import { gommoDeviceFields } from './gommoDevice.js';
import {
  classifySharedImageStatus,
  classifySharedVideoStatus,
  type StatusPhase,
} from './mediaGenerationStatus.js';

const AUTH_BASE = config.gommo.authBaseUrl.replace(/\/$/, '');
const AUTH_PATH = config.gommo.authPath.replace(/\/$/, '');

const IMAGE_URLS = [
  `${AUTH_BASE}/ai/images`,
  `${AUTH_BASE}${AUTH_PATH}/ai/images`,
];

const VIDEO_URLS = [
  `${AUTH_BASE}/ai/videos`,
  `${AUTH_BASE}${AUTH_PATH}/ai/videos`,
];

export interface UsageFeedImageItem {
  id_base: string;
  url?: string;
  url_preview?: string;
  prompt?: string;
  model?: string;
  status?: string;
  created_at?: number | string;
}

export interface UsageFeedVideoItem {
  id_base: string;
  prompt?: string;
  model?: string;
  status?: string;
  credit_fee?: number;
  download_url?: string;
  thumbnail_url?: string;
  created_time?: string | number;
  modelInfo?: { model?: string; name?: string };
}

export interface UsageFeedRecord {
  id: string;
  jobType: 'image' | 'video';
  model: string;
  prompt: string;
  status: 'success' | 'failed' | 'pending';
  credits: number | null;
  jobId: string;
  resultUrl?: string;
  createdAt: string;
  source: 'server';
}

export type UsageHistoryType = 'all' | 'image' | 'video';

export interface UsageFeedApiOptions {
  accessToken: string;
  domain: string;
  projectId?: string;
}

interface ListEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T[] | { data?: T[] };
  next_after_id?: string;
}

function extractListItems<T>(parsed: Record<string, unknown>): T[] {
  const data = parsed.data;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: T[] }).data)) {
    return (data as { data: T[] }).data;
  }
  const images = parsed.images as { data?: T[] } | undefined;
  if (images && Array.isArray(images.data)) return images.data;
  const videos = parsed.videos as { data?: T[] } | undefined;
  if (videos && Array.isArray(videos.data)) return videos.data;
  return [];
}

function phaseToUsageStatus(phase: StatusPhase): 'success' | 'failed' | 'pending' {
  if (phase === 'success') return 'success';
  if (phase === 'failed') return 'failed';
  return 'pending';
}

function unixToIso(value: number | string | undefined): string {
  if (value == null || value === '') return new Date().toISOString();
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return new Date().toISOString();
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString();
}

export function mapImageFeedItem(item: UsageFeedImageItem): UsageFeedRecord {
  const phase = classifySharedImageStatus(item.status);
  return {
    id: `image-${item.id_base}`,
    jobType: 'image',
    model: item.model || '—',
    prompt: (item.prompt || '').slice(0, 500),
    status: phaseToUsageStatus(phase),
    credits: null,
    jobId: item.id_base,
    resultUrl: item.url || item.url_preview,
    createdAt: unixToIso(item.created_at),
    source: 'server',
  };
}

export function mapVideoFeedItem(item: UsageFeedVideoItem): UsageFeedRecord {
  const phase = classifySharedVideoStatus(item.status);
  const model = item.model || item.modelInfo?.model || item.modelInfo?.name || '—';
  const credits = typeof item.credit_fee === 'number' && item.credit_fee > 0 ? item.credit_fee : null;
  return {
    id: `video-${item.id_base}`,
    jobType: 'video',
    model,
    prompt: (item.prompt || '').slice(0, 500),
    status: phaseToUsageStatus(phase),
    credits,
    jobId: item.id_base,
    resultUrl: item.download_url || item.thumbnail_url,
    createdAt: unixToIso(item.created_time),
    source: 'server',
  };
}

export class UsageFeedApi {
  accessToken: string;
  domain: string;
  projectId: string;

  constructor({ accessToken, domain, projectId = 'default' }: UsageFeedApiOptions) {
    this.accessToken = accessToken;
    this.domain = domain;
    this.projectId = projectId;
  }

  private listFields(extra: Record<string, string>): URLSearchParams {
    const device = gommoDeviceFields();
    const body = new URLSearchParams({
      access_token: this.accessToken,
      domain: this.domain,
      device_id: device.device_id,
      device_name: device.device_name,
      device_info: device.device_info,
      order_by: 'index',
      sort_by: 'desc',
      ...extra,
    });
    if (this.projectId && this.projectId !== 'default') {
      body.set('project_id', this.projectId);
    }
    return body;
  }

  private async postList<T>(urls: string[], body: URLSearchParams): Promise<ListEnvelope<T>> {
    let lastErr: GommoApiError | null = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: body.toString(),
        });
        const text = await res.text();
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new GommoApiError(text || `HTTP ${res.status}`, { status: res.status });
        }
        if (!res.ok || parsed.success === false) {
          throw new GommoApiError(String(parsed.message || `HTTP ${res.status}`), {
            status: res.status,
          });
        }
        return parsed as ListEnvelope<T>;
      } catch (err) {
        lastErr = err instanceof GommoApiError ? err : new GommoApiError(String(err));
      }
    }

    throw lastErr ?? new GommoApiError('Không gọi được feed API');
  }

  async fetchImages(limit: number, afterId?: string): Promise<UsageFeedRecord[]> {
    const fields: Record<string, string> = { limit: String(limit) };
    if (afterId) fields.after_id = afterId;
    const parsed = await this.postList<UsageFeedImageItem>(IMAGE_URLS, this.listFields(fields));
    return extractListItems<UsageFeedImageItem>(parsed as Record<string, unknown>)
      .filter((item) => item?.id_base)
      .map(mapImageFeedItem);
  }

  async fetchVideos(limit: number, afterId?: string): Promise<UsageFeedRecord[]> {
    const fields: Record<string, string> = { limit: String(limit) };
    if (afterId) fields.after_id = afterId;
    const parsed = await this.postList<UsageFeedVideoItem>(VIDEO_URLS, this.listFields(fields));
    return extractListItems<UsageFeedVideoItem>(parsed as Record<string, unknown>)
      .filter((item) => item?.id_base)
      .map(mapVideoFeedItem);
  }

  async fetchHistory(opts: {
    type?: UsageHistoryType;
    limit?: number;
  }): Promise<UsageFeedRecord[]> {
    const type = opts.type ?? 'all';
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 100);
    const out: UsageFeedRecord[] = [];

    if (type === 'all' || type === 'image') {
      out.push(...(await this.fetchImages(limit)));
    }
    if (type === 'all' || type === 'video') {
      out.push(...(await this.fetchVideos(limit)));
    }

    return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}
