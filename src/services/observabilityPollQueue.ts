import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { decryptSecret, encryptSecret } from './byokCrypto.js';
import type { JobType } from '../types/gommo.js';

export interface BackgroundPollQueueEntry {
  id: string;
  ownerId: string;
  domain: string;
  jobType: JobType;
  modelSlug: string;
  providerJobId: string;
  encryptedAccessToken: string;
  createdAt: string;
}

interface PollQueueFile {
  polls: BackgroundPollQueueEntry[];
}

let writeQueue: Promise<void> = Promise.resolve();

function entryKey(ownerId: string, providerJobId: string): string {
  return `${ownerId}:${providerJobId}`;
}

async function ensureQueueFile(): Promise<void> {
  const file = config.observability.pollQueueFile;
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify({ polls: [] } satisfies PollQueueFile, null, 2), 'utf8');
  }
}

async function readQueue(): Promise<PollQueueFile> {
  await ensureQueueFile();
  const raw = await fs.readFile(config.observability.pollQueueFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as PollQueueFile;
    if (!Array.isArray(parsed?.polls)) return { polls: [] };
    return { polls: parsed.polls };
  } catch {
    return { polls: [] };
  }
}

function queueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function writeQueueFile(store: PollQueueFile): Promise<void> {
  await fs.writeFile(config.observability.pollQueueFile, JSON.stringify(store, null, 2), 'utf8');
}

export async function upsertPollQueueEntry(input: {
  ownerId: string;
  domain: string;
  jobType: JobType;
  modelSlug: string;
  providerJobId: string;
  accessToken: string;
}): Promise<void> {
  const key = entryKey(input.ownerId, input.providerJobId);
  await queueWrite(async () => {
    const store = await readQueue();
    const without = store.polls.filter((p) => entryKey(p.ownerId, p.providerJobId) !== key);
    without.push({
      id: randomUUID(),
      ownerId: input.ownerId,
      domain: input.domain,
      jobType: input.jobType,
      modelSlug: input.modelSlug,
      providerJobId: input.providerJobId,
      encryptedAccessToken: encryptSecret(input.accessToken),
      createdAt: new Date().toISOString(),
    });
    await writeQueueFile({ polls: without });
  });
}

export async function removePollQueueEntry(ownerId: string, providerJobId: string): Promise<void> {
  const key = entryKey(ownerId, providerJobId);
  await queueWrite(async () => {
    const store = await readQueue();
    const next = store.polls.filter((p) => entryKey(p.ownerId, p.providerJobId) !== key);
    if (next.length === store.polls.length) return;
    await writeQueueFile({ polls: next });
  });
}

export async function listPollQueueEntries(): Promise<BackgroundPollQueueEntry[]> {
  const store = await readQueue();
  return store.polls;
}

export function pollQueueEntryToInput(entry: BackgroundPollQueueEntry): {
  accessToken: string;
  domain: string;
  jobType: JobType;
  modelSlug: string;
  providerJobId: string;
} {
  return {
    accessToken: decryptSecret(entry.encryptedAccessToken),
    domain: entry.domain,
    jobType: entry.jobType,
    modelSlug: entry.modelSlug,
    providerJobId: entry.providerJobId,
  };
}
