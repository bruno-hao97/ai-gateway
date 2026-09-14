import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { aggregateTopModelsFromItems } from './usageAggregateApi.js';
import type { UsageListItem } from './usageStatsApi.js';
import {
  clearUsageAggregateCache,
  getCachedUsageAggregate,
  setCachedUsageAggregate,
  usageAggregateCacheKey,
  usageAggregateCacheSize,
} from './usageAggregateCache.js';

describe('aggregateTopModelsFromItems', () => {
  it('groups by model and computes percent', () => {
    const items: UsageListItem[] = [
      { model: 'a', credit: 10 },
      { model: 'a', credit: 5 },
      { model: 'b', credit: 1 },
    ];
    const rows = aggregateTopModelsFromItems(items, 5);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].model, 'a');
    assert.equal(rows[0].count, 2);
    assert.equal(rows[0].credit, 15);
    assert.equal(rows[0].percent, 67);
    assert.equal(rows[1].model, 'b');
  });
});

describe('usageAggregateCache', () => {
  afterEach(() => {
    clearUsageAggregateCache();
  });

  it('returns null on miss', () => {
    assert.equal(getCachedUsageAggregate('missing'), null);
  });

  it('stores and returns cached payload with from_cache flag', () => {
    const key = usageAggregateCacheKey({ token: 't1', period: '30d', top: 5 });
    const payload = {
      period: '30d' as const,
      type: 'all' as const,
      group_by: 'model' as const,
      scanned_jobs: 10,
      pages_scanned: 1,
      truncated: false,
      items: [],
    };
    setCachedUsageAggregate(key, payload);
    const hit = getCachedUsageAggregate(key);
    assert.ok(hit);
    assert.equal(hit.from_cache, true);
    assert.equal(hit.scanned_jobs, 10);
    assert.equal(usageAggregateCacheSize(), 1);
  });

  it('builds stable keys regardless of field order', () => {
    const a = usageAggregateCacheKey({ period: '7d', token: 'abc', top: 5 });
    const b = usageAggregateCacheKey({ top: 5, token: 'abc', period: '7d' });
    assert.equal(a, b);
  });
});
