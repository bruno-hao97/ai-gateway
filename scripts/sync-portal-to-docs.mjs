import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'apps/docs-portal');
const dest = path.join(root, 'docs/public/portal');

if (!fs.existsSync(src)) {
  console.error(`Missing portal source: ${src}`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

const gatewayUrl = (process.env.VITE_GATEWAY_URL || '').trim().replace(/\/$/, '');
const configPath = path.join(dest, 'js/portal-config.js');
if (fs.existsSync(configPath)) {
  let config = fs.readFileSync(configPath, 'utf8');
  config = config.replace(
    /global\.__PORTAL_GATEWAY_URL__ = '';/,
    `global.__PORTAL_GATEWAY_URL__ = ${JSON.stringify(gatewayUrl)};`,
  );
  fs.writeFileSync(configPath, config);
  if (gatewayUrl) {
    console.log(`Portal gateway URL: ${gatewayUrl}`);
  }
}

console.log(`Synced ${path.relative(root, src)} → ${path.relative(root, dest)}`);
