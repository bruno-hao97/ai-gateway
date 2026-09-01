#!/usr/bin/env tsx
/**
 * Verify credit packages against 79ai credit_plans keys and optional live create_payment.
 *
 * Static (no secrets): npm run billing:verify
 * Live create (creates pending Gommo orders): set in .env
 *   BILLING_VERIFY_TOKEN=<user access_token>
 *   BILLING_VERIFY_USERNAME=<gommo username>
 */
import 'dotenv/config';
import { CREDIT_PACKAGES } from '../src/services/creditPackages.js';

const GATEWAY_URL = (process.env.BILLING_VERIFY_GATEWAY_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);

/** 79ai.net credit_plans capture (2026-08) — source of truth for keys and priceVND. */
const EXPECTED_79AI: Record<
  string,
  { gommoIdBase: string; amountVnd: number; credits: number; bonusPercent: number }
> = {
  'basic-member': {
    gommoIdBase: 'credit-basic',
    amountVnd: 50_000,
    credits: 50_000,
    bonusPercent: 0,
  },
  'vip-member': {
    gommoIdBase: 'credit-vip',
    amountVnd: 200_000,
    credits: 210_000,
    bonusPercent: 5,
  },
  'ultra-member': {
    gommoIdBase: 'credit-ultra',
    amountVnd: 1_000_000,
    credits: 1_100_000,
    bonusPercent: 10,
  },
  'infinity-member': {
    gommoIdBase: 'credit-infinity',
    amountVnd: 5_000_000,
    credits: 5_600_000,
    bonusPercent: 12,
  },
  'agency-pro': {
    gommoIdBase: 'credit-agency',
    amountVnd: 10_000_000,
    credits: 11_500_000,
    bonusPercent: 15,
  },
};

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function fetchGatewayPackages() {
  const res = await fetch(`${GATEWAY_URL}/billing/packages`);
  const body = (await res.json()) as { success?: boolean; data?: typeof CREDIT_PACKAGES };
  if (!res.ok || !body.success || !Array.isArray(body.data)) {
    fail(`GET /billing/packages HTTP ${res.status}`);
  }
  return body.data!;
}

function verifyStaticConfig(
  packages: Array<{
    id: string;
    gommoIdBase: string;
    amountVnd: number;
    credits: number;
    bonusPercent: number;
  }>,
) {
  const ids = Object.keys(EXPECTED_79AI);
  if (packages.length !== ids.length) {
    fail(`expected ${ids.length} packages, got ${packages.length}`);
  }

  for (const id of ids) {
    const pkg = packages.find((p) => p.id === id);
    const exp = EXPECTED_79AI[id];
    if (!pkg) fail(`missing package id=${id}`);
    if (pkg.gommoIdBase !== exp.gommoIdBase) {
      fail(`${id}: gommoIdBase ${pkg.gommoIdBase} !== ${exp.gommoIdBase}`);
    }
    if (pkg.amountVnd !== exp.amountVnd) {
      fail(`${id}: amountVnd ${pkg.amountVnd} !== ${exp.amountVnd}`);
    }
    if (pkg.credits !== exp.credits) {
      fail(`${id}: credits ${pkg.credits} !== ${exp.credits}`);
    }
    if (pkg.bonusPercent !== exp.bonusPercent) {
      fail(`${id}: bonusPercent ${pkg.bonusPercent} !== ${exp.bonusPercent}`);
    }
  }

  console.log(`OK static: ${packages.length} packages match 79ai credit_plans table`);
}

async function verifyCreatePayment(
  packages: Array<{ id: string; gommoIdBase: string; amountVnd: number }>,
) {
  const token = (process.env.BILLING_VERIFY_TOKEN || '').trim();
  const username = (process.env.BILLING_VERIFY_USERNAME || '').trim();
  if (!token || !username) {
    console.log(
      'SKIP live create_payment — set BILLING_VERIFY_TOKEN + BILLING_VERIFY_USERNAME in .env',
    );
    return;
  }

  console.log(`Live create_payment (${packages.length} packages, pending orders)…`);
  let ok = 0;
  for (const pkg of packages) {
    const res = await fetch(`${GATEWAY_URL}/billing/payment/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        packageId: pkg.id,
        invoiceBuyer: { type: 'consumer', name: 'Bán cho người tiêu dùng', email: '' },
      }),
    });
    const body = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: { orderCode?: string; amountVnd?: number; gommoIdBase?: string };
    };
    if (!res.ok || !body.success) {
      console.error(
        `FAIL ${pkg.id} (${pkg.gommoIdBase}): HTTP ${res.status} — ${body.message || 'unknown'}`,
      );
      continue;
    }
    const charge = body.data?.amountVnd;
    const expectedTotal = Math.round(pkg.amountVnd * 1.05);
    const chargeOk = charge === expectedTotal;
    console.log(
      `OK  ${pkg.id.padEnd(16)} order=${body.data?.orderCode} charge=${charge} ` +
        `(expected ${expectedTotal} incl. VAT${chargeOk ? '' : ' MISMATCH'})`,
    );
    if (chargeOk) ok += 1;
  }

  if (ok !== packages.length) {
    fail(`live create: ${ok}/${packages.length} passed charge check`);
  }
  console.log(`OK live: all ${packages.length} packages created payment`);
}

async function main() {
  console.log(`Gateway: ${GATEWAY_URL}`);
  const packages = await fetchGatewayPackages();
  verifyStaticConfig(packages);
  await verifyCreatePayment(packages);
  console.log('billing:verify done');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
