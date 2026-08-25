import type { PollSnapshot } from './types.js';

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
    : null;
}

function pickHttpUrl(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c.trim())) return c.trim();
  }
  return null;
}

const GATEWAY_SUCCESS = new Set(['SUCCESS', 'SUCCEEDED', 'DONE', 'COMPLETED']);
const GATEWAY_RUNNING = new Set(['PROCESSING', 'PENDING', 'QUEUED', 'ACTIVE']);
const GATEWAY_FAILED = new Set(['FAILED', 'ERROR', 'CANCELLED', 'REJECTED']);

function normalizeStatus(status: unknown): string {
  if (status == null || status === '') return '';
  return String(status).toUpperCase().trim();
}

export function classifyPollStatus(status: unknown, resultUrl?: string | null): 'success' | 'running' | 'failed' | 'unknown' {
  const s = normalizeStatus(status);
  const hasUrl = typeof resultUrl === 'string' && /^https?:\/\//i.test(resultUrl);

  if (hasUrl && !GATEWAY_RUNNING.has(s)) return 'success';
  if (GATEWAY_SUCCESS.has(s)) return 'success';
  if (GATEWAY_RUNNING.has(s)) return 'running';
  if (GATEWAY_FAILED.has(s)) return 'failed';
  if (hasUrl) return 'success';
  return 'unknown';
}

/** Extract job id from create/poll envelope. */
export function extractJobId(envelope: unknown): string | undefined {
  const root = asRecord(envelope);
  if (!root) return undefined;
  const data = asRecord(root.data) || {};
  const raw = asRecord(root.raw) || {};
  const imageInfo = asRecord(raw.imageInfo) || {};
  const candidates = [
    data.id_base,
    data.jobId,
    data.job_id,
    data.id,
    imageInfo.id_base,
    root.id_base,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

/** Extract poll snapshot from gateway envelope. */
export function extractPollSnapshot(envelope: unknown): PollSnapshot {
  const root = asRecord(envelope) || {};
  const data = asRecord(root.data) || {};
  const raw = asRecord(root.raw) || {};
  const imageInfo = asRecord(raw.imageInfo) || {};
  const videoInfo = asRecord(raw.videoInfo) || {};
  const musicInfo = asRecord(raw.musicInfo) || {};
  const audioInfo = asRecord(raw.audioInfo) || {};

  const coverUrl = pickHttpUrl(
    data.cover_url,
    data.coverUrl,
    data.result_url_thumb,
    musicInfo.cover_url,
    musicInfo.coverUrl,
    audioInfo.cover_url,
    audioInfo.coverUrl,
  );

  const resultUrl = pickHttpUrl(
    data.resultUrl,
    data.result_url,
    data.music_url,
    imageInfo.result_url,
    videoInfo.result_url,
    videoInfo.url,
    musicInfo.music_url,
    musicInfo.audio_url,
    musicInfo.result_url,
    musicInfo.url,
    audioInfo.file_url,
    audioInfo.music_url,
    audioInfo.audio_url,
    audioInfo.result_url,
    audioInfo.url,
    root.music_url,
  );

  return {
    status:
      String(data.status || imageInfo.status || videoInfo.status || musicInfo.status || audioInfo.status || ''),
    resultUrl,
    coverUrl,
    idBase: extractJobId(envelope),
  };
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export const DEFAULT_POLL_INTERVAL_MS = 3500;
export const DEFAULT_POLL_MAX_ATTEMPTS = 80;
