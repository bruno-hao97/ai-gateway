export type UsageStatsPeriod = '7d' | '30d' | '90d';
export type UsageStatsType = 'all' | 'image' | 'video' | 'audio' | 'music';

export interface UsageTypeSummary {
  total: number;
  success: number;
  error: number;
  credit: number;
  credit_success: number;
  credit_error: number;
  refund: number;
  credit_net: number;
}

export interface UsageStatsChart {
  granularity: string;
  labels: string[];
  image: number[];
  video: number[];
  audio: number[];
  music: number[];
  credit: number[];
  refund: number[];
  success: number[];
  error: number[];
}

export interface UsageStatsTableRow {
  period: string;
  label: string;
  image: number;
  video: number;
  audio: number;
  music: number;
  total: number;
  success: number;
  error: number;
  credit: number;
  refund: number;
  credit_net: number;
}

export interface UsageStatsData {
  period: string;
  period_from: number;
  period_to: number;
  type: string;
  project_id: string;
  summary: UsageTypeSummary & { by_type: Record<string, UsageTypeSummary> };
  chart: UsageStatsChart;
  table: UsageStatsTableRow[];
}

export interface UsageChartPoint {
  label: string;
  count: number;
  credit: number;
}

export interface UsageChartSeriesPoint {
  label: string;
  image: number;
  video: number;
  audio: number;
  music: number;
  total: number;
  credit: number;
}

export interface UsageListItem {
  id_base?: string;
  type?: string;
  model?: string;
  status?: string;
  credit?: number;
  credit_fee?: number;
  prompt?: string;
  created_at?: string | number;
  created_time?: string | number;
}

export interface UsageListData {
  items: UsageListItem[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
  period?: string;
  type?: string;
}

export type UsageLogsData = UsageListData;

const TYPE_KEYS: UsageStatsType[] = ['image', 'video', 'audio', 'music'];

export function periodFromRange(range: 'all' | UsageStatsPeriod): UsageStatsPeriod {
  if (range === '7d' || range === '30d' || range === '90d') return range;
  return '90d';
}

export function typeBreakdownFromSummary(
  byType: Record<string, UsageTypeSummary>,
): { jobType: UsageStatsType; count: number; percent: number; creditNet: number }[] {
  const total = TYPE_KEYS.reduce((sum, key) => sum + (byType[key]?.total || 0), 0) || 1;
  return TYPE_KEYS.map((jobType) => {
    const row = byType[jobType];
    const count = row?.total || 0;
    return {
      jobType,
      count,
      percent: Math.round((count / total) * 100),
      creditNet: row?.credit_net || 0,
    };
  }).filter((row) => row.count > 0);
}

export function chartPointsFromStats(
  chart: UsageStatsChart | undefined,
  days: number,
  type: UsageStatsType,
): UsageChartPoint[] {
  if (!chart?.labels?.length) return [];

  const len = chart.labels.length;
  const start = Math.max(0, len - days);
  const out: UsageChartPoint[] = [];

  for (let i = start; i < len; i++) {
    let count = 0;
    if (type === 'all') {
      count =
        (chart.image[i] || 0) +
        (chart.video[i] || 0) +
        (chart.audio[i] || 0) +
        (chart.music[i] || 0);
    } else if (type === 'image') count = chart.image[i] || 0;
    else if (type === 'video') count = chart.video[i] || 0;
    else if (type === 'audio') count = chart.audio[i] || 0;
    else if (type === 'music') count = chart.music[i] || 0;

    out.push({
      label: chart.labels[i] || '',
      count,
      credit: chart.credit[i] || 0,
    });
  }

  return out;
}

export interface TopModelRow {
  model: string;
  count: number;
  credit: number;
  percent: number;
}

export interface UsageModelAggregateData {
  period: UsageStatsPeriod;
  type: UsageStatsType;
  group_by: 'model';
  scanned_jobs: number;
  pages_scanned: number;
  truncated: boolean;
  items: TopModelRow[];
  from_cache?: boolean;
}

export function chartDaysForPeriod(period: UsageStatsPeriod): number {
  if (period === '7d') return 7;
  if (period === '30d') return 14;
  return 30;
}

export function sparklineValuesFromChart(
  chart: UsageStatsChart | undefined,
  days: number,
  metric: 'jobs' | 'credits' | 'success',
): number[] {
  if (!chart?.labels?.length) return [];

  const len = chart.labels.length;
  const start = Math.max(0, len - days);
  const out: number[] = [];

  for (let i = start; i < len; i++) {
    if (metric === 'credits') {
      out.push(chart.credit[i] || 0);
      continue;
    }
    if (metric === 'success') {
      out.push(chart.success[i] || 0);
      continue;
    }
    out.push(
      (chart.image[i] || 0) +
        (chart.video[i] || 0) +
        (chart.audio[i] || 0) +
        (chart.music[i] || 0),
    );
  }

  return out;
}

export function sparklineSvgPath(values: number[], width = 72, height = 28): string {
  if (values.length === 0) return '';
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = Math.round(i * step * 10) / 10;
    const y = Math.round((height - (v / max) * (height - 4) - 2) * 10) / 10;
    return `${x},${y}`;
  });
  return `M ${pts.join(' L ')}`;
}

