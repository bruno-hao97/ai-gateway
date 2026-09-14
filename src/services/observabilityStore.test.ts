import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { config } from '../config.js';
import { createWebhook, ownerHasJobWebhooks } from './observabilityStore.js';

describe('ownerHasJobWebhooks', () => {
  let tmpFile = '';

  before(async () => {
    tmpFile = path.join(os.tmpdir(), `obs-store-${Date.now()}.json`);
    config.observability.storeFile = tmpFile;
    await fs.writeFile(tmpFile, JSON.stringify({ webhooks: [] }), 'utf8');
  });

  after(async () => {
    if (tmpFile) await fs.unlink(tmpFile).catch(() => undefined);
  });

  it('returns false when owner has no webhooks', async () => {
    assert.equal(await ownerHasJobWebhooks('user-a'), false);
  });

  it('returns true when owner has enabled job webhooks', async () => {
    await createWebhook({
      ownerId: 'user-b',
      url: 'https://example.com/hook',
      events: ['job.completed'],
    });
    assert.equal(await ownerHasJobWebhooks('user-b'), true);
  });
});
