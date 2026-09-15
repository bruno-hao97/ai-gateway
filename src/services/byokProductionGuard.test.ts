import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { config } from '../config.js';
import { assertByokProductionConfig } from './byokProductionGuard.js';

describe('assertByokProductionConfig', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevByokEnabled = config.byok.enabled;
  const prevKey = config.byok.encryptionKey;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    config.byok.enabled = prevByokEnabled;
    config.byok.encryptionKey = prevKey;
  });

  it('allows dev without encryption key', () => {
    process.env.NODE_ENV = 'development';
    config.byok.enabled = true;
    config.byok.encryptionKey = '';
    assertByokProductionConfig();
  });

  it('throws in production when BYOK enabled without key', () => {
    process.env.NODE_ENV = 'production';
    config.byok.enabled = true;
    config.byok.encryptionKey = '';
    assert.throws(() => assertByokProductionConfig(), /BYOK_ENCRYPTION_KEY/);
  });

  it('passes in production when key is set', () => {
    process.env.NODE_ENV = 'production';
    config.byok.enabled = true;
    config.byok.encryptionKey = 'dGVzdC1rZXktMzJieXRzLWxlbmd0aC1wYWRkZWQ=';
    assertByokProductionConfig();
  });
});
