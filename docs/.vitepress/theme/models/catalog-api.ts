import { playgroundAppPath, type LocalePrefix } from './gateway-base';

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

export function formatRelativeTime(ts: number, isVi = false): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return isVi ? 'vừa xong' : 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return isVi ? `${min} phút trước` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return isVi ? `${hr} giờ trước` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return isVi ? `${day} ngày trước` : `${day}d ago`;
  const mo = Math.floor(day / 30);
  return isVi ? `${mo} tháng trước` : `${mo}mo ago`;
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

function pickDescriptionFields(m: Record<string, unknown>): { vi: string; en: string } {
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

  if (en) return { vi, en };

  const html = stripHtml(String(m.content_html || m.content_html_en || ''));
  if (html && !looksVietnamese(html)) return { vi, en: html };

  return { vi, en: '' };
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

export function modelUnavailableSuffix(m: CatalogModel, isVi: boolean): string {
  if (!modelCatalogUnavailable(m)) return '';
  return isVi ? ' · tạm ngưng' : ' · unavailable';
}

/** Locale-aware catalog description (EN from gateway cache / translate). */
export function modelDescription(m: CatalogModel, isVi: boolean): string {
  if (isVi) return m.descriptionVi || m.descriptionEn;
  return m.descriptionEn || m.descriptionVi || '';
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

export function modelTags(m: CatalogModel): string[] {
  const tags: string[] = [];
  const typeMeta = JOB_TYPES.find((t) => t.id === m.jobType);
  if (typeMeta) tags.push(typeMeta.label);
  if (m.group === 'tools') tags.push('Tools');
  if (m.ratios.length) tags.push(`${m.ratios.length} ratios`);
  if (m.modes.length) tags.push(`${m.modes.length} modes`);
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
  const { vi, en } = pickDescriptionFields(m);
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
    provider: String(m.provider || m.server || m.vendor || m.brand || '').trim(),
    credits,
    creditsLabel: label,
    sortDate: parseDate(m),
    raw: m,
  };
}

/** Dev: VitePress proxy `/gateway` → :3001. Prod: set VITE_GATEWAY_URL at build. */
export function gatewayBaseUrl(): string {
  const env = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'https://api.yourdomain.com';
}

export type CatalogLang = 'en' | 'vi';

export async function fetchModelsForType(
  jobType: JobTypeId,
  lang?: CatalogLang,
): Promise<CatalogModel[]> {
  const meta = JOB_TYPES.find((t) => t.id === jobType);
  if (!meta) return [];

  const base = gatewayBaseUrl();
  const params = new URLSearchParams({ type: jobType });
  if (lang === 'en') params.set('lang', 'en');
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

export function monthGroupLabel(ts: number, isVi = false): string {
  if (!ts) return isVi ? 'Khác' : 'Other';
  return new Date(ts).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export interface ComparePreset {
  id: string;
  titleEn: string;
  titleVi: string;
  descEn: string;
  descVi: string;
  jobType?: JobTypeId;
  group?: 'media' | 'tools';
  sort: SortKey;
}

export const COMPARE_PRESETS: ComparePreset[] = [
  {
    id: 'cheap-image',
    titleEn: 'Cheapest image',
    titleVi: 'Image rẻ nhất',
    descEn: 'Lowest credit picks for high-volume image jobs.',
    descVi: 'Model image tiêu tốn ít credits.',
    jobType: 'image',
    sort: 'credits-asc',
  },
  {
    id: 'video-new',
    titleEn: 'Newest video',
    titleVi: 'Video mới nhất',
    descEn: 'Recently added video models from the catalog.',
    descVi: 'Model video mới trên catalog.',
    jobType: 'video',
    sort: 'newest',
  },
  {
    id: 'tts-value',
    titleEn: 'TTS value',
    titleVi: 'TTS tiết kiệm',
    descEn: 'Compact text-to-speech models sorted by credits.',
    descVi: 'Model TTS sắp theo credits.',
    jobType: 'tts',
    sort: 'credits-asc',
  },
  {
    id: 'tools',
    titleEn: 'Tools',
    titleVi: 'Tools',
    descEn: 'Upscale, remove background, subtitles, and other tools.',
    descVi: 'Upscale, xóa nền, phụ đề và tool khác.',
    group: 'tools',
    sort: 'name-asc',
  },
];

export interface CompareRow {
  key: string;
  labelEn: string;
  labelVi: string;
  valueA: string;
  valueB: string;
  diff?: boolean;
}

export function buildCompareRows(a: CatalogModel, b: CatalogModel, isVi: boolean): CompareRow[] {
  const L = (en: string, vi: string) => (isVi ? vi : en);
  const desc = (m: CatalogModel) => modelDescription(m, isVi) || '—';
  const mods = (m: CatalogModel) =>
    modelInputModalities(m)
      .map((id) => INPUT_MODALITIES.find((x) => x.id === id)?.label ?? id)
      .join(', ') || '—';
  const typeLabel = (m: CatalogModel) =>
    JOB_TYPES.find((t) => t.id === m.jobType)?.label ?? m.jobType;

  const rows: Array<Omit<CompareRow, 'diff'> & { rawA?: string; rawB?: string }> = [
    {
      key: 'credits',
      labelEn: 'Credits',
      labelVi: 'Credits',
      valueA: a.creditsLabel,
      valueB: b.creditsLabel,
      rawA: String(a.credits ?? ''),
      rawB: String(b.credits ?? ''),
    },
    {
      key: 'type',
      labelEn: 'Job type',
      labelVi: 'Loại job',
      valueA: typeLabel(a),
      valueB: typeLabel(b),
      rawA: a.jobType,
      rawB: b.jobType,
    },
    {
      key: 'provider',
      labelEn: 'Provider',
      labelVi: 'Provider',
      valueA: a.provider || '—',
      valueB: b.provider || '—',
      rawA: a.provider,
      rawB: b.provider,
    },
    {
      key: 'description',
      labelEn: 'Description',
      labelVi: 'Mô tả',
      valueA: desc(a),
      valueB: desc(b),
    },
    {
      key: 'ratios',
      labelEn: 'Ratios',
      labelVi: 'Ratios',
      valueA: formatFieldList(a.ratios),
      valueB: formatFieldList(b.ratios),
      rawA: a.ratios.join('|'),
      rawB: b.ratios.join('|'),
    },
    {
      key: 'modes',
      labelEn: 'Modes',
      labelVi: 'Modes',
      valueA: formatFieldList(a.modes),
      valueB: formatFieldList(b.modes),
      rawA: a.modes.join('|'),
      rawB: b.modes.join('|'),
    },
    {
      key: 'resolutions',
      labelEn: 'Resolutions',
      labelVi: 'Resolutions',
      valueA: formatFieldList(a.resolutions),
      valueB: formatFieldList(b.resolutions),
      rawA: a.resolutions.join('|'),
      rawB: b.resolutions.join('|'),
    },
    {
      key: 'durations',
      labelEn: 'Durations',
      labelVi: 'Durations',
      valueA: formatFieldList(a.durations),
      valueB: formatFieldList(b.durations),
      rawA: a.durations.join('|'),
      rawB: b.durations.join('|'),
    },
    {
      key: 'modalities',
      labelEn: 'Input',
      labelVi: 'Input',
      valueA: mods(a),
      valueB: mods(b),
      rawA: mods(a),
      rawB: mods(b),
    },
    {
      key: 'added',
      labelEn: 'Added',
      labelVi: 'Thêm',
      valueA: formatRelativeTime(a.sortDate, isVi) || '—',
      valueB: formatRelativeTime(b.sortDate, isVi) || '—',
    },
    {
      key: 'slug',
      labelEn: 'Slug',
      labelVi: 'Slug',
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
