#!/usr/bin/env tsx
/**
 * Warm cache/catalog-descriptions.en.json from live Gommo catalog.
 * Uses Gommo chat (GOMMO_ACCESS_TOKEN) — no OpenRouter key required.
 * Optional fallback: OPENROUTER_API_KEY / CATALOG_TRANSLATE_API_KEY.
 *
 * Usage: npm run catalog:translate
 */
import 'dotenv/config';
import path from 'node:path';
import { config, isGommoMerchantConfigured } from '../src/config.js';
import { fetchModelsCatalog } from '../src/services/gommoClient.js';
import {
  getCachedEnglish,
  hashDescription,
  loadDescriptionCache,
  queueCacheUpdates,
  type DescriptionCacheEntry,
} from '../src/services/catalogDescriptionCache.js';
import { looksVietnamese, modelDescriptionVi } from '../src/services/catalogLang.js';
import { isCatalogTranslateConfigured, translateDescriptionsBatch } from '../src/services/catalogTranslate.js';
import { modelSlug, parseModelsList, type JobType } from '../src/types/gommo.js';

const JOB_TYPES: JobType[] = [
  'image',
  'video',
  'tts',
  'music',
  'avatar-lipsync',
  'image-upscale',
  'remove-bg',
  'video-upscale',
  'video-vfx',
  'video-subtitle',
  'video-cut',
];

async function main() {
  if (!isCatalogTranslateConfigured()) {
    console.error('Set GOMMO_ACCESS_TOKEN (+ GOMMO_API_DOMAIN) in .env');
    console.error('Optional fallback: OPENROUTER_API_KEY or CATALOG_TRANSLATE_API_KEY');
    process.exit(1);
  }

  const provider = isGommoMerchantConfigured() ? 'Gommo chat' : 'OpenRouter';
  console.log(`Translate provider: ${provider}`);

  const cache = await loadDescriptionCache();
  const pending: Array<{ slug: string; text: string }> = [];
  const seen = new Set<string>();

  for (const type of JOB_TYPES) {
    console.log(`Fetching ${type}…`);
    const envelope = await fetchModelsCatalog(type, config.gommo.apiDomain, null);
    for (const m of parseModelsList(envelope)) {
      const slug = modelSlug(m);
      const vi = modelDescriptionVi(m);
      if (!slug || !vi || seen.has(slug)) continue;
      seen.add(slug);

      if (!looksVietnamese(vi)) {
        cache[slug] = {
          hash: hashDescription(vi),
          en: vi,
          updatedAt: new Date().toISOString(),
        };
        continue;
      }

      if (getCachedEnglish(cache, slug, vi)) continue;
      pending.push({ slug, text: vi });
    }
  }

  console.log(`Cache hits: ${seen.size - pending.length}, to translate: ${pending.length}`);

  if (!pending.length) {
    await queueCacheUpdates({});
    console.log(`Done — cache file: ${path.relative(process.cwd(), config.catalog.descriptionCacheFile)}`);
    return;
  }

  const translated = await translateDescriptionsBatch(pending);
  const updates: Record<string, DescriptionCacheEntry> = {};
  const now = new Date().toISOString();
  let ok = 0;

  for (const item of pending) {
    const en = translated[item.slug];
    if (!en) {
      console.warn(`  skip (no translation): ${item.slug}`);
      continue;
    }
    updates[item.slug] = { hash: hashDescription(item.text), en, updatedAt: now };
    ok++;
  }

  Object.assign(cache, updates);
  await queueCacheUpdates(updates);

  console.log(`Translated ${ok}/${pending.length} → ${config.catalog.descriptionCacheFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
