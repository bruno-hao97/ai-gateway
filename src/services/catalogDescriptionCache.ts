import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export interface DescriptionCacheEntry {
  hash: string;
  en: string;
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
