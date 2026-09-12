import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { fetchGommoMeForDomain } from './byokIdentity.js';

export function calculatePlatformFeeCredits(input: {
  tokensIn?: number;
  tokensOut?: number;
}): number {
  const percent = config.byok.platformFeePercent;
  const perRequest = config.byok.platformFeePerRequest;
  const minCredits = config.byok.platformFeeMinCredits;

  if (percent <= 0 && perRequest <= 0) return 0;

  const tokens = Math.max(0, Math.floor(Number(input.tokensIn) || 0))
    + Math.max(0, Math.floor(Number(input.tokensOut) || 0));

  let fee = 0;
  if (percent > 0) {
    fee = tokens > 0 ? Math.ceil((tokens * percent) / 100) : perRequest;
  }
  if (perRequest > 0 && fee <= 0) fee = perRequest;
  return Math.max(minCredits, fee);
}

interface FeeLedgerRow {
  accruedCredits: number;
  settledCredits: number;
  updatedAt: string;
}

interface FeeLedgerFile {
  owners: Record<string, FeeLedgerRow>;
}

let writeQueue: Promise<void> = Promise.resolve();

function ledgerPath(): string {
  return config.byok.feeLedgerFile;
}

async function ensureLedgerFile(): Promise<void> {
  const dir = path.dirname(ledgerPath());
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(ledgerPath());
  } catch {
    await fs.writeFile(ledgerPath(), JSON.stringify({ owners: {} } satisfies FeeLedgerFile, null, 2), 'utf8');
  }
}

async function readLedger(): Promise<FeeLedgerFile> {
  await ensureLedgerFile();
  const raw = await fs.readFile(ledgerPath(), 'utf8');
  try {
    const parsed = JSON.parse(raw) as FeeLedgerFile;
    return parsed?.owners ? parsed : { owners: {} };
  } catch {
    return { owners: {} };
  }
}

async function writeLedger(store: FeeLedgerFile): Promise<void> {
  await fs.writeFile(ledgerPath(), JSON.stringify(store, null, 2), 'utf8');
}

function queueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

export async function accruePlatformFee(ownerId: string, credits: number): Promise<number> {
  const amount = Math.max(0, Math.floor(credits));
  if (!amount || !ownerId) return 0;

  let accruedTotal = 0;
  await queueWrite(async () => {
    const store = await readLedger();
    const current = store.owners[ownerId] || {
      accruedCredits: 0,
      settledCredits: 0,
      updatedAt: new Date().toISOString(),
    };
    const next: FeeLedgerRow = {
      ...current,
      accruedCredits: current.accruedCredits + amount,
      updatedAt: new Date().toISOString(),
    };
    store.owners[ownerId] = next;
    accruedTotal = next.accruedCredits - next.settledCredits;
    await writeLedger(store);
  });
  return accruedTotal;
}

export async function getPlatformFeeLedger(ownerId: string): Promise<{
  accruedCredits: number;
  settledCredits: number;
  outstandingCredits: number;
}> {
  const store = await readLedger();
  const row = store.owners[ownerId];
  if (!row) {
    return { accruedCredits: 0, settledCredits: 0, outstandingCredits: 0 };
  }
  const outstandingCredits = Math.max(0, row.accruedCredits - row.settledCredits);
  return {
    accruedCredits: row.accruedCredits,
    settledCredits: row.settledCredits,
    outstandingCredits,
  };
}

export async function readUserPlatformCredits(
  accessToken: string,
  domain: string,
): Promise<number> {
  const me = await fetchGommoMeForDomain(accessToken, domain);
  const balances = me.balancesInfo;
  const user = me.userInfo;
  const raw =
    balances?.credits_ai ??
    balances?.credits ??
    user?.credits_ai ??
    0;
  return Math.max(0, Math.floor(Number(raw) || 0));
}

export async function assertPlatformFeeAllowance(input: {
  ownerId: string;
  accessToken: string;
  domain: string;
  estimatedFeeCredits?: number;
}): Promise<void> {
  const percent = config.byok.platformFeePercent;
  const perRequest = config.byok.platformFeePerRequest;
  if (percent <= 0 && perRequest <= 0) return;

  const ledger = await getPlatformFeeLedger(input.ownerId);
  const estimated = Math.max(0, Math.floor(Number(input.estimatedFeeCredits) || 0));
  const required = ledger.outstandingCredits + estimated;
  if (required <= 0) return;

  const available = await readUserPlatformCredits(input.accessToken, input.domain);
  if (available < required) {
    throw new PlatformFeeError(
      `Insufficient platform credits for BYOK fee (${available.toLocaleString('vi-VN')} available, ${required.toLocaleString('vi-VN')} required). Top up on Credits.`,
      available,
      required,
    );
  }
}

export class PlatformFeeError extends Error {
  status = 402;
  code = 'INSUFFICIENT_CREDITS' as const;
  availableCredits: number;
  requiredCredits: number;

  constructor(message: string, availableCredits: number, requiredCredits: number) {
    super(message);
    this.name = 'PlatformFeeError';
    this.availableCredits = availableCredits;
    this.requiredCredits = requiredCredits;
  }
}
