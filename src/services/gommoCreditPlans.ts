import { config, isGommoMerchantConfigured } from '../config.js';
import { gommoServerDeviceFields } from './gommoDevice.js';
import {
  CREDIT_PACKAGES,
  type CreditPackage,
  getCreditPackage as getStaticCreditPackage,
} from './creditPackages.js';

const CREDIT_PLANS_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}${config.gommo.authPath}/subscriptions/credit_plans`;

/** Gommo `credit_plans` `key` → gateway `packageId` (stable for create_payment). */
export const GOMMO_KEY_TO_PACKAGE_ID: Record<string, string> = {
  'credit-basic': 'basic-member',
  'credit-vip': 'vip-member',
  'credit-ultra': 'ultra-member',
  'credit-infinity': 'infinity-member',
  'credit-agency': 'agency-pro',
};

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPackages: CreditPackage[] | null = null;
let cachedAt = 0;

interface GommoCreditPlanRow {
  key?: string;
  name?: string;
  priceVND?: number;
  credit?: number;
  sale?: number;
  isBestValue?: boolean;
  badge?: string;
}

function mapPlanRow(row: GommoCreditPlanRow): CreditPackage | null {
  const key = String(row.key || '').trim();
  const id = GOMMO_KEY_TO_PACKAGE_ID[key];
  if (!id) return null;

  const amountVnd = Math.floor(Number(row.priceVND) || 0);
  const credits = Math.floor(Number(row.credit) || 0);
  if (amountVnd <= 0 || credits <= 0) return null;

  const bonusPercent = Math.max(0, Math.floor(Number(row.sale) || 0));
  const featured = Boolean(row.isBestValue) || String(row.badge || '').toUpperCase() === 'BEST';

  return {
    id,
    gommoIdBase: key,
    name: String(row.name || id).trim(),
    amountVnd,
    credits,
    bonusPercent,
    ...(featured ? { featured: true } : {}),
  };
}

function parsePlansPayload(raw: unknown): CreditPackage[] {
  const body = raw as { data?: unknown; success?: boolean };
  const rows = Array.isArray(body?.data) ? body.data : Array.isArray(raw) ? raw : [];
  const packages: CreditPackage[] = [];
  for (const row of rows) {
    const pkg = mapPlanRow(row as GommoCreditPlanRow);
    if (pkg) packages.push(pkg);
  }
  return packages;
}

async function fetchGommoCreditPlans(accessToken: string): Promise<CreditPackage[]> {
  const body = new URLSearchParams({
    access_token: accessToken,
    domain: config.gommo.apiDomain,
    language: 'vi',
    ...gommoServerDeviceFields(),
  });

  const response = await fetch(CREDIT_PLANS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`credit_plans invalid JSON (HTTP ${response.status})`);
  }

  const packages = parsePlansPayload(raw);
  if (!packages.length) {
    throw new Error('credit_plans returned no known packages');
  }

  return packages;
}

/** List packages — live Gommo credit_plans with short TTL cache, static fallback. */
export async function listCreditPackages(): Promise<CreditPackage[]> {
  const now = Date.now();
  if (cachedPackages && now - cachedAt < CACHE_TTL_MS) {
    return cachedPackages;
  }

  const token = isGommoMerchantConfigured() ? config.gommo.accessToken : '';
  if (token) {
    try {
      const live = await fetchGommoCreditPlans(token);
      cachedPackages = live;
      cachedAt = now;
      return live;
    } catch (err) {
      console.warn(
        '[billing/packages] credit_plans fallback to static:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  return [...CREDIT_PACKAGES];
}

export async function resolveCreditPackage(packageId: string): Promise<CreditPackage | undefined> {
  const packages = await listCreditPackages();
  return packages.find((item) => item.id === packageId) ?? getStaticCreditPackage(packageId);
}

export function clearCreditPackagesCache(): void {
  cachedPackages = null;
  cachedAt = 0;
}
