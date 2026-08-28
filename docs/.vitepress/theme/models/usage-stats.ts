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

export function filterListItems(
  items: UsageListItem[],
  opts: { type: UsageStatsType; query: string },
): UsageListItem[] {
  const q = opts.query.trim().toLowerCase();
  return items.filter((item) => {
    if (opts.type !== 'all' && String(item.type || '').toLowerCase() !== opts.type) return false;
    if (!q) return true;
    const hay = `${item.model || ''} ${item.prompt || ''} ${item.type || ''} ${item.status || ''}`.toLowerCase();
    return hay.includes(q);
  });
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
      item.id_base || '',
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

export function jobTypeLabel(type: UsageStatsType | 'all', isVi: boolean): string {
  const map: Record<string, [string, string]> = {
    all: ['All', 'Tất cả'],
    image: ['Image', 'Ảnh'],
    video: ['Video', 'Video'],
    audio: ['Audio', 'Audio'],
    music: ['Music', 'Nhạc'],
  };
  const pair = map[type] || map.all;
  return isVi ? pair[1] : pair[0];
}
