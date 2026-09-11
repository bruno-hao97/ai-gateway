import { getStoredDomain, getStoredToken } from './auth-api';
import { appendDeviceToForm } from './gommo-device';
import { apiBase } from './gateway-base';

export type AlbumLibraryKind = 'images' | 'videos';

export interface LibraryFileItem {
  id: string;
  title: string;
  prompt: string;
  status: string;
  model: string;
  createdAt: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  mediaKind: 'image' | 'video';
  source: 'library' | 'upload';
}

const ALBUM_PATH: Record<AlbumLibraryKind, string> = {
  images: '/ai/library/album-images',
  videos: '/ai/library/album-videos',
};

function pickHttpUrl(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c.trim())) return c.trim();
  }
  return null;
}

function pickUrlFromMediaInfo(info: unknown): string | null {
  if (!info || typeof info !== 'object') return null;
  const row = info as Record<string, unknown>;
  return pickHttpUrl(
    row.result_url,
    row.file_url,
    row.url,
    row.download_url,
    row.thumbnail_url,
    row.music_url,
    row.audio_url,
  );
}

function extractLibraryListArrays(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];
  const root = (data as Record<string, unknown>).data;
  if (Array.isArray(root)) return root;
  if (root && typeof root === 'object') {
    const obj = root as Record<string, unknown>;
    for (const key of ['data', 'items', 'images', 'videos', 'album_images', 'album_videos']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}

function normalizeLibraryItem(raw: unknown, mediaKind: 'image' | 'video'): LibraryFileItem {
  const empty: LibraryFileItem = {
    id: '',
    title: '',
    prompt: '',
    status: '',
    model: '',
    createdAt: '',
    thumbnailUrl: null,
    mediaUrl: null,
    mediaKind,
    source: 'library',
  };
  if (!raw || typeof raw !== 'object') return empty;

  const item = raw as Record<string, unknown>;
  const modelInfo =
    item.modelInfo && typeof item.modelInfo === 'object'
      ? (item.modelInfo as Record<string, unknown>)
      : null;
  const title = String(item.title || item.name || '').trim();
  const model = String(
    item.model || item.model_id || item.model_name || modelInfo?.model || modelInfo?.name || '',
  ).trim();
  const prompt = String(item.prompt || item.content || item.tags || title).trim();
  const fileUrl = pickHttpUrl(
    item.file_url,
    item.download_url,
    item.url,
    pickUrlFromMediaInfo(item),
  );
  const thumbnailUrl = pickHttpUrl(
    item.cover_url,
    item.thumbnail_url,
    item.url_preview,
    item.thumbnail,
    mediaKind === 'image' ? fileUrl : null,
  );

  return {
    id: String(item.id_base || item.id || '').trim(),
    title,
    prompt,
    status: String(item.status || '').trim(),
    model,
    createdAt: String(item.created_time ?? item.created_at ?? item.updated_time ?? '').trim(),
    thumbnailUrl: thumbnailUrl || (mediaKind === 'image' ? fileUrl : null),
    mediaUrl: fileUrl || pickUrlFromMediaInfo(item),
    mediaKind,
    source: 'library',
  };
}

function buildAlbumFormBody(fields: Record<string, string>): URLSearchParams {
  const token = getStoredToken();
  if (!token) throw new Error('Missing access token — sign in first.');
  const body = new URLSearchParams();
  body.set('access_token', token);
  body.set('domain', getStoredDomain());
  appendDeviceToForm(body);
  for (const [key, value] of Object.entries(fields)) {
    const text = value.trim();
    if (text) body.set(key, text);
  }
  return body;
}

function parseGatewayError(raw: unknown, status: number): string {
  if (raw && typeof raw === 'object') {
    const msg = (raw as Record<string, unknown>).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return `Request failed (${status})`;
}

export async function fetchAlbumLibrary(opts: {
  kind: AlbumLibraryKind;
  limit?: number;
  projectId?: string;
}): Promise<LibraryFileItem[]> {
  const path = ALBUM_PATH[opts.kind];
  const mediaKind = opts.kind === 'videos' ? 'video' : 'image';
  const body = buildAlbumFormBody({
    limit: String(opts.limit ?? 48),
    ...(opts.projectId ? { project_id: opts.projectId } : {}),
  });

  const base = apiBase();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${getStoredToken()}`,
    },
    body: body.toString(),
  });

  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }
  if (!res.ok) throw new Error(parseGatewayError(raw, res.status));

  return extractLibraryListArrays(raw)
    .map((item) => normalizeLibraryItem(item, mediaKind))
    .filter((item) => item.id || item.mediaUrl || item.thumbnailUrl);
}

export function uploadFileItem(
  url: string,
  file: File,
  mediaKind: 'image' | 'video',
): LibraryFileItem {
  const isImage = mediaKind === 'image';
  return {
    id: `upload-${Date.now()}`,
    title: file.name,
    prompt: file.name,
    status: 'uploaded',
    model: '',
    createdAt: new Date().toISOString(),
    thumbnailUrl: isImage ? url : null,
    mediaUrl: url,
    mediaKind,
    source: 'upload',
  };
}
