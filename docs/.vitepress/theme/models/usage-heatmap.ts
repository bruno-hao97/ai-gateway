import type { UsageChartSeriesPoint } from './usage-stats';

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDay {
  index: number;
  label: string;
  count: number;
  credit: number;
  level: HeatmapLevel;
}

export interface HeatmapStreakStats {
  activeDays: number;
  totalJobs: number;
  currentStreak: number;
  longestStreak: number;
  maxDailyJobs: number;
}

function heatmapLevel(count: number, max: number): HeatmapLevel {
  if (count <= 0) return 0;
  const ratio = count / max;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export function buildHeatmapDays(points: UsageChartSeriesPoint[]): HeatmapDay[] {
  const counts = points.map((p) => p.total);
  const max = Math.max(1, ...counts);
  return points.map((point, index) => ({
    index,
    label: point.label,
    count: point.total,
    credit: point.credit,
    level: heatmapLevel(point.total, max),
  }));
}

export function computeHeatmapStreaks(days: HeatmapDay[]): HeatmapStreakStats {
  const activeDays = days.filter((d) => d.count > 0).length;
  const totalJobs = days.reduce((sum, d) => sum + d.count, 0);
  const maxDailyJobs = days.reduce((max, d) => Math.max(max, d.count), 0);

  let longestStreak = 0;
  let run = 0;
  for (const day of days) {
    if (day.count > 0) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }

  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak += 1;
    else break;
  }

  return {
    activeDays,
    totalJobs,
    currentStreak,
    longestStreak,
    maxDailyJobs,
  };
}
