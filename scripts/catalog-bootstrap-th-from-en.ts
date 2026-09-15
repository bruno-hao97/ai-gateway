#!/usr/bin/env tsx
/**
 * Bootstrap cache/catalog-descriptions.th.json from EN cache (EN → TH).
 * Use when catalog:translate-th (VI → TH) returns empty from Gommo chat.
 *
 * Usage: npm run catalog:bootstrap-th
 */
import 'dotenv/config';
import path from 'node:path';
import { config, isGommoMerchantConfigured } from '../src/config.js';
import {
  descriptionCachePathForLocale,
  loadDescriptionCache,
  loadDescriptionCacheForLocale,
  queueCacheUpdatesForLocale,
  type DescriptionCacheEntry,
} from '../src/services/catalogDescriptionCache.js';
import {
  isCatalogTranslateConfigured,
  translateEnglishDescriptionsBatch,
} from '../src/services/catalogTranslate.js';

async function main() {
  if (!isCatalogTranslateConfigured()) {
    console.error('Set GOMMO_ACCESS_TOKEN (+ GOMMO_API_DOMAIN) in .env');
    console.error('Optional fallback: OPENROUTER_API_KEY or CATALOG_TRANSLATE_API_KEY');
    process.exit(1);
  }

  const provider = isGommoMerchantConfigured() ? 'Gommo chat' : 'OpenRouter';
  const enCache = await loadDescriptionCache();
  const thCache = await loadDescriptionCacheForLocale('th');
  const pending: Array<{ slug: string; text: string; hash: string }> = [];

  for (const [slug, entry] of Object.entries(enCache)) {
    const en = entry.en?.trim();
    if (!en) continue;
    const thEntry = thCache[slug];
    if (thEntry?.th && thEntry.hash === entry.hash) continue;
    pending.push({ slug, text: en, hash: entry.hash });
  }

  console.log(`Translate provider: ${provider}`);
  console.log(`EN cache: ${Object.keys(enCache).length}, TH to bootstrap: ${pending.length}`);

  if (!pending.length) {
    console.log(`Done — ${path.relative(process.cwd(), descriptionCachePathForLocale('th'))}`);
    return;
  }

  const translated = await translateEnglishDescriptionsBatch(
    pending.map((p) => ({ slug: p.slug, text: p.text })),
  );
  const updates: Record<string, DescriptionCacheEntry> = {};
  const now = new Date().toISOString();
  let ok = 0;

  for (const item of pending) {
    const th = translated[item.slug];
    if (!th) {
      console.warn(`  skip (no translation): ${item.slug}`);
      continue;
    }
    updates[item.slug] = { hash: item.hash, th, updatedAt: now };
    ok++;
  }

  await queueCacheUpdatesForLocale('th', updates);
  console.log(`Bootstrapped ${ok}/${pending.length} → ${descriptionCachePathForLocale('th')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
