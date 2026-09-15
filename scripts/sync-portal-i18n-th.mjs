#!/usr/bin/env node
/**
 * Merge MESSAGES.en into MESSAGES.th (keep existing TH strings).
 * Missing keys fall back to EN text so t() has explicit entries.
 *
 * Usage: node scripts/sync-portal-i18n-th.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'apps/docs-portal/js/portal-i18n.js');
const src = fs.readFileSync(file, 'utf8');

const sandbox = {
  globalThis: {},
  window: {},
  document: { documentElement: { lang: 'en' } },
};
sandbox.globalThis = sandbox.window;
sandbox.window.document = sandbox.document;
vm.runInNewContext(src, sandbox);
const { MESSAGES } = sandbox.window.PortalI18n;

const en = MESSAGES.en || {};
const existingTh = MESSAGES.th || {};
const merged = { ...en, ...existingTh };
const keys = Object.keys(merged).sort();

function escapeJsString(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n');
}

const lines = keys.map((key) => {
  const val = merged[key];
  if (typeof val !== 'string') return null;
  if (val.includes('\n') || val.length > 72) {
    return `      '${key}':\n        '${escapeJsString(val)}',`;
  }
  return `      '${key}': '${escapeJsString(val)}',`;
}).filter(Boolean);

const thBlock = `    th: {\n${lines.join('\n')}\n    },`;

const replaced = src.replace(/\n    th: \{[\s\S]*?\n    \},/, `\n${thBlock},`);
if (replaced === src) {
  console.error('Could not find MESSAGES.th block to replace');
  process.exit(1);
}

fs.writeFileSync(file, replaced);
console.log(`Synced MESSAGES.th: ${keys.length} keys (${Object.keys(existingTh).length} had TH overrides)`);
