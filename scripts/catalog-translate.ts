#!/usr/bin/env tsx
/**
 * Warm catalog description cache from live Gommo catalog.
 * Uses Gommo chat (GOMMO_ACCESS_TOKEN) — no OpenRouter key required.
 * Optional fallback: OPENROUTER_API_KEY / CATALOG_TRANSLATE_API_KEY.
 *
 * Usage:
 *   npm run catalog:translate          # EN → cache/catalog-descriptions.en.json
 *   npm run catalog:translate-th       # TH → cache/catalog-descriptions.th.json
 */
import 'dotenv/config';
import path from 'node:path';
import { config, isGommoMerchantConfigured } from '../src/config.js';
import { fetchModelsCatalog } from '../src/services/gommoClient.js';
import {
  descriptionCachePathForLocale,
  getCachedEnglish,
  getCachedLocaleText,
  hashDescription,
  loadDescriptionCache,
  loadDescriptionCacheForLocale,
  queueCacheUpdates,
  queueCacheUpdatesForLocale,
  type DescriptionCacheEntry,
} from '../src/services/catalogDescriptionCache.js';
import { looksVietnamese, modelDescriptionVi } from '../src/services/catalogLang.js';
import {
  isCatalogTranslateConfigured,
  translateDescriptionsBatch,
  type CatalogTranslateTarget,
} from '../src/services/catalogTranslate.js';
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

function parseTargetLocale(): CatalogTranslateTarget {
  const arg = process.argv.find((a) => a.startsWith('--lang='));
  const raw = arg?.split('=')[1]?.toLowerCase();
  return raw === 'th' ? 'th' : 'en';
}

async function main() {
  const target = parseTargetLocale();

  if (!isCatalogTranslateConfigured()) {
    console.error('Set GOMMO_ACCESS_TOKEN (+ GOMMO_API_DOMAIN) in .env');
    console.error('Optional fallback: OPENROUTER_API_KEY or CATALOG_TRANSLATE_API_KEY');
    process.exit(1);
  }

  const provider = isGommoMerchantConfigured() ? 'Gommo chat' : 'OpenRouter';
  const cacheFile = descriptionCachePathForLocale(target);
  console.log(`Translate provider: ${provider}`);
  console.log(`Target locale: ${target} → ${path.relative(process.cwd(), cacheFile)}`);

  const cache =
    target === 'th' ? await loadDescriptionCacheForLocale('th') : await loadDescriptionCache();
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

      if (target === 'en' && !looksVietnamese(vi)) {
        if (!getCachedEnglish(cache, slug, vi)) {
          cache[slug] = {
            hash: hashDescription(vi),
            en: vi,
            updatedAt: new Date().toISOString(),
          };
        }
        continue;
      }

      const cached =
        target === 'en'
          ? getCachedEnglish(cache, slug, vi)
          : getCachedLocaleText(cache, slug, vi, 'th');
      if (cached) continue;

      pending.push({ slug, text: vi });
    }
  }

  console.log(`Cache hits: ${seen.size - pending.length}, to translate: ${pending.length}`);

  if (!pending.length) {
    if (target === 'en') await queueCacheUpdates({});
    else await queueCacheUpdatesForLocale('th', {});
    console.log(`Done — cache file: ${path.relative(process.cwd(), cacheFile)}`);
    return;
  }

  const translated = await translateDescriptionsBatch(pending, target);
  const updates: Record<string, DescriptionCacheEntry> = {};
  const now = new Date().toISOString();
  let ok = 0;

  for (const item of pending) {
    const text = translated[item.slug];
    if (!text) {
      console.warn(`  skip (no translation): ${item.slug}`);
      continue;
    }
    updates[item.slug] = {
      hash: hashDescription(item.text),
      ...(target === 'en' ? { en: text } : { th: text }),
      updatedAt: now,
    };
    ok++;
  }

  Object.assign(cache, updates);
  if (target === 'en') await queueCacheUpdates(updates);
  else await queueCacheUpdatesForLocale('th', updates);

  console.log(`Translated ${ok}/${pending.length} → ${cacheFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
