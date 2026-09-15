import { config, isByokEnabled } from '../config.js';

const KEY_GEN_HINT =
  'Generate a 32-byte key: npm run byok:generate-key (or openssl rand -base64 32)';

/** Fail fast at startup when BYOK is enabled in production without encryption key. */
export function assertByokProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!isByokEnabled()) return;
  if (config.byok.encryptionKey) return;

  throw new Error(`BYOK_ENCRYPTION_KEY is required in production when BYOK is enabled. ${KEY_GEN_HINT}`);
}
