/**
 * HTTP smoke for portal routes (requires docs dev server, e.g. npm run docs:stack).
 * Usage: npm run portal:smoke
 *        SMOKE_BASE_URL=http://127.0.0.1:5173 npm run portal:smoke
 */

const base = (process.env.SMOKE_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const apiBase = (process.env.SMOKE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

const docRoutes = [
  '/app/',
  '/app/credits/',
  '/app/chat/',
  '/app/activity/',
  '/app/token/',
  '/app/files/',
  '/app/byok/',
  '/app/observability/',
  '/app/profile/',
  '/app/playground/',
  '/app/playground/?worker=create-image',
  '/guides/portal-smoke',
  '/vi/app/',
  '/vi/app/playground/',
  '/vi/guides/portal-smoke',
];

async function checkStatus(url, label) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`${label} ${url} → HTTP ${res.status}`);
  }
  return res;
}

async function main() {
  console.log(`Portal smoke HTTP — docs ${base}, api ${apiBase}`);

  for (const path of docRoutes) {
    await checkStatus(`${base}${path}`, 'docs');
    console.log(`  OK ${path}`);
  }

  const health = await checkStatus(`${apiBase}/health`, 'api');
  console.log(`  OK /health (${health.status})`);

  const billing = await fetch(`${apiBase}/billing/status`);
  if (!billing.ok) {
    throw new Error(`/billing/status → HTTP ${billing.status}`);
  }
  console.log(`  OK /billing/status (${billing.status})`);

  console.log('Portal smoke HTTP passed.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
