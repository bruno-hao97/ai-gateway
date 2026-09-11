/**
 * Verify playground Request tab skeleton on :5173
 * Usage: node scripts/verify-request-tab.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.DOCS_URL || 'http://localhost:5173';
const url = `${BASE}/portal/playground.html?embed=1`;

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({ headless: true });
}
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.click('[data-response-tab="request"]');
await page.waitForTimeout(1500);

const headers = await page.locator('#requestHeadersRows tr').count();
const body = await page.locator('#requestBodyRows tr').count();
const curl = (await page.locator('#requestCurl').textContent())?.trim() || '';
const endpoint = (await page.locator('#requestEndpoint').textContent())?.trim() || '';
const struct = (await page.locator('#requestResponseStructure').textContent())?.trim() || '';

await browser.close();

const ok =
  headers >= 2 &&
  body >= 3 &&
  curl.includes('curl -X POST') &&
  endpoint.includes('v2.api.gommo.net') &&
  struct.includes('success');

console.log(JSON.stringify({ ok, headers, body, curlLen: curl.length, endpoint, structLen: struct.length, errors }, null, 2));
process.exit(ok ? 0 : 1);