export interface OutcomeChartPoint {
  label: string;
  success: number;
  error: number;
  total: number;
}

export function outcomeSeriesFromChart(
  chart: UsageStatsChart | undefined,
  days: number,
): OutcomeChartPoint[] {
  if (!chart?.labels?.length) return [];

  const len = chart.labels.length;
  const start = Math.max(0, len - days);
  const out: OutcomeChartPoint[] = [];

  for (let i = start; i < len; i++) {
    const success = chart.success[i] || 0;
    const error = chart.error[i] || 0;
    out.push({
      label: chart.labels[i] || '',
      success,
      error,
      total: success + error,
    });
  }

  return out;
}

export function areaSvgPaths(
  values: number[],
  width = 280,
  height = 72,
): { line: string; area: string } {
  if (values.length === 0) return { line: '', area: '' };

  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({
    x: Math.round(i * step * 10) / 10,
    y: Math.round((height - (v / max) * (height - 10) - 5) * 10) / 10,
  }));

  const line = `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  return { line, area };
}

export function rangeToStatsPeriod(range: '7d' | '30d' | '90d' | 'all'): UsageStatsPeriod {
  if (range === '7d' || range === '30d' || range === '90d') return range;
  return '90d';
}

export function topModelsFromLogs(items: UsageListItem[], limit = 5): TopModelRow[] {
  const map = new Map<string, { count: number; credit: number }>();
  for (const item of items) {
    const model = (item.model || '').trim() || '—';
    const row = map.get(model) || { count: 0, credit: 0 };
    row.count += 1;
    row.credit += listItemCredit(item);
    map.set(model, row);
  }
  const total = [...map.values()].reduce((sum, row) => sum + row.count, 0) || 1;
  return [...map.entries()]
    .map(([model, row]) => ({
      model,
      count: row.count,
      credit: row.credit,
      percent: Math.round((row.count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function chartSeriesFromStats(
  chart: UsageStatsChart | undefined,
  days: number,
): UsageChartSeriesPoint[] {
  if (!chart?.labels?.length) return [];

  const len = chart.labels.length;
  const start = Math.max(0, len - days);
  const out: UsageChartSeriesPoint[] = [];

  for (let i = start; i < len; i++) {
    const image = chart.image[i] || 0;
    const video = chart.video[i] || 0;
    const audio = chart.audio[i] || 0;
    const music = chart.music[i] || 0;
    out.push({
      label: chart.labels[i] || '',
      image,
      video,
      audio,
      music,
      total: image + video + audio + music,
      credit: chart.credit[i] || 0,
    });
  }

  return out;
}

export function listItemCredit(item: UsageListItem): number {
  const n = Number(item.credit ?? item.credit_fee ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function listItemCreatedAt(item: UsageListItem): string {
  const raw = item.created_at ?? item.created_time;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return new Date(ms).toISOString();
  }
  const d = Date.parse(String(raw));
  return Number.isFinite(d) ? new Date(d).toISOString() : String(raw);
}

export function listItemStatus(item: UsageListItem): 'success' | 'failed' | 'pending' {
  const s = String(item.status || '').toLowerCase();
  if (/fail|error|cancel/.test(s)) return 'failed';
  if (/success|done|complete|ok/.test(s)) return 'success';
  if (/pending|process|queue|wait/.test(s)) return 'pending';
  return 'success';
}

const USAGE_JOB_TYPE_ALIASES: Record<string, UsageStatsType> = {
  image: 'image',
  img: 'image',
  picture: 'image',
  video: 'video',
  vid: 'video',
  t2v: 'video',
  i2v: 'video',
  audio: 'audio',
  speech: 'audio',
  tts: 'audio',
  music: 'music',
  song: 'music',
};

/** Normalize Gommo job type for filters and chips. */
export function normalizeUsageJobType(
  raw: string | undefined,
  model?: string,
): UsageStatsType | undefined {
  const token = String(raw || '').trim().toLowerCase();
  if (token && USAGE_JOB_TYPE_ALIASES[token]) return USAGE_JOB_TYPE_ALIASES[token];
  if (token === 'image' || token === 'video' || token === 'audio' || token === 'music') {
    return token;
  }

  const modelHint = String(model || '').toLowerCase();
  if (modelHint) {
    if (/veo|t2v|i2v|video|sora|kling|runway|wan_/.test(modelHint)) return 'video';
    if (/imagen|midjourney|flux|dall|imagegen|stable|gpt_image/.test(modelHint)) return 'image';
    if (/tts|audio|speech|eleven|suno_tts/.test(modelHint)) return 'audio';
    if (/music|suno|udio/.test(modelHint)) return 'music';
  }

  return undefined;
}

export function filterListItems(
  items: UsageListItem[],
  opts: { type: UsageStatsType | 'all'; query: string },
): UsageListItem[] {
  const q = opts.query.trim().toLowerCase();
  return items.filter((item) => {
    if (opts.type !== 'all') {
      const itemType = normalizeUsageJobType(item.type, item.model);
      if (itemType !== opts.type) return false;
    }
    if (!q) return true;
    const hay = `${item.model || ''} ${item.prompt || ''} ${item.type || ''} ${item.status || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

type UsageListItemRaw = UsageListItem & {
  id?: string;
  job_id?: string;
  task_id?: string;
};

/** Stable job key for deep links — Gommo may use id_base, id, or job_id. */
export function usageJobId(item: UsageListItem | null | undefined): string {
  if (!item) return '';
  const raw = item as UsageListItemRaw;
  return String(raw.id_base || raw.id || raw.job_id || raw.task_id || '').trim();
}

export function normalizeUsageListItem(item: UsageListItem): UsageListItem {
  const id = usageJobId(item);
  const type = normalizeUsageJobType(item.type, item.model);
  return {
    ...item,
    ...(id ? { id_base: id } : {}),
    ...(type ? { type } : {}),
  };
}

export function matchesUsageJobId(item: UsageListItem, jobId: string): boolean {
  const id = jobId.trim();
  if (!id) return false;
  return usageJobId(item) === id;
}

export function downloadTextFile(content: string, filename: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportListCsv(items: UsageListItem[]): string {
  const header = ['created_at', 'type', 'model', 'prompt', 'status', 'credit', 'id_base'];
  const rows = items.map((item) =>
    [
      listItemCreatedAt(item),
      item.type || '',
      item.model || '',
      `"${String(item.prompt || '').replace(/"/g, '""')}"`,
      item.status || '',
      listItemCredit(item) || '',
      usageJobId(item),
    ].join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export function filterStatsTable(
  table: UsageStatsTableRow[],
  opts: { type: UsageStatsType; query: string },
): UsageStatsTableRow[] {
  const q = opts.query.trim().toLowerCase();
  return table
    .filter((row) => {
      if (opts.type !== 'all' && (row[opts.type] ?? 0) <= 0) return false;
      if (!q) return row.total > 0;
      return row.label.toLowerCase().includes(q) || row.period.includes(q);
    })
    .sort((a, b) => b.period.localeCompare(a.period));
}

export function exportStatsTableCsv(rows: UsageStatsTableRow[]): string {
  const header = [
    'period',
    'label',
    'image',
    'video',
    'audio',
    'music',
    'total',
    'success',
    'error',
    'credit',
    'refund',
    'credit_net',
  ];
  const body = rows.map((r) =>
    [
      r.period,
      r.label,
      r.image,
      r.video,
      r.audio,
      r.music,
      r.total,
      r.success,
      r.error,
      r.credit,
      r.refund,
      r.credit_net,
    ].join(','),
  );
  return [header.join(','), ...body].join('\n');
}

export function groupListItemsByDay(
  items: UsageListItem[],
  localeOrVi: StatsLocale | boolean,
): { dayKey: string; label: string; items: UsageListItem[] }[] {
  const locale = normalizeStatsLocale(localeOrVi);
  const map = new Map<string, UsageListItem[]>();
  for (const item of items) {
    const iso = listItemCreatedAt(item);
    const dayKey = iso ? iso.slice(0, 10) : 'unknown';
    const bucket = map.get(dayKey);
    if (bucket) bucket.push(item);
    else map.set(dayKey, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, dayItems]) => ({
      dayKey,
      label: formatDayLabel(dayKey, locale),
      items: dayItems,
    }));
}

function formatDayLabel(dayKey: string, locale: StatsLocale): string {
  if (dayKey === 'unknown') {
    if (locale === 'vi') return 'Không rõ ngày';
    if (locale === 'th') return 'วันที่ไม่ทราบ';
    return 'Unknown date';
  }
  const d = Date.parse(`${dayKey}T12:00:00`);
  if (!Number.isFinite(d)) return dayKey;
  const dateLocale = locale === 'vi' ? 'vi-VN' : locale === 'th' ? 'th-TH' : 'en-US';
  return new Intl.DateTimeFormat(dateLocale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(d));
}

type StatsLocale = 'en' | 'vi' | 'th';

function normalizeStatsLocale(localeOrVi: StatsLocale | boolean): StatsLocale {
  if (typeof localeOrVi === 'boolean') return localeOrVi ? 'vi' : 'en';
  return localeOrVi;
}

export function jobTypeLabel(type: UsageStatsType | 'all', localeOrVi: StatsLocale | boolean): string {
  const map: Record<string, [string, string, string]> = {
    all: ['All', 'Tất cả', 'ทั้งหมด'],
    image: ['Image', 'Ảnh', 'รูป'],
    video: ['Video', 'Video', 'วิดีโอ'],
    audio: ['Audio', 'Audio', 'เสียง'],
    music: ['Music', 'Nhạc', 'เพลง'],
  };
  const locale = normalizeStatsLocale(localeOrVi);
  const triple = map[type] || map.all;
  if (locale === 'vi') return triple[1];
  if (locale === 'th') return triple[2];
  return triple[0];
}
