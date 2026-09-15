// Prefix absolute site paths in docs/th markdown with /th/ (skip /th/, /vi/, external).
// Run: node scripts/prefix-th-doc-links.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const thDocsRoot = path.join(repoRoot, 'docs', 'th');

const SKIP_PREFIX = /^(?:th\/|vi\/|gateway|health|api\/)/;

function prefixBarePath(bare) {
  const trimmed = bare.replace(/^\//, '');
  if (!trimmed || SKIP_PREFIX.test(trimmed)) return bare;
  if (/^https?:\/\//i.test(bare)) return bare;
  return `/th/${trimmed}`;
}

function transform(content) {
  let next = content;
  // Markdown links: ](/path)
  next = next.replace(/\]\(\/(?!th\/|vi\/)([^)\s#]*)\)/g, (_m, p) => `](${prefixBarePath(`/${p}`)})`);
  // Inline code paths: `/login/`
  next = next.replace(/`\/(?!th\/|vi\/)([^`]+)`/g, (_m, p) => `\`${prefixBarePath(`/${p}`)}\``);
  return next;
}

function walk(dir) {
  let count = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      count += walk(full);
      continue;
    }
    if (!name.endsWith('.md')) continue;
    const raw = fs.readFileSync(full, 'utf8');
    const out = transform(raw);
    if (out !== raw) {
      fs.writeFileSync(full, out, 'utf8');
      count++;
    }
  }
  return count;
}

const updated = walk(thDocsRoot);
console.log(`Updated ${updated} files under docs/th/`);
