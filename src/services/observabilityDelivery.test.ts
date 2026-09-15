import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { config } from '../config.js';
import { deliveryAttemptCount, postWithDeliveryRetries } from './observabilityDelivery.js';

describe('postWithDeliveryRetries', () => {
  before(() => {
    config.observability.deliveryRetryCount = 2;
    config.observability.deliveryRetryDelayMs = 0;
    config.observability.deliveryTimeoutMs = 5_000;
  });

  after(() => {
    config.observability.deliveryRetryCount = 2;
    config.observability.deliveryRetryDelayMs = 1_000;
    config.observability.deliveryTimeoutMs = 10_000;
  });

  it('reports total attempts as retries + 1', () => {
    config.observability.deliveryRetryCount = 2;
    assert.equal(deliveryAttemptCount(), 3);
  });

  it('retries on non-2xx then succeeds', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls < 3) {
        return { ok: false, status: 503, text: async () => 'busy' };
      }
      return { ok: true, status: 200, text: async () => '' };
    };

    const result = await postWithDeliveryRetries(
      'https://example.com/hook',
      { method: 'POST', headers: {}, body: '{}' },
      fetchImpl as unknown as typeof fetch,
    );

    assert.equal(result.ok, true);
    assert.equal(result.attempts, 3);
    assert.equal(calls, 3);
  });

  it('returns error after all attempts fail', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 500,
      text: async () => 'fail',
    });

    const result = await postWithDeliveryRetries(
      'https://example.com/hook',
      { method: 'POST', headers: {}, body: '{}' },
      fetchImpl as unknown as typeof fetch,
    );

    assert.equal(result.ok, false);
    assert.match(result.error || '', /HTTP 500/);
    assert.equal(result.attempts, 3);
  });
});
