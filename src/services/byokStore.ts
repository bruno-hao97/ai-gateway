import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { decryptSecret, encryptSecret, secretHint } from './byokCrypto.js';

export type ByokCredentialKind = 'provider' | 'gommo';
export type ByokProviderSlug = 'openai' | 'anthropic' | 'gommo';

export interface ByokCredential {
  id: string;
  ownerId: string;
  kind: ByokCredentialKind;
  providerSlug: ByokProviderSlug;
  label?: string;
  encryptedSecret: string;
  secretHint: string;
  allowedModels: string[] | null;
  priority: number;
  isFallback: boolean;
  strictOnly: boolean;
  sharedFallback: boolean;
  disabled: boolean;
  gommoDomain?: string;
  gommoUsername?: string;
  isPrimary?: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastError?: string;
}

export interface ByokCredentialPublic extends Omit<ByokCredential, 'encryptedSecret'> {
  status: 'active' | 'disabled';
}

interface ByokStoreFile {
  credentials: ByokCredential[];
}

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(config.byok.storeFile);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(config.byok.storeFile);
  } catch {
    await fs.writeFile(
      config.byok.storeFile,
      JSON.stringify({ credentials: [] } satisfies ByokStoreFile, null, 2),
      'utf8',
    );
  }
}

async function readStore(): Promise<ByokStoreFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(config.byok.storeFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as ByokStoreFile;
    if (!Array.isArray(parsed?.credentials)) return { credentials: [] };
    return { credentials: parsed.credentials };
  } catch {
    return { credentials: [] };
  }
}

function queueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function writeStore(store: ByokStoreFile): Promise<void> {
  await fs.writeFile(config.byok.storeFile, JSON.stringify(store, null, 2), 'utf8');
}

function toPublic(cred: ByokCredential): ByokCredentialPublic {
  const { encryptedSecret: _secret, ...rest } = cred;
  return {
    ...rest,
    status: cred.disabled ? 'disabled' : 'active',
  };
}

function normalizeAllowedModels(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const models = value.map((v) => String(v).trim()).filter(Boolean);
  return models.length ? models : null;
}

export function listProviderCatalog(): Array<{
  slug: ByokProviderSlug;
  name: string;
  chatSupported: boolean;
}> {
  return [
    { slug: 'openai', name: 'OpenAI', chatSupported: true },
    { slug: 'anthropic', name: 'Anthropic', chatSupported: true },
  ];
}

