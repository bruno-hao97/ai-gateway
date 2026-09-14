import { createHash } from 'node:crypto';
import type { UsageModelAggregateData } from './usageAggregateApi.js';

const DEFAULT_TTL_MS = Number(process.env.USAGE_AGGREGATE_CACHE_TTL_MS) || 10 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  data: UsageModelAggregateData;
}

const cache = new Map<string, CacheEntry>();

export function usageAggregateCacheKey(parts: Record<string, string | number | undefined>): string {
  const payload = Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha256').update(payload).digest('hex');
}

export function getCachedUsageAggregate(key: string): UsageModelAggregateData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return { ...entry.data, from_cache: true };
}

export function setCachedUsageAggregate(key: string, data: UsageModelAggregateData): void {
  const { from_cache: _drop, ...rest } = data;
  cache.set(key, {
    expiresAt: Date.now() + DEFAULT_TTL_MS,
    data: { ...rest, from_cache: false },
  });
}

export function clearUsageAggregateCache(): void {
  cache.clear();
}

/** @internal test helper */
export function usageAggregateCacheSize(): number {
  return cache.size;
}
