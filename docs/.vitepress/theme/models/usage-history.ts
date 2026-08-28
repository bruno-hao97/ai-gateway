export const USAGE_STORAGE_KEY = 'gw_usage_history';
const MAX_RECORDS = 500;

export type UsageJobType = 'image' | 'video' | 'music' | 'audio' | 'chat' | 'tool' | 'upload' | 'other';
export type UsageStatus = 'success' | 'failed' | 'pending';
export type UsageRange = 'all' | '7d' | '30d' | '90d';

export interface UsageRecord {
  id: string;
  jobType: UsageJobType;
  model: string;
  prompt: string;
  status: UsageStatus;
  credits?: number | null;
  jobId?: string;
  resultUrl?: string;
  createdAt: string;
  source?: 'playground' | 'audio-api' | 'import' | 'server';
}

export interface UsageStats {
  totalCalls: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  creditsUsed: number;
}

export interface UsageDayPoint {
  date: string;
  label: string;
  count: number;
}

function safeParseList(raw: string | null): UsageRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r === 'object' && typeof r.createdAt === 'string') as UsageRecord[];
  } catch {
    return [];
  }
}

export function loadUsageHistory(): UsageRecord[] {
  if (typeof window === 'undefined') return [];
  return safeParseList(localStorage.getItem(USAGE_STORAGE_KEY));
}

export function saveUsageHistory(records: UsageRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendUsageRecord(
  input: Omit<UsageRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): UsageRecord {
  const record: UsageRecord = {
    id: input.id || newId(),
    jobType: input.jobType || 'other',
    model: input.model || '—',
    prompt: input.prompt || '',
    status: input.status || 'success',
    credits: input.credits ?? null,
    jobId: input.jobId,
    resultUrl: input.resultUrl,
    createdAt: input.createdAt || new Date().toISOString(),
    source: input.source || 'playground',
  };

  const list = loadUsageHistory();
  if (record.jobId) {
    const idx = list.findIndex((r) => r.jobId === record.jobId);
    if (idx >= 0) {
      list[idx] = { ...list[idx]!, ...record, id: list[idx]!.id };
      saveUsageHistory(list);
      return list[idx]!;
    }
  }
  list.unshift(record);
  saveUsageHistory(list);
  return record;
}

export interface AudioListItem {
  id_base: string;
  file_url: string;
  text?: string;
  status?: string;
  created_at?: string;
}

export function audioItemsToUsageRecords(items: AudioListItem[]): UsageRecord[] {
  return items.map((item) => ({
    id: `audio-${item.id_base}`,
    jobType: 'audio' as const,
    model: 'TTS',
    prompt: (item.text || '').slice(0, 500),
    status: /fail|error/i.test(String(item.status || '')) ? ('failed' as const) : ('success' as const),
    credits: null,
    jobId: item.id_base,
    resultUrl: item.file_url,
    createdAt: item.created_at || new Date().toISOString(),
    source: 'audio-api' as const,
  }));
}

export function mergeUsageRecords(local: UsageRecord[], remote: UsageRecord[]): UsageRecord[] {
  const map = new Map<string, UsageRecord>();
  for (const r of [...remote, ...local]) {
    const key = r.jobId ? `job:${r.jobId}` : r.id;
    const existing = map.get(key);
    if (!existing || Date.parse(r.createdAt) > Date.parse(existing.createdAt)) {
      map.set(key, r);
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function rangeStartMs(range: UsageRange): number | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function filterUsageRecords(
  records: UsageRecord[],
  opts: { range?: UsageRange; jobType?: UsageJobType | 'all'; query?: string },
): UsageRecord[] {
  const start = opts.range ? rangeStartMs(opts.range) : null;
  const q = (opts.query || '').trim().toLowerCase();
  return records.filter((r) => {
    if (start != null && Date.parse(r.createdAt) < start) return false;
    if (opts.jobType && opts.jobType !== 'all' && r.jobType !== opts.jobType) return false;
    if (!q) return true;
    const hay = `${r.model} ${r.prompt} ${r.jobType}`.toLowerCase();
    return hay.includes(q);
  });
}

export function computeUsageStats(records: UsageRecord[]): UsageStats {
  const totalCalls = records.length;
  const successCount = records.filter((r) => r.status === 'success').length;
  const failedCount = records.filter((r) => r.status === 'failed').length;
  const creditsUsed = records.reduce((sum, r) => sum + (Number(r.credits) > 0 ? Number(r.credits) : 0), 0);
  const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0;
  return { totalCalls, successCount, failedCount, successRate, creditsUsed };
}

export function computeTypeBreakdown(
  records: UsageRecord[],
): { jobType: UsageJobType; count: number; percent: number }[] {
  const counts = new Map<UsageJobType, number>();
  for (const r of records) {
    counts.set(r.jobType, (counts.get(r.jobType) || 0) + 1);
  }
  const total = records.length || 1;
  return [...counts.entries()]
    .map(([jobType, count]) => ({
      jobType,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function usageChartByDay(records: UsageRecord[], days: number): UsageDayPoint[] {
  const out: UsageDayPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    const count = records.filter((r) => r.createdAt.slice(0, 10) === key).length;
    out.push({ date: key, label, count });
  }
  return out;
}

export function groupUsageByDate(
  records: UsageRecord[],
  isVi: boolean,
): { dateKey: string; label: string; items: UsageRecord[] }[] {
  const groups = new Map<string, UsageRecord[]>();
  for (const r of records) {
    const key = r.createdAt.slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, items]) => ({
      dateKey,
      label: new Date(dateKey).toLocaleDateString(isVi ? 'vi-VN' : undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }),
      items,
    }));
}

export function exportUsageCsv(records: UsageRecord[]): string {
  const header = ['createdAt', 'jobType', 'model', 'prompt', 'status', 'credits', 'jobId', 'source'];
  const rows = records.map((r) =>
    [
      r.createdAt,
      r.jobType,
      r.model,
      `"${r.prompt.replace(/"/g, '""')}"`,
      r.status,
      r.credits ?? '',
      r.jobId ?? '',
      r.source ?? '',
    ].join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export function formatUsageTime(iso: string, isVi: boolean): string {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return iso;
  return new Date(d).toLocaleTimeString(isVi ? 'vi-VN' : undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function jobTypeLabel(type: UsageJobType, isVi: boolean): string {
  const map: Record<UsageJobType, [string, string]> = {
    image: ['Image', 'Ảnh'],
    video: ['Video', 'Video'],
    music: ['Music', 'Nhạc'],
    audio: ['Audio', 'Audio'],
    chat: ['Chat', 'Chat'],
    tool: ['Tool', 'Tool'],
    upload: ['Upload', 'Upload'],
    other: ['Other', 'Khác'],
  };
  const pair = map[type] || map.other;
  return isVi ? pair[1] : pair[0];
}
