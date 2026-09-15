import { playgroundAppPath, type LocalePrefix } from './gateway-base';
import { pickMsg, resolveLabelLocale, type PortalLocale } from './portal-locale';

export const JOB_TYPES = [
  { id: 'image', label: 'Image', group: 'media' as const },
  { id: 'video', label: 'Video', group: 'media' as const },
  { id: 'music', label: 'Music', group: 'media' as const },
  { id: 'tts', label: 'TTS', group: 'media' as const },
  { id: 'avatar-lipsync', label: 'Avatar', group: 'media' as const },
  { id: 'image-upscale', label: 'Upscale image', group: 'tools' as const },
  { id: 'remove-bg', label: 'Remove BG', group: 'tools' as const },
  { id: 'video-upscale', label: 'Upscale video', group: 'tools' as const },
  { id: 'video-vfx', label: 'Video VFX', group: 'tools' as const },
  { id: 'video-subtitle', label: 'Subtitles', group: 'tools' as const },
  { id: 'video-cut', label: 'Video cut', group: 'tools' as const },
];

export type JobTypeId = (typeof JOB_TYPES)[number]['id'];
export type CatalogTabId = 'all' | JobTypeId | 'tools';

const TOOL_JOB_TYPES = JOB_TYPES.filter((t) => t.group === 'tools').map((t) => t.id);

/** Primary tabs — fewer items, OpenRouter-style (Tools grouped). */
export const CATALOG_TABS: Array<{
  id: CatalogTabId;
  label: string;
  icon: string;
  jobTypes?: JobTypeId[];
}> = [
  { id: 'all', label: 'All', icon: '◈' },
  { id: 'image', label: 'Image', icon: '▣' },
  { id: 'video', label: 'Video', icon: '▷' },
  { id: 'music', label: 'Music', icon: '♪' },
  { id: 'tts', label: 'TTS', icon: 'T' },
  { id: 'avatar-lipsync', label: 'Avatar', icon: '◎' },
  { id: 'tools', label: 'Tools', icon: '⚙', jobTypes: TOOL_JOB_TYPES },
];

export function tabJobTypes(tabId: CatalogTabId): JobTypeId[] | null {
  if (tabId === 'all') return null;
  if (tabId === 'tools') return TOOL_JOB_TYPES;
  return [tabId];
}

/** Sidebar input modalities (OpenRouter-style). */
export const INPUT_MODALITIES = [
  { id: 'image', label: 'Image', icon: '▣' },
  { id: 'video', label: 'Video', icon: '▷' },
  { id: 'audio', label: 'Audio', icon: '♪' },
  { id: 'text', label: 'Text', icon: 'T' },
] as const;

export type InputModalityId = (typeof INPUT_MODALITIES)[number]['id'];

export function modelInputModalities(m: CatalogModel): InputModalityId[] {
  const out = new Set<InputModalityId>();
  const configs = m.raw.configs as Record<string, unknown> | undefined;
  const ref = configs?.reference as Record<string, unknown> | undefined;
  const allowed = ref?.allowedTypes;
  if (Array.isArray(allowed)) {
    for (const t of allowed) {
      const id = String(t).toLowerCase();
      if (id === 'image' || id === 'video' || id === 'audio') out.add(id);
    }
  }
  if (['image', 'image-upscale', 'remove-bg'].includes(m.jobType)) out.add('image');
  if (m.jobType === 'video' || m.jobType.startsWith('video-')) out.add('video');
  if (m.jobType === 'music' || m.jobType === 'tts' || m.jobType === 'avatar-lipsync') out.add('audio');
  if (m.jobType === 'tts') out.add('text');
  return [...out];
}

