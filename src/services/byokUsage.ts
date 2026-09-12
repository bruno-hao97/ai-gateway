import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export interface ByokUsageEvent {
  id: string;
  ownerId: string;
  credentialId?: string;
  source: 'byok' | 'platform';
  route: 'chat' | 'openai';
  provider?: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  platformFeeCredits?: number;
  latencyMs: number;
  ok: boolean;
  errorCode?: string;
  at: string;
}

let writeQueue: Promise<void> = Promise.resolve();

async function ensureUsageFile(): Promise<void> {
  const dir = path.dirname(config.byok.usageFile);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(config.byok.usageFile);
  } catch {
    await fs.writeFile(config.byok.usageFile, '', 'utf8');
  }
}

function queueAppend(line: string): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureUsageFile();
    await fs.appendFile(config.byok.usageFile, line, 'utf8');
  }, async () => {
    await ensureUsageFile();
    await fs.appendFile(config.byok.usageFile, line, 'utf8');
  });
  return writeQueue;
}

export async function recordByokUsage(event: Omit<ByokUsageEvent, 'id' | 'at'>): Promise<void> {
  const row: ByokUsageEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
  };
  await queueAppend(`${JSON.stringify(row)}\n`);
}

export async function listByokUsage(ownerId: string, limit = 50): Promise<ByokUsageEvent[]> {
  await ensureUsageFile();
  const cap = Math.min(200, Math.max(1, limit));
  let raw = '';
  try {
    raw = await fs.readFile(config.byok.usageFile, 'utf8');
  } catch {
    return [];
  }

  const rows: ByokUsageEvent[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as ByokUsageEvent;
      if (parsed.ownerId === ownerId) rows.push(parsed);
    } catch {
      /* skip bad line */
    }
  }

  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, cap);
}

export async function summarizeByokUsage(ownerId: string, days = 7): Promise<{
  byokRequests: number;
  platformRequests: number;
  byokErrors: number;
  totalPlatformFeeCredits: number;
}> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const events = await listByokUsage(ownerId, 500);
  let byokRequests = 0;
  let platformRequests = 0;
  let byokErrors = 0;
  let totalPlatformFeeCredits = 0;

  for (const event of events) {
    if (Date.parse(event.at) < since) continue;
    if (event.source === 'byok') {
      byokRequests += 1;
      if (!event.ok) byokErrors += 1;
      totalPlatformFeeCredits += Math.max(0, Math.floor(Number(event.platformFeeCredits) || 0));
    } else {
      platformRequests += 1;
    }
  }

  return { byokRequests, platformRequests, byokErrors, totalPlatformFeeCredits };
}
