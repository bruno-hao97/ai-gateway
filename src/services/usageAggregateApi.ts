import type {
  GommoDevicePayload,
  UsageListItem,
  UsageStatsApi,
  UsageStatsPeriod,
  UsageStatsType,
} from './usageStatsApi.js';

export type UsageAggregateGroupBy = 'model';

export interface ModelAggregateRow {
  model: string;
  count: number;
  credit: number;
  percent: number;
}

export interface UsageModelAggregateData {
  period: UsageStatsPeriod;
  type: UsageStatsType;
  group_by: UsageAggregateGroupBy;
  scanned_jobs: number;
  pages_scanned: number;
  truncated: boolean;
  items: ModelAggregateRow[];
}

const PAGE_LIMIT = 100;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_TOP = 5;

function listItemCredit(item: UsageListItem): number {
  const n = Number(item.credit ?? item.credit_fee ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function normalizeAggregateGroupBy(raw: string | undefined): UsageAggregateGroupBy | null {
  if (raw === 'model') return 'model';
  return null;
}

export function aggregateTopModelsFromItems(items: UsageListItem[], top = DEFAULT_TOP): ModelAggregateRow[] {
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
    .slice(0, top);
}

export async function fetchTopModelAggregate(
  api: UsageStatsApi,
  opts: {
    period?: UsageStatsPeriod;
    type?: UsageStatsType;
    language?: string;
    device?: GommoDevicePayload;
    top?: number;
    maxPages?: number;
  },
): Promise<UsageModelAggregateData> {
  const period = opts.period ?? '30d';
  const type = opts.type ?? 'all';
  const top = Math.min(Math.max(opts.top ?? DEFAULT_TOP, 1), 20);
  const maxPages = Math.min(Math.max(opts.maxPages ?? DEFAULT_MAX_PAGES, 1), 100);

  const allItems: UsageListItem[] = [];
  let pagesScanned = 0;
  let truncated = false;

  for (let page = 1; page <= maxPages; page++) {
    const batch = await api.fetchLogs({
      period,
      type,
      language: opts.language ?? 'VI',
      page,
      limit: PAGE_LIMIT,
      device: opts.device,
    });

    pagesScanned = page;
    allItems.push(...batch.items);

    const pageFull = batch.items.length >= (batch.limit ?? PAGE_LIMIT);
    if (!batch.has_more || batch.items.length === 0 || !pageFull) break;
    if (page === maxPages) truncated = true;
  }

  return {
    period,
    type,
    group_by: 'model',
    scanned_jobs: allItems.length,
    pages_scanned: pagesScanned,
    truncated,
    items: aggregateTopModelsFromItems(allItems, top),
  };
}
