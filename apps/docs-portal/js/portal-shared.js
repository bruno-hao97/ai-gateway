/** Shared portal helpers — token, base URL, Gommo model catalog parsing */

export const STORAGE_BASE = 'portal_base_url';
export const STORAGE_TOKEN = 'portal_access_token';
export const STORAGE_DOMAIN = 'portal_login_domain';
export const STORAGE_MODELS_PREFIX = 'portal_models_';
export const DEFAULT_API = 'http://localhost:3001';

export const JOB_TYPES = [
  { id: 'image', label: 'Image', group: 'media' },
  { id: 'video', label: 'Video', group: 'media' },
  { id: 'music', label: 'Music', group: 'media' },
  { id: 'tts', label: 'TTS', group: 'media' },
  { id: 'avatar-lipsync', label: 'Avatar', group: 'media' },
  { id: 'image-upscale', label: 'Upscale image', group: 'tools' },
  { id: 'remove-bg', label: 'Remove BG', group: 'tools' },
  { id: 'video-upscale', label: 'Upscale video', group: 'tools' },
  { id: 'video-vfx', label: 'Video VFX', group: 'tools' },
  { id: 'video-subtitle', label: 'Subtitles', group: 'tools' },
  { id: 'video-cut', label: 'Video cut', group: 'tools' },
];

export function docsUrl() {
  return (
    localStorage.getItem('portal_docs_url') ||
    (location.hostname === 'localhost' ? 'http://localhost:5173' : '/')
  );
}

export function defaultBaseUrl() {
  const saved = localStorage.getItem(STORAGE_BASE);
  if (saved) return saved.replace(/\/$/, '');
  const origin = window.location.origin.replace(/\/$/, '');
  if (window.location.port === '3001') return origin;
  return DEFAULT_API;
}

export function getStoredToken() {
  return (sessionStorage.getItem(STORAGE_TOKEN) || '').trim();
}

export function setStoredToken(value) {
  const t = (value ?? '').trim();
  if (t) sessionStorage.setItem(STORAGE_TOKEN, t);
  else sessionStorage.removeItem(STORAGE_TOKEN);
  return t;
}

export function modelsStorageKey(type) {
  return `${STORAGE_MODELS_PREFIX}${type}`;
}

export function getStoredModelsEnvelope(type) {
  const raw = sessionStorage.getItem(modelsStorageKey(type));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredModels(type, envelope) {
  sessionStorage.setItem(modelsStorageKey(type), JSON.stringify(envelope));
}

function pickCatalogValue(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item && typeof item === 'object') {
    const v =
      item.value ??
      item.ratio ??
      item.mode ??
      item.resolution ??
      item.duration ??
      item.id ??
      item.name;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function pickCatalogList(model, ...keys) {
  for (const key of keys) {
    const val = model?.[key];
    if (Array.isArray(val) && val.length) {
      return val.map(pickCatalogValue).filter(Boolean);
    }
  }
  return [];
}

/** Match server parseModelsList — data array, data.models, data.items */
export function parseModelsList(envelopeOrData) {
  if (Array.isArray(envelopeOrData)) return envelopeOrData;
  const root = envelopeOrData ?? {};
  const d = root?.envelope?.data ?? root?.data ?? root;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.models)) return d.models;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}

export function modelSlug(m) {
  return m?.model || m?.slug || m?.model_id || m?.id || m?.id_base || '';
}

export function normalizeModels(envelope) {
  const bySlug = new Map();
  for (const m of parseModelsList(envelope)) {
    const slug = modelSlug(m);
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, {
      slug,
      name: m.name || slug,
      description: m.description_en || m.description || '',
      descriptionVi: m.description || '',
      ratios: pickCatalogList(m, 'ratios', 'ratio'),
      modes: pickCatalogList(m, 'modes', 'mode'),
      resolutions: pickCatalogList(m, 'resolutions', 'resolution'),
      durations: pickCatalogList(m, 'durations', 'duration'),
      raw: m,
    });
  }
  return [...bySlug.values()];
}

export async function fetchModelsCatalog(base, token, type, lang = '') {
  const headers = { Accept: 'application/json' };
  const t = token?.trim();
  if (t) headers.Authorization = `Bearer ${t}`;

  const params = new URLSearchParams({ type });
  if (lang === 'en') params.set('lang', 'en');

  const res = await fetch(`${base}/gateway/models?${params}`, {
    headers,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON (${res.status})`);
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    throw new Error(`${res.status}: ${msg}`);
  }
  setStoredModels(type, data);
  return { data, models: normalizeModels(data) };
}

export function extractAccessToken(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.access_token === 'string') return payload.access_token;
  if (payload.data && typeof payload.data.access_token === 'string') return payload.data.access_token;
  return '';
}
