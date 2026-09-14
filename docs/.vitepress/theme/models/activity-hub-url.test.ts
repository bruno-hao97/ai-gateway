import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activityHubHref, PROFILE_USAGE_PREVIEW_PERIOD } from './activity-hub-url.ts';

describe('activityHubHref', () => {
  it('builds profile preview links with 7d period', () => {
    assert.equal(
      activityHubHref('', { tab: 'trends', period: PROFILE_USAGE_PREVIEW_PERIOD }),
      '/app/activity/?tab=trends&period=7d',
    );
    assert.equal(
      activityHubHref('/vi', { tab: 'explore', period: PROFILE_USAGE_PREVIEW_PERIOD }),
      '/vi/app/activity/?tab=explore&period=7d',
    );
  });

  it('omits default period and overview tab', () => {
    assert.equal(activityHubHref(''), '/app/activity/');
    assert.equal(activityHubHref('', { tab: 'billing' }), '/app/activity/?tab=billing');
  });

  it('includes model only on explore tab', () => {
    assert.equal(
      activityHubHref('', { tab: 'explore', model: 'imagegen_2_0', period: '90d' }),
      '/app/activity/?tab=explore&period=90d&model=imagegen_2_0',
    );
    assert.equal(
      activityHubHref('', { tab: 'trends', model: 'imagegen_2_0' }),
      '/app/activity/?tab=trends',
    );
  });

  it('includes job only on explore tab', () => {
    assert.equal(
      activityHubHref('', { tab: 'explore', job: 'abc123', model: 'imagegen_2_0' }),
      '/app/activity/?tab=explore&model=imagegen_2_0&job=abc123',
    );
    assert.equal(activityHubHref('', { tab: 'overview', job: 'abc123' }), '/app/activity/');
  });

  it('includes type only on explore tab', () => {
    assert.equal(
      activityHubHref('', { tab: 'explore', type: 'video', period: '7d' }),
      '/app/activity/?tab=explore&period=7d&type=video',
    );
    assert.equal(activityHubHref('', { tab: 'trends', type: 'image' }), '/app/activity/?tab=trends');
    assert.equal(activityHubHref('', { tab: 'explore', type: 'all' }), '/app/activity/?tab=explore');
  });
});
