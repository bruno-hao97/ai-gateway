import {
  getCachedEnglish,
  getCachedLocaleText,
  hashDescription,
  loadDescriptionCache,
  loadDescriptionCacheForLocale,
  queueCacheUpdates,
  queueCacheUpdatesForLocale,
  type DescriptionCacheEntry,
} from './catalogDescriptionCache.js';
import { isCatalogTranslateConfigured, translateDescriptionsBatch } from './catalogTranslate.js';
import { config } from '../config.js';
import { modelSlug, parseModelsList, type GommoEnvelope, type GommoModel } from '../types/gommo.js';
import type { SiteLocale } from './gommoLanguage.js';

const VI_DIACRITICS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

function looksVietnamese(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (VI_DIACRITICS.test(t)) return true;
  return /\b(chuyên|cho|các|tác vụ|tạo|thế hệ|hỗ trợ|model là|bước tiến)\b/i.test(t);
}

function modelDescriptionVi(m: GommoModel): string {
  return String(m.description || (m as Record<string, unknown>).desc || '').trim();
}

function applyLocaleDescription(m: GommoModel, locale: 'en' | 'th', text: string): void {
  const key = locale === 'en' ? 'description_en' : 'description_th';
  (m as Record<string, unknown>)[key] = text;
}

/**
 * Merge file cache (+ optional live translate for EN) into catalog models when lang=en|th.
 * Mutates models inside envelope in place.
 */
export async function enrichModelsCatalogLanguage(
  envelope: GommoEnvelope,
  lang: SiteLocale | undefined,
): Promise<GommoEnvelope> {
  if (lang !== 'en' && lang !== 'th') return envelope;

  const models = parseModelsList(envelope);
  if (!models.length) return envelope;

  const cache =
    lang === 'th' ? await loadDescriptionCacheForLocale('th') : await loadDescriptionCache();
  const pending: Array<{ slug: string; text: string }> = [];

  for (const m of models) {
    const slug = modelSlug(m);
    const vi = modelDescriptionVi(m);
    if (!slug) continue;

    if (!vi) continue;

    if (lang === 'en' && !looksVietnamese(vi)) {
      applyLocaleDescription(m, 'en', vi);
      continue;
    }

    const cached =
      lang === 'en'
        ? getCachedEnglish(cache, slug, vi)
        : getCachedLocaleText(cache, slug, vi, 'th');
    if (cached) {
      applyLocaleDescription(m, lang, cached);
      continue;
    }

    if (
      (lang === 'en' || lang === 'th') &&
      config.catalog.translateOnRequest &&
      isCatalogTranslateConfigured()
    ) {
      pending.push({ slug, text: vi });
    }
  }

  if (pending.length) {
    try {
      const translated = await translateDescriptionsBatch(pending, lang);
      const updates: Record<string, DescriptionCacheEntry> = {};
      const now = new Date().toISOString();

      for (const item of pending) {
        const text = translated[item.slug];
        if (!text) continue;
        const model = models.find((m) => modelSlug(m) === item.slug);
        if (model) applyLocaleDescription(model, lang, text);
        updates[item.slug] = {
          hash: hashDescription(item.text),
          ...(lang === 'en' ? { en: text } : { th: text }),
          updatedAt: now,
        };
      }

      if (Object.keys(updates).length) {
        if (lang === 'en') await queueCacheUpdates(updates);
        else await queueCacheUpdatesForLocale('th', updates);
      }
    } catch (err) {
      console.warn('[catalog-lang] translate on request failed:', err);
    }
  }

  return envelope;
}

export { looksVietnamese, modelDescriptionVi };