export async function listCredentials(
  ownerId: string,
  kind?: ByokCredentialKind,
): Promise<ByokCredentialPublic[]> {
  const store = await readStore();
  return store.credentials
    .filter((c) => c.ownerId === ownerId && (!kind || c.kind === kind))
    .sort((a, b) => a.priority - b.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map(toPublic);
}

export async function getCredential(ownerId: string, id: string): Promise<ByokCredential | null> {
  const store = await readStore();
  const cred = store.credentials.find((c) => c.id === id && c.ownerId === ownerId);
  return cred ?? null;
}

export async function getDecryptedSecret(cred: ByokCredential): Promise<string> {
  return decryptSecret(cred.encryptedSecret);
}

export async function createProviderCredential(input: {
  ownerId: string;
  providerSlug: Exclude<ByokProviderSlug, 'gommo'>;
  secret: string;
  label?: string;
  allowedModels?: string[] | null;
  isFallback?: boolean;
  strictOnly?: boolean;
  sharedFallback?: boolean;
}): Promise<ByokCredentialPublic> {
  const secret = input.secret.trim();
  if (!secret) throw new Error('Provider secret is required');

  const now = new Date().toISOString();
  const cred: ByokCredential = {
    id: randomUUID(),
    ownerId: input.ownerId,
    kind: 'provider',
    providerSlug: input.providerSlug,
    label: input.label?.trim() || undefined,
    encryptedSecret: encryptSecret(secret),
    secretHint: secretHint(secret),
    allowedModels: normalizeAllowedModels(input.allowedModels),
    priority: 0,
    isFallback: Boolean(input.isFallback),
    strictOnly: Boolean(input.strictOnly),
    sharedFallback: input.sharedFallback ?? config.byok.defaultSharedFallback,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };

  await queueWrite(async () => {
    const store = await readStore();
    const sameProvider = store.credentials.filter(
      (c) => c.ownerId === input.ownerId && c.kind === 'provider' && c.providerSlug === input.providerSlug,
    );
    cred.priority = sameProvider.length;
    store.credentials.push(cred);
    await writeStore(store);
  });

  return toPublic(cred);
}

export async function createGommoAccount(input: {
  ownerId: string;
  accessToken: string;
  domain: string;
  label?: string;
  username?: string;
  setPrimary?: boolean;
}): Promise<ByokCredentialPublic> {
  const token = input.accessToken.trim();
  const domain = input.domain.trim();
  if (!token) throw new Error('Gommo access_token is required');
  if (!domain) throw new Error('Gommo domain is required');

  const now = new Date().toISOString();
  const cred: ByokCredential = {
    id: randomUUID(),
    ownerId: input.ownerId,
    kind: 'gommo',
    providerSlug: 'gommo',
    label: input.label?.trim() || domain,
    encryptedSecret: encryptSecret(token),
    secretHint: secretHint(token),
    allowedModels: null,
    priority: 0,
    isFallback: false,
    strictOnly: false,
    sharedFallback: true,
    disabled: false,
    gommoDomain: domain,
    gommoUsername: input.username?.trim() || undefined,
    isPrimary: Boolean(input.setPrimary),
    createdAt: now,
    updatedAt: now,
  };

  await queueWrite(async () => {
    const store = await readStore();
    const existing = store.credentials.filter((c) => c.ownerId === input.ownerId && c.kind === 'gommo');
    if (input.setPrimary || existing.length === 0) {
      for (const item of store.credentials) {
        if (item.ownerId === input.ownerId && item.kind === 'gommo') {
          item.isPrimary = false;
          item.updatedAt = now;
        }
      }
      cred.isPrimary = true;
    }
    cred.priority = existing.length;
    store.credentials.push(cred);
    await writeStore(store);
  });

  return toPublic(cred);
}

export async function updateCredential(
  ownerId: string,
  id: string,
  patch: Partial<
    Pick<
      ByokCredential,
      | 'label'
      | 'allowedModels'
      | 'priority'
      | 'isFallback'
      | 'strictOnly'
      | 'sharedFallback'
      | 'disabled'
    >
  >,
): Promise<ByokCredentialPublic | null> {
  let updated: ByokCredentialPublic | null = null;
  const now = new Date().toISOString();

  await queueWrite(async () => {
    const store = await readStore();
    const idx = store.credentials.findIndex((c) => c.id === id && c.ownerId === ownerId);
    if (idx === -1) return;
    const current = store.credentials[idx]!;
    const next: ByokCredential = {
      ...current,
      ...patch,
      allowedModels:
        patch.allowedModels !== undefined
          ? normalizeAllowedModels(patch.allowedModels)
          : current.allowedModels,
      updatedAt: now,
    };
    store.credentials[idx] = next;
    updated = toPublic(next);
    await writeStore(store);
  });

  return updated;
}

export async function setPrimaryGommoAccount(ownerId: string, id: string): Promise<ByokCredentialPublic | null> {
  let updated: ByokCredentialPublic | null = null;
  const now = new Date().toISOString();

  await queueWrite(async () => {
    const store = await readStore();
    const target = store.credentials.find((c) => c.id === id && c.ownerId === ownerId && c.kind === 'gommo');
    if (!target) return;
    for (const item of store.credentials) {
      if (item.ownerId === ownerId && item.kind === 'gommo') {
        item.isPrimary = item.id === id;
        item.updatedAt = now;
      }
    }
    updated = toPublic({ ...target, isPrimary: true, updatedAt: now });
    await writeStore(store);
  });

  return updated;
}

export async function deleteCredential(ownerId: string, id: string): Promise<boolean> {
  let removed = false;
  await queueWrite(async () => {
    const store = await readStore();
    const before = store.credentials.length;
    store.credentials = store.credentials.filter((c) => !(c.id === id && c.ownerId === ownerId));
    removed = store.credentials.length < before;
    if (removed) await writeStore(store);
  });
  return removed;
}

export async function findProviderCredentials(
  ownerId: string,
  providerSlug: Exclude<ByokProviderSlug, 'gommo'>,
): Promise<ByokCredential[]> {
  const store = await readStore();
  return store.credentials
    .filter(
      (c) =>
        c.ownerId === ownerId &&
        c.kind === 'provider' &&
        c.providerSlug === providerSlug &&
        !c.disabled,
    )
    .sort((a, b) => {
      if (a.isFallback !== b.isFallback) return a.isFallback ? 1 : -1;
      return a.priority - b.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });
}

export async function getPrimaryGommoAccount(ownerId: string): Promise<ByokCredential | null> {
  const store = await readStore();
  const accounts = store.credentials.filter(
    (c) => c.ownerId === ownerId && c.kind === 'gommo' && !c.disabled,
  );
  return accounts.find((c) => c.isPrimary) ?? accounts[0] ?? null;
}

export async function touchCredential(id: string, ok: boolean, error?: string): Promise<void> {
  const now = new Date().toISOString();
  await queueWrite(async () => {
    const store = await readStore();
    const cred = store.credentials.find((c) => c.id === id);
    if (!cred) return;
    cred.lastUsedAt = now;
    cred.lastError = ok ? undefined : error?.slice(0, 240);
    cred.updatedAt = now;
    await writeStore(store);
  });
}

export async function countCredentialsByProvider(
  ownerId: string,
): Promise<Record<string, number>> {
  const store = await readStore();
  const counts: Record<string, number> = {};
  for (const cred of store.credentials) {
    if (cred.ownerId !== ownerId || cred.kind !== 'provider' || cred.disabled) continue;
    counts[cred.providerSlug] = (counts[cred.providerSlug] || 0) + 1;
  }
  return counts;
}

export async function hasGommoAccounts(ownerId: string): Promise<boolean> {
  const store = await readStore();
  return store.credentials.some((c) => c.ownerId === ownerId && c.kind === 'gommo' && !c.disabled);
}
