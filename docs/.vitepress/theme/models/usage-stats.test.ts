import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchesUsageJobId,
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
