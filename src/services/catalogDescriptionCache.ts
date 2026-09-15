import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export interface DescriptionCacheEntry {
  hash: string;
  en?: string;
  th?: string;
  updatedAt: string;
}

export type DescriptionCache = Record<string, DescriptionCacheEntry>;

export function hashDescription(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex').slice(0, 16);
}

let memoryCache: DescriptionCache | null = null;
let saveChain: Promise<void> = Promise.resolve();

export async function loadDescriptionCache(): Promise<DescriptionCache> {
  if (memoryCache) return memoryCache;
  const filePath = config.catalog.descriptionCacheFile;
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    memoryCache = JSON.parse(raw) as DescriptionCache;
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

export async function saveDescriptionCache(cache: DescriptionCache): Promise<void> {
  memoryCache = cache;
  const filePath = config.catalog.descriptionCacheFile;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

/** Serialize cache writes (parallel /gateway/models?lang=en). */
export function queueCacheUpdates(entries: Record<string, DescriptionCacheEntry>): Promise<void> {
  saveChain = saveChain.then(async () => {
    const cache = await loadDescriptionCache();
    Object.assign(cache, entries);
    await saveDescriptionCache(cache);
  });
  return saveChain;
}

export function getCachedEnglish(
  cache: DescriptionCache,
  slug: string,
  sourceText: string,
): string | null {
  const entry = cache[slug];
  if (!entry?.en) return null;
  if (entry.hash !== hashDescription(sourceText)) return null;
  return entry.en;
}

const localeMemoryCaches: Record<string, DescriptionCache> = {};

export function descriptionCachePathForLocale(locale: 'en' | 'th'): string {
  if (locale === 'th') return config.catalog.descriptionCacheThFile;
  return config.catalog.descriptionCacheFile;
}

export async function loadDescriptionCacheForLocale(locale: 'en' | 'th'): Promise<DescriptionCache> {
  const filePath = descriptionCachePathForLocale(locale);
  if (localeMemoryCaches[filePath]) return localeMemoryCaches[filePath];
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    localeMemoryCaches[filePath] = JSON.parse(raw) as DescriptionCache;
  } catch {
    localeMemoryCaches[filePath] = {};
  }
  return localeMemoryCaches[filePath];
}

export function getCachedLocaleText(
  cache: DescriptionCache,
  slug: string,
  sourceText: string,
  locale: 'en' | 'th',
): string | null {
  const entry = cache[slug];
  const text = locale === 'th' ? (entry as { th?: string })?.th : entry?.en;
  if (!text) return null;
  if (entry.hash !== hashDescription(sourceText)) return null;
  return text;
}

export async function saveDescriptionCacheForLocale(
  locale: 'en' | 'th',
  cache: DescriptionCache,
): Promise<void> {
  const filePath = descriptionCachePathForLocale(locale);
  localeMemoryCaches[filePath] = cache;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

/** Serialize locale cache writes (parallel /gateway/models?lang=th). */
export function queueCacheUpdatesForLocale(
  locale: 'en' | 'th',
  entries: Record<string, DescriptionCacheEntry>,
): Promise<void> {
  const filePath = descriptionCachePathForLocale(locale);
  let chain = localeSaveChains[filePath] ?? Promise.resolve();
  chain = chain.then(async () => {
    const cache = await loadDescriptionCacheForLocale(locale);
    Object.assign(cache, entries);
    await saveDescriptionCacheForLocale(locale, cache);
  });
  localeSaveChains[filePath] = chain;
  return chain;
}

const localeSaveChains: Record<string, Promise<void>> = {};
