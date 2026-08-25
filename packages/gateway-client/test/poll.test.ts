import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPollStatus,
  extractJobId,
  extractPollSnapshot,
} from '../src/poll.js';
import { modelSlug, pickFirstRatio } from '../src/resources/models.js';
import { pollMediaForJobType } from '../src/types.js';

describe('pollMediaForJobType', () => {
  it('maps image tools to image media', () => {
    assert.equal(pollMediaForJobType('remove-bg'), 'image');
    assert.equal(pollMediaForJobType('video-vfx'), 'video');
    assert.equal(pollMediaForJobType('tts'), null);
  });
});

describe('extractPollSnapshot', () => {
  it('reads resultUrl from nested raw.imageInfo', () => {
    const snap = extractPollSnapshot({
      success: true,
      data: { status: 'SUCCESS' },
      raw: { imageInfo: { status: 'SUCCESS', result_url: 'https://cdn.example/a.png' } },
    });
    assert.equal(snap.resultUrl, 'https://cdn.example/a.png');
    assert.equal(classifyPollStatus(snap.status, snap.resultUrl), 'success');
  });
});

describe('extractJobId', () => {
  it('prefers data.id_base', () => {
    assert.equal(extractJobId({ data: { id_base: 'abc123' } }), 'abc123');
  });
});

describe('model helpers', () => {
  it('modelSlug picks first available field', () => {
    assert.equal(modelSlug({ slug: 'flux-dev' }), 'flux-dev');
    assert.equal(modelSlug({ model: 'm1', slug: 's1' }), 'm1');
  });

  it('pickFirstRatio handles string array', () => {
    assert.equal(pickFirstRatio({ ratios: ['16:9', '1:1'] }), '16:9');
  });
});
