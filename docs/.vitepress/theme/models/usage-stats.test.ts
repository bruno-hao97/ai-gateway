import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchesUsageJobId,
  normalizeUsageJobType,
  normalizeUsageListItem,
  usageJobId,
} from './usage-stats.ts';

describe('usageJobId', () => {
  it('reads id_base first', () => {
    assert.equal(usageJobId({ id_base: 'abc', id: 'xyz' }), 'abc');
  });

  it('falls back to id and job_id', () => {
    assert.equal(usageJobId({ id: 'from-id' }), 'from-id');
    assert.equal(usageJobId({ job_id: 'from-job' }), 'from-job');
  });

  it('normalizes list items to id_base', () => {
    const row = normalizeUsageListItem({ id: 'job-1', model: 'test' });
    assert.equal(row.id_base, 'job-1');
    assert.equal(matchesUsageJobId(row, 'job-1'), true);
  });
});

describe('normalizeUsageJobType', () => {
  it('normalizes aliases and casing', () => {
    assert.equal(normalizeUsageJobType('Video'), 'video');
    assert.equal(normalizeUsageJobType('IMG'), 'image');
    assert.equal(normalizeUsageJobType('t2v'), 'video');
  });

  it('infers video from model slug', () => {
    assert.equal(normalizeUsageJobType(undefined, 'veo_2_1_t2v_fast_ultra'), 'video');
    assert.equal(normalizeUsageJobType('', 'imagegen_2_0'), 'image');
  });

  it('normalizes type on list items', () => {
    const row = normalizeUsageListItem({ model: 'veo_3_fast' });
    assert.equal(row.type, 'video');
  });
});
