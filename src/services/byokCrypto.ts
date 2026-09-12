import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { config } from '../config.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const SALT = 'ai-gateway-byok-v1';

function resolveKeyMaterial(): Buffer {
  const raw = config.byok.encryptionKey.trim();
  if (raw) {
    const fromBase64 = Buffer.from(raw, 'base64');
    if (fromBase64.length === 32) return fromBase64;
    return scryptSync(raw, SALT, 32);
  }
  if (process.env.NODE_ENV !== 'production') {
    return scryptSync('dev-byok-key-not-for-production', SALT, 32);
  }
  throw new Error('BYOK_ENCRYPTION_KEY is required when BYOK is enabled in production');
}

export function secretHint(secret: string): string {
  const s = secret.trim();
  if (!s) return '***';
  if (s.length <= 8) return `${s.slice(0, 2)}…`;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function encryptSecret(plaintext: string): string {
  const key = resolveKeyMaterial();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const key = resolveKeyMaterial();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_LEN + 16 + 1) {
    throw new Error('Invalid encrypted secret payload');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const encrypted = buf.subarray(IV_LEN + 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