export function catalogUniqueValues(
  models: CatalogModel[],
  field: 'ratios' | 'modes' | 'resolutions' | 'durations',
): string[] {
  const set = new Set<string>();
  for (const m of models) {
    for (const v of m[field]) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function catalogProviders(models: CatalogModel[]): string[] {
  const set = new Set<string>();
  for (const m of models) {
    if (m.provider) set.add(m.provider);
  }
  return [...set].sort();
}

export function catalogCreditRange(models: CatalogModel[]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const m of models) {
    if (m.credits == null) continue;
    min = Math.min(min, m.credits);
    max = Math.max(max, m.credits);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export function modelMatchesParamFilters(
  m: CatalogModel,
  filters: {
    ratios: string[];
    modes: string[];
    resolutions: string[];
    durations: string[];
  },
): boolean {
  if (filters.ratios.length && !filters.ratios.some((r) => m.ratios.includes(r))) return false;
  if (filters.modes.length && !filters.modes.some((x) => m.modes.includes(x))) return false;
  if (filters.resolutions.length && !filters.resolutions.some((x) => m.resolutions.includes(x))) {
    return false;
  }
  if (filters.durations.length && !filters.durations.some((x) => m.durations.includes(x))) {
    return false;
  }
  return true;
}

export function providerInitials(provider: string): string {
  const p = provider.trim();
  if (!p) return '?';
  const parts = p.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return p.slice(0, 2).toUpperCase();
}

export function formatRelativeTime(ts: number, localeOrVi: CatalogLang | boolean = false): string {
  if (!ts) return '';
  const locale =
    typeof localeOrVi === 'boolean' ? (localeOrVi ? 'vi' : 'en') : localeOrVi;
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) {
    if (locale === 'vi') return 'vừa xong';
    if (locale === 'th') return 'เมื่อกี้';
    return 'just now';
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    if (locale === 'vi') return `${min} phút trước`;
    if (locale === 'th') return `${min} นาทีที่แล้ว`;
    return `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 48) {
    if (locale === 'vi') return `${hr} giờ trước`;
    if (locale === 'th') return `${hr} ชม. ที่แล้ว`;
    return `${hr}h ago`;
  }
  const day = Math.floor(hr / 24);
  if (day < 30) {
    if (locale === 'vi') return `${day} ngày trước`;
    if (locale === 'th') return `${day} วันที่แล้ว`;
    return `${day}d ago`;
  }
  const mo = Math.floor(day / 30);
  if (locale === 'vi') return `${mo} tháng trước`;
  if (locale === 'th') return `${mo} เดือนที่แล้ว`;
  return `${mo}mo ago`;
}

export type SortKey =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'slug-asc'
  | 'credits-asc'
  | 'credits-desc';
export type ViewMode = 'list' | 'table';

export interface CatalogModel {
  slug: string;
  name: string;
  jobType: JobTypeId;
  group: 'media' | 'tools';
  ratios: string[];
  modes: string[];
  resolutions: string[];
  durations: string[];
  descriptionVi: string;
  descriptionEn: string;
  descriptionTh: string;
  provider: string;
  credits: number | null;
  creditsLabel: string;
  sortDate: number;
  raw: Record<string, unknown>;
}

export interface CatalogOption {
  value: string;
  label: string;
}

export type CatalogJobField = 'ratio' | 'mode' | 'resolution' | 'duration';

const CATALOG_FIELD_KEYS: Record<CatalogJobField, string[]> = {
  ratio: ['ratios', 'ratio'],
  mode: ['modes', 'mode'],
  resolution: ['resolutions', 'resolution'],
  duration: ['durations', 'duration'],
};

const TYPE_ORDER = new Map(JOB_TYPES.map((t, i) => [t.id, i]));

function uniqStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic: text with Vietnamese diacritics or common VI catalog phrases. */
export function looksVietnamese(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(t)) {
    return true;
  }
  return /\b(chuyên|cho|các|tác vụ|tạo|thế hệ|hỗ trợ|model là|bước tiến)\b/i.test(t);
}

function pickDescriptionFields(m: Record<string, unknown>): { vi: string; en: string; th: string } {
  const vi = String(m.description || m.desc || m.summary || m.intro || '').trim();
  const en = String(
    m.description_en ||
      m.desc_en ||
      m.summary_en ||
      m.intro_en ||
      m.descriptionEn ||
      m.descEn ||
      '',
  ).trim();
  const th = String(
    m.description_th || m.desc_th || m.summary_th || m.descriptionTh || m.descTh || '',
  ).trim();

  if (en || th) return { vi, en, th };

  const html = stripHtml(String(m.content_html || m.content_html_en || ''));
  if (html && !looksVietnamese(html)) return { vi, en: html, th: '' };

  return { vi, en: '', th: '' };
}

export function modelCatalogUnavailable(m: CatalogModel): boolean {
  const raw = m.raw;
  const err = String(raw.error ?? raw.status_error ?? '')
    .trim()
    .toUpperCase();
  if (err === 'NOT_AVAILABLE' || err === 'UNAVAILABLE' || err === 'DISABLED') return true;
  const msg = String(raw.message ?? raw.status_message ?? '').toLowerCase();
  return msg.includes('không khả dụng') || msg.includes('not available');
}

export function modelUnavailableSuffix(
  m: CatalogModel,
  localeOrVi: PortalLocale | boolean,
): string {
  if (!modelCatalogUnavailable(m)) return '';
  const locale = resolveLabelLocale(localeOrVi);
  return pickMsg(locale, ' · unavailable', ' · tạm ngưng', ' · ไม่พร้อมใช้');
}

/** Locale-aware catalog description (EN/TH from gateway cache). */
export function modelDescription(m: CatalogModel, lang: CatalogLang): string {
  if (lang === 'vi') return m.descriptionVi || m.descriptionEn || m.descriptionTh;
  if (lang === 'th') return m.descriptionTh || m.descriptionEn || '';
  return m.descriptionEn || m.descriptionVi || m.descriptionTh || '';
}

function mergeCatalogModels(a: CatalogModel, b: CatalogModel): CatalogModel {
  const aRank = TYPE_ORDER.get(a.jobType) ?? 999;
  const bRank = TYPE_ORDER.get(b.jobType) ?? 999;
  const primary = bRank < aRank ? b : a;
  const secondary = bRank < aRank ? a : b;

  return {
    ...primary,
    descriptionVi: primary.descriptionVi || secondary.descriptionVi,
    descriptionEn: primary.descriptionEn || secondary.descriptionEn,
    descriptionTh: primary.descriptionTh || secondary.descriptionTh,
    ratios: uniqStrings([...primary.ratios, ...secondary.ratios]),
    modes: uniqStrings([...primary.modes, ...secondary.modes]),
    resolutions: uniqStrings([...primary.resolutions, ...secondary.resolutions]),
    durations: uniqStrings([...primary.durations, ...secondary.durations]),
    sortDate: Math.max(primary.sortDate, secondary.sortDate),
    credits: primary.credits ?? secondary.credits,
    creditsLabel: primary.creditsLabel !== '—' ? primary.creditsLabel : secondary.creditsLabel,
    provider: primary.provider || secondary.provider,
  };
}

/** One row per slug — same model may appear in multiple job-type lists upstream. */
export function dedupeCatalogModels(models: CatalogModel[]): CatalogModel[] {
  const bySlug = new Map<string, CatalogModel>();
  for (const m of models) {
    const prev = bySlug.get(m.slug);
    bySlug.set(m.slug, prev ? mergeCatalogModels(prev, m) : m);
  }
  return [...bySlug.values()];
}

export function modelTags(m: CatalogModel, lang: CatalogLang = 'en'): string[] {
  const tags: string[] = [];
  tags.push(catalogJobTypeLabel(m.jobType, lang));
  if (m.group === 'tools') tags.push(pickMsg(lang, 'Tools', 'Tools', 'เครื่องมือ'));
  if (m.ratios.length) {
    const n = m.ratios.length;
    tags.push(pickMsg(lang, `${n} ratios`, `${n} ratios`, `${n} อัตราส่วน`));
  }
  if (m.modes.length) {
    const n = m.modes.length;
    tags.push(pickMsg(lang, `${n} modes`, `${n} modes`, `${n} โหมด`));
  }
  return tags.slice(0, 4);
}

function pickCatalogValue(item: unknown): string {
  const opt = pickCatalogOption(item);
  return opt?.value ?? '';
}

export function pickCatalogOption(item: unknown): CatalogOption | null {
  if (typeof item === 'string' || typeof item === 'number') {
    const v = String(item).trim();
    return v ? { value: v, label: v } : null;
  }
  if (item && typeof item === 'object') {
    const row = item as Record<string, unknown>;
    const value = String(
      row.value ??
        row.type ??
        row.ratio ??
        row.mode ??
        row.resolution ??
        row.duration ??
        row.id ??
        '',
    ).trim();
    if (value) {
      const label = String(row.name ?? row.label ?? row.title ?? value).trim() || value;
      return { value, label };
    }
    const name = String(row.name ?? row.label ?? row.title ?? '').trim();
    if (name) return { value: name, label: name };
  }
  return null;
}

function pickCatalogOptionList(model: Record<string, unknown>, ...keys: string[]): CatalogOption[] {
  for (const key of keys) {
    const val = model[key];
    if (Array.isArray(val) && val.length) {
      const options = val.map(pickCatalogOption).filter((o): o is CatalogOption => Boolean(o));
      if (options.length) return options;
    }
  }
  return [];
}

export function catalogOptionsForField(model: CatalogModel, field: CatalogJobField): CatalogOption[] {
  const keys = CATALOG_FIELD_KEYS[field];
  const fromRaw = pickCatalogOptionList(model.raw, ...keys);
  if (fromRaw.length) return fromRaw;
  const fallback =
    field === 'ratio'
      ? model.ratios
      : field === 'mode'
        ? model.modes
        : field === 'resolution'
          ? model.resolutions
          : model.durations;
  return fallback.map((value) => ({ value, label: value }));
}

export function catalogValuesForField(model: CatalogModel, field: CatalogJobField): string[] {
  return catalogOptionsForField(model, field).map((o) => o.value);
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

function modelSlug(m: Record<string, unknown>): string {
  return String(m.model || m.slug || m.model_id || m.id || m.id_base || '').trim();
}

export function parseModelsList(envelopeOrData: unknown): Record<string, unknown>[] {
  if (Array.isArray(envelopeOrData)) return envelopeOrData as Record<string, unknown>[];
  const root = (envelopeOrData ?? {}) as Record<string, unknown>;
  const d = (root.envelope as Record<string, unknown> | undefined)?.data ?? root.data ?? root;
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === 'object' && Array.isArray((d as { models?: unknown[] }).models)) {
    return (d as { models: Record<string, unknown>[] }).models;
  }
  if (d && typeof d === 'object' && Array.isArray((d as { items?: unknown[] }).items)) {
    return (d as { items: Record<string, unknown>[] }).items;
  }
  return [];
}

function pickModesFromPrices(raw: Record<string, unknown>): string[] {
  const prices = raw.prices;
  if (!Array.isArray(prices)) return [];
  return uniqStrings(
    prices
      .map((p) => {
        if (!p || typeof p !== 'object') return '';
        return String((p as Record<string, unknown>).mode || '').trim();
      })
      .filter(Boolean),
  );
}

function parseCredits(raw: Record<string, unknown>): { credits: number | null; label: string } {
  const candidates = [
    raw.credit,
    raw.credits,
    raw.price,
    raw.cost,
    raw.min_credit,
    raw.max_credit,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && !Number.isNaN(c)) {
      return { credits: c, label: `${c.toLocaleString()} credits` };
    }
    if (typeof c === 'string' && c.trim()) {
      const n = Number(c.replace(/[^\d.]/g, ''));
      if (!Number.isNaN(n)) return { credits: n, label: c };
      return { credits: null, label: c };
    }
  }
  if (raw.ratio && Array.isArray(raw.ratio)) {
    const first = raw.ratio[0] as Record<string, unknown> | undefined;
    if (first?.credit != null) {
      const label = String(first.credit);
      const n = Number(label.replace(/[^\d.]/g, ''));
      return { credits: Number.isNaN(n) ? null : n, label: `${label} credits` };
    }
  }
  if (raw.prices && Array.isArray(raw.prices)) {
    const nums = raw.prices
      .map((p) => {
        if (!p || typeof p !== 'object') return NaN;
        return Number((p as Record<string, unknown>).price);
      })
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (nums.length) {
      const min = Math.min(...nums);
      return { credits: min, label: `${min.toLocaleString()} credits` };
    }
  }
  return { credits: null, label: '—' };
}

function normalizeTimestamp(v: number): number {
  if (v > 0 && v < 1e12) return v * 1000;
  return v;
}

function parseDate(raw: Record<string, unknown>): number {
  for (const key of [
    'created_time',
    'updated_time',
    'updated_at',
    'created_at',
    'release_date',
    'date',
  ]) {
    const v = raw[key];
    if (typeof v === 'number' && v > 0) return normalizeTimestamp(v);
    if (typeof v === 'string') {
      const n = Number(v);
      if (!Number.isNaN(n) && n > 0) return normalizeTimestamp(n);
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

export function normalizeCatalogModel(
  m: Record<string, unknown>,
  jobType: JobTypeId,
  group: 'media' | 'tools',
): CatalogModel | null {
  const slug = modelSlug(m);
  if (!slug) return null;
  const { credits, label } = parseCredits(m);
  const { vi, en, th } = pickDescriptionFields(m);
  const modes = uniqStrings([
    ...pickCatalogOptionList(m, 'modes', 'mode').map((o) => o.value),
    ...pickModesFromPrices(m),
  ]);
  return {
    slug,
    name: String(m.name || slug),
    jobType,
    group,
    ratios: pickCatalogOptionList(m, 'ratios', 'ratio').map((o) => o.value),
    modes,
    resolutions: pickCatalogOptionList(m, 'resolutions', 'resolution').map((o) => o.value),
    durations: pickCatalogOptionList(m, 'durations', 'duration').map((o) => o.value),
    descriptionVi: vi,
    descriptionEn: en,
    descriptionTh: th,
    provider: String(m.provider || m.server || m.vendor || m.brand || '').trim(),
    credits,
    creditsLabel: label,
    sortDate: parseDate(m),
    raw: m,
  };
}

/** Dev: VitePress proxy `/gateway` (GATEWAY_PROXY_TARGET). Prod: VITE_GATEWAY_URL at build. */
export function gatewayBaseUrl(): string {
  const env = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'https://api.yourdomain.com';
}

export type CatalogLang = 'en' | 'vi' | 'th';

export async function fetchModelsForType(
  jobType: JobTypeId,
  lang?: CatalogLang,
): Promise<CatalogModel[]> {
  const meta = JOB_TYPES.find((t) => t.id === jobType);
  if (!meta) return [];

  const base = gatewayBaseUrl();
  const params = new URLSearchParams({ type: jobType });
  if (lang === 'en' || lang === 'th') params.set('lang', lang);
  const res = await fetch(`${base}/gateway/models?${params}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `HTTP ${res.status}`);
  }
  return dedupeCatalogModels(
    parseModelsList(data)
      .map((m) => normalizeCatalogModel(m, jobType, meta.group))
      .filter(Boolean) as CatalogModel[],
  );
}

export async function fetchAllModels(lang?: CatalogLang): Promise<CatalogModel[]> {
  const batches = await Promise.allSettled(JOB_TYPES.map((t) => fetchModelsForType(t.id, lang)));
  const out: CatalogModel[] = [];
  for (const b of batches) {
    if (b.status === 'fulfilled') out.push(...b.value);
  }
  return dedupeCatalogModels(out);
}

export function sortModels(models: CatalogModel[], sort: SortKey): CatalogModel[] {
  const list = [...models];
  switch (sort) {
    case 'newest':
      return list.sort((a, b) => b.sortDate - a.sortDate || a.name.localeCompare(b.name));
    case 'oldest':
      return list.sort((a, b) => a.sortDate - b.sortDate || a.name.localeCompare(b.name));
    case 'name-desc':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'slug-asc':
      return list.sort((a, b) => a.slug.localeCompare(b.slug));
    case 'credits-asc':
      return list.sort((a, b) => (a.credits ?? Infinity) - (b.credits ?? Infinity));
    case 'credits-desc':
      return list.sort((a, b) => (b.credits ?? -1) - (a.credits ?? -1));
    case 'name-asc':
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function playgroundUrl(model?: CatalogModel, localePrefix: LocalePrefix = ''): string {
  return playgroundAppPath(
    localePrefix,
    model ? { slug: model.slug, jobType: model.jobType } : undefined,
  );
}

export function findCatalogModel(models: CatalogModel[], slug: string): CatalogModel | undefined {
  const key = slug.trim();
  if (!key) return undefined;
  return models.find((m) => m.slug === key);
}

export function formatFieldList(values: string[]): string {
  if (!values.length) return '—';
  return values.join(', ');
}

export function monthGroupLabel(ts: number, localeOrVi: CatalogLang | boolean = false): string {
  const locale =
    typeof localeOrVi === 'boolean' ? (localeOrVi ? 'vi' : 'en') : localeOrVi;
  if (!ts) {
    if (locale === 'vi') return 'Khác';
    if (locale === 'th') return 'อื่นๆ';
    return 'Other';
  }
  const tag = locale === 'vi' ? 'vi-VN' : locale === 'th' ? 'th-TH' : 'en-US';
  return new Date(ts).toLocaleDateString(tag, { month: 'long', year: 'numeric' });
}

const CATALOG_JOB_TYPE_LABELS: Record<string, [string, string, string]> = {
  image: ['Image', 'Image', 'รูป'],
  video: ['Video', 'Video', 'วิดีโอ'],
  music: ['Music', 'Music', 'เพลง'],
  tts: ['TTS', 'TTS', 'TTS'],
  'avatar-lipsync': ['Avatar', 'Avatar', 'อวาตาร์'],
  'image-upscale': ['Upscale image', 'Upscale image', 'Upscale รูป'],
  'remove-bg': ['Remove BG', 'Remove BG', 'ลบพื้นหลัง'],
  'video-upscale': ['Upscale video', 'Upscale video', 'Upscale วิดีโอ'],
  'video-vfx': ['Video VFX', 'Video VFX', 'เอฟเฟกต์วิดีโอ'],
  'video-subtitle': ['Subtitles', 'Subtitles', 'คำบรรยาย'],
  'video-cut': ['Video cut', 'Video cut', 'ตัดวิดีโอ'],
};

const INPUT_MODALITY_LABELS: Record<string, [string, string, string]> = {
  image: ['Image', 'Image', 'ภาพ'],
  video: ['Video', 'Video', 'วิดีโอ'],
  audio: ['Audio', 'Audio', 'เสียง'],
  text: ['Text', 'Text', 'ข้อความ'],
};

export function catalogJobTypeLabel(id: JobTypeId | string, lang: CatalogLang): string {
  const triple = CATALOG_JOB_TYPE_LABELS[id];
  if (!triple) return id;
  return pickMsg(lang, triple[0], triple[1], triple[2]);
}

export function inputModalityLabel(id: string, lang: CatalogLang): string {
  const triple = INPUT_MODALITY_LABELS[id];
  if (!triple) return id;
  return pickMsg(lang, triple[0], triple[1], triple[2]);
}

export interface ComparePreset {
  id: string;
  titleEn: string;
  titleVi: string;
  titleTh: string;
  descEn: string;
  descVi: string;
  descTh: string;
  jobType?: JobTypeId;
  group?: 'media' | 'tools';
  sort: SortKey;
}

export const COMPARE_PRESETS: ComparePreset[] = [
  {
    id: 'cheap-image',
    titleEn: 'Cheapest image',
    titleVi: 'Image rẻ nhất',
    titleTh: 'ภาพราคาถูกที่สุด',
    descEn: 'Lowest credit picks for high-volume image jobs.',
    descVi: 'Model image tiêu tốn ít credits.',
    descTh: 'โมเดลภาพที่ใช้เครดิตน้อยสำหรับงานปริมาณมาก',
    jobType: 'image',
    sort: 'credits-asc',
  },
  {
    id: 'video-new',
    titleEn: 'Newest video',
    titleVi: 'Video mới nhất',
    titleTh: 'วิดีโอใหม่ล่าสุด',
    descEn: 'Recently added video models from the catalog.',
    descVi: 'Model video mới trên catalog.',
    descTh: 'โมเดลวิดีโอที่เพิ่มล่าสุดจากแคตตาล็อก',
    jobType: 'video',
    sort: 'newest',
  },
  {
    id: 'tts-value',
    titleEn: 'TTS value',
    titleVi: 'TTS tiết kiệm',
    titleTh: 'TTS คุ้มค่า',
    descEn: 'Compact text-to-speech models sorted by credits.',
    descVi: 'Model TTS sắp theo credits.',
    descTh: 'โมเดล TTS เรียงตามเครดิต',
    jobType: 'tts',
    sort: 'credits-asc',
  },
  {
    id: 'tools',
    titleEn: 'Tools',
    titleVi: 'Tools',
    titleTh: 'เครื่องมือ',
    descEn: 'Upscale, remove background, subtitles, and other tools.',
    descVi: 'Upscale, xóa nền, phụ đề và tool khác.',
    descTh: 'Upscale ลบพื้นหลัง ซับไตเติล และเครื่องมืออื่น',
    group: 'tools',
    sort: 'name-asc',
  },
];

export interface CompareRow {
  key: string;
  labelEn: string;
  labelVi: string;
  labelTh: string;
  valueA: string;
  valueB: string;
  diff?: boolean;
}

export function buildCompareRows(a: CatalogModel, b: CatalogModel, lang: CatalogLang): CompareRow[] {
  const desc = (m: CatalogModel) => modelDescription(m, lang) || '—';
  const mods = (m: CatalogModel) =>
    modelInputModalities(m)
      .map((id) => inputModalityLabel(id, lang))
      .join(', ') || '—';
  const typeLabel = (m: CatalogModel) => catalogJobTypeLabel(m.jobType, lang);

  const rows: Array<Omit<CompareRow, 'diff'> & { rawA?: string; rawB?: string }> = [
    {
      key: 'credits',
      labelEn: 'Credits',
      labelVi: 'Credits',
      labelTh: 'เครดิต',
      valueA: a.creditsLabel,
      valueB: b.creditsLabel,
      rawA: String(a.credits ?? ''),
      rawB: String(b.credits ?? ''),
    },
    {
      key: 'type',
      labelEn: 'Job type',
      labelVi: 'Loại job',
      labelTh: 'ประเภทงาน',
      valueA: typeLabel(a),
      valueB: typeLabel(b),
      rawA: a.jobType,
      rawB: b.jobType,
    },
    {
      key: 'provider',
      labelEn: 'Provider',
      labelVi: 'Provider',
      labelTh: 'ผู้ให้บริการ',
      valueA: a.provider || '—',
      valueB: b.provider || '—',
      rawA: a.provider,
      rawB: b.provider,
    },
    {
      key: 'description',
      labelEn: 'Description',
      labelVi: 'Mô tả',
      labelTh: 'คำอธิบาย',
      valueA: desc(a),
      valueB: desc(b),
    },
    {
      key: 'ratios',
      labelEn: 'Ratios',
      labelVi: 'Ratios',
      labelTh: 'อัตราส่วน',
      valueA: formatFieldList(a.ratios),
      valueB: formatFieldList(b.ratios),
      rawA: a.ratios.join('|'),
      rawB: b.ratios.join('|'),
    },
    {
      key: 'modes',
      labelEn: 'Modes',
      labelVi: 'Modes',
      labelTh: 'โหมด',
      valueA: formatFieldList(a.modes),
      valueB: formatFieldList(b.modes),
      rawA: a.modes.join('|'),
      rawB: b.modes.join('|'),
    },
    {
      key: 'resolutions',
      labelEn: 'Resolutions',
      labelVi: 'Resolutions',
      labelTh: 'ความละเอียด',
      valueA: formatFieldList(a.resolutions),
      valueB: formatFieldList(b.resolutions),
      rawA: a.resolutions.join('|'),
      rawB: b.resolutions.join('|'),
    },
    {
      key: 'durations',
      labelEn: 'Durations',
      labelVi: 'Durations',
      labelTh: 'ความยาว',
      valueA: formatFieldList(a.durations),
      valueB: formatFieldList(b.durations),
      rawA: a.durations.join('|'),
      rawB: b.durations.join('|'),
    },
    {
      key: 'modalities',
      labelEn: 'Input',
      labelVi: 'Input',
      labelTh: 'อินพุต',
      valueA: mods(a),
      valueB: mods(b),
      rawA: mods(a),
      rawB: mods(b),
    },
    {
      key: 'added',
      labelEn: 'Added',
      labelVi: 'Thêm',
      labelTh: 'เพิ่มเมื่อ',
      valueA: formatRelativeTime(a.sortDate, lang) || '—',
      valueB: formatRelativeTime(b.sortDate, lang) || '—',
    },
    {
      key: 'slug',
      labelEn: 'Slug',
      labelVi: 'Slug',
      labelTh: 'Slug',
      valueA: a.slug,
      valueB: b.slug,
      rawA: a.slug,
      rawB: b.slug,
    },
  ];

  return rows.map(({ rawA, rawB, ...row }) => ({
    ...row,
    diff: rawA !== undefined && rawB !== undefined && rawA !== rawB,
  }));
}

export function applyComparePreset(models: CatalogModel[], preset: ComparePreset): CatalogModel[] {
  let out = [...models];
  if (preset.jobType) out = out.filter((m) => m.jobType === preset.jobType);
  if (preset.group) out = out.filter((m) => m.group === preset.group);
  return sortModels(out, preset.sort);
}

export function presetPreviewModels(
  models: CatalogModel[],
  preset: ComparePreset,
  limit = 3,
): CatalogModel[] {
  return applyComparePreset(models, preset).slice(0, limit);
}

export function presetExampleNames(
  models: CatalogModel[],
  preset: ComparePreset,
  limit = 3,
): string {
  return presetPreviewModels(models, preset, limit)
    .map((m) => m.name)
    .join(' · ');
}
