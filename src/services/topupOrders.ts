import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export type TopupOrderStatus = 'pending' | 'paid' | 'credited' | 'failed';
export type TopupOrderSource = 'gommo' | 'payos';

export interface TopupOrder {
  orderCode: string;
  username: string;
  packageId: string;
  amountVnd: number;
  credits: number;
  status: TopupOrderStatus;
  source: TopupOrderSource;
  createdAt: string;
  paidAt?: string;
  creditedAt?: string;
  payosReference?: string;
  error?: string;
}

interface OrderStore {
  orders: Record<string, TopupOrder>;
}

let writeQueue: Promise<void> = Promise.resolve();

function normalizeOrderCode(orderCode: string | number): string {
  return String(orderCode ?? '').trim();
}

function normalizeOrder(order: TopupOrder): TopupOrder {
  return {
    ...order,
    orderCode: normalizeOrderCode(order.orderCode),
    source: order.source === 'gommo' ? 'gommo' : 'payos',
  };
}

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(config.topup.ordersFile);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(config.topup.ordersFile);
  } catch {
    await fs.writeFile(config.topup.ordersFile, JSON.stringify({ orders: {} }, null, 2), 'utf8');
  }
}

async function readStore(): Promise<OrderStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(config.topup.ordersFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as OrderStore;
    if (!parsed?.orders) return { orders: {} };
    const orders: Record<string, TopupOrder> = {};
    for (const [key, order] of Object.entries(parsed.orders)) {
      const normalized = normalizeOrder(order);
      orders[normalized.orderCode || key] = normalized;
    }
    return { orders };
  } catch {
    return { orders: {} };
  }
}

function queueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function writeStore(store: OrderStore): Promise<void> {
  await fs.writeFile(config.topup.ordersFile, JSON.stringify(store, null, 2), 'utf8');
}

export async function createTopupOrder(input: {
  orderCode: string | number;
  username: string;
  packageId: string;
  amountVnd: number;
  credits: number;
  source?: TopupOrderSource;
}): Promise<TopupOrder> {
  const orderCode = normalizeOrderCode(input.orderCode);
  const order: TopupOrder = {
    orderCode,
    username: input.username,
    packageId: input.packageId,
    amountVnd: input.amountVnd,
    credits: input.credits,
    status: 'pending',
    source: input.source ?? 'payos',
    createdAt: new Date().toISOString(),
  };

  await queueWrite(async () => {
    const store = await readStore();
    store.orders[orderCode] = order;
    await writeStore(store);
  });

  return order;
}

export async function getTopupOrder(orderCode: string | number): Promise<TopupOrder | null> {
  const key = normalizeOrderCode(orderCode);
  if (!key) return null;
  const store = await readStore();
  return store.orders[key] ?? null;
}

export async function listTopupOrdersForUsername(
  username: string,
  limit = 20,
): Promise<TopupOrder[]> {
  const needle = username.trim().toLowerCase();
  if (!needle) return [];

  const cap = Math.min(100, Math.max(1, Math.floor(limit) || 20));
  const store = await readStore();

  return Object.values(store.orders)
    .filter((order) => order.username.trim().toLowerCase() === needle)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, cap);
}

export async function sumReservedTopupCredits(excludeOrderCode?: string | number): Promise<number> {
  const exclude = excludeOrderCode != null ? normalizeOrderCode(excludeOrderCode) : null;
  const store = await readStore();
  const now = Date.now();
  const pendingMaxAgeMs = 2 * 60 * 60 * 1000;
  let total = 0;
  for (const order of Object.values(store.orders)) {
    if (exclude && order.orderCode === exclude) continue;
    if (order.status === 'paid') {
      const credits = Math.floor(Number(order.credits) || 0);
      if (credits > 0) total += credits;
      continue;
    }
    if (order.status !== 'pending') continue;
    const created = Date.parse(order.createdAt);
    if (Number.isFinite(created) && now - created > pendingMaxAgeMs) continue;
    const credits = Math.floor(Number(order.credits) || 0);
    if (credits > 0) total += credits;
  }
  return total;
}

export async function updateTopupOrder(
  orderCode: string | number,
  patch: Partial<TopupOrder>,
): Promise<TopupOrder | null> {
  const key = normalizeOrderCode(orderCode);
  if (!key) return null;
  let updated: TopupOrder | null = null;

  await queueWrite(async () => {
    const store = await readStore();
    const current = store.orders[key];
    if (!current) return;
    updated = normalizeOrder({ ...current, ...patch, orderCode: key });
    store.orders[key] = updated;
    await writeStore(store);
  });

  return updated;
}

export async function markGommoTopupPaid(orderCode: string | number): Promise<TopupOrder | null> {
  const order = await getTopupOrder(orderCode);
  if (!order || order.source !== 'gommo') return order;
  if (order.status === 'credited') return order;
  const now = new Date().toISOString();
  return updateTopupOrder(orderCode, {
    status: 'credited',
    paidAt: order.paidAt || now,
    creditedAt: now,
  });
}
