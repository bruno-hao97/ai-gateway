import type { UsageStatsPeriod, UsageStatsType } from './usage-stats';

const EXPLORE_TYPES = new Set<UsageStatsType>(['image', 'video', 'audio', 'music']);

export type ActivityHubTab = 'overview' | 'trends' | 'explore' | 'billing';

/** Profile usage preview always shows 7-day stats. */
export const PROFILE_USAGE_PREVIEW_PERIOD: UsageStatsPeriod = '7d';

export function activityHubHref(
  prefix: string,
  opts?: {
    tab?: ActivityHubTab;
    period?: UsageStatsPeriod;
    model?: string;
    job?: string;
    type?: UsageStatsType | 'all';
  },
): string {
  const params = new URLSearchParams();
  const tab = opts?.tab ?? 'overview';
  if (tab !== 'overview') params.set('tab', tab);
  const period = opts?.period ?? '30d';
  if (period !== '30d') params.set('period', period);
  const model = opts?.model?.trim() || '';
  if (tab === 'explore' && model) params.set('model', model);
  const job = opts?.job?.trim() || '';
  if (tab === 'explore' && job) params.set('job', job);
  const type = opts?.type ?? 'all';
  if (tab === 'explore' && type !== 'all' && EXPLORE_TYPES.has(type)) {
    params.set('type', type);
  }
  const query = params.toString();
  const base = `${prefix}/app/activity/`;
  return query ? `${base}?${query}` : base;
}
