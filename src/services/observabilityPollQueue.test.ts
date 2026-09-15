import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { config } from '../config.js';
import {
  listPollQueueEntries,
  pollQueueEntryToInput,
  removePollQueueEntry,
  upsertPollQueueEntry,
} from './observabilityPollQueue.js';

describe('observabilityPollQueue', () => {
  let tmpFile = '';

  before(async () => {
    tmpFile = path.join(os.tmpdir(), `obs-poll-queue-${Date.now()}.json`);
    config.observability.pollQueueFile = tmpFile;
  });

  after(async () => {
    if (tmpFile) await fs.unlink(tmpFile).catch(() => undefined);
  });

  beforeEach(async () => {
    await fs.writeFile(tmpFile, JSON.stringify({ polls: [] }), 'utf8');
  });

  it('upserts and removes poll entries', async () => {
    await upsertPollQueueEntry({
      ownerId: 'owner-1',
      domain: '79ai.net',
      jobType: 'image',
      modelSlug: 'flux-schnell',
      providerJobId: 'job-abc',
      accessToken: 'user-token-xyz',
    });

    const entries = await listPollQueueEntries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].providerJobId, 'job-abc');

    const input = pollQueueEntryToInput(entries[0]);
    assert.equal(input.accessToken, 'user-token-xyz');
    assert.equal(input.modelSlug, 'flux-schnell');

    await removePollQueueEntry('owner-1', 'job-abc');
    assert.equal((await listPollQueueEntries()).length, 0);
  });

  it('replaces duplicate owner/job keys', async () => {
    await upsertPollQueueEntry({
      ownerId: 'owner-2',
      domain: '79ai.net',
      jobType: 'video',
      modelSlug: 'model-a',
      providerJobId: 'job-dup',
      accessToken: 'token-a',
    });
    await upsertPollQueueEntry({
      ownerId: 'owner-2',
      domain: '79ai.net',
      jobType: 'video',
      modelSlug: 'model-b',
      providerJobId: 'job-dup',
      accessToken: 'token-b',
    });

    const entries = await listPollQueueEntries();
    assert.equal(entries.length, 1);
    assert.equal(pollQueueEntryToInput(entries[0]).modelSlug, 'model-b');
  });
});
