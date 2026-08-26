import {
  getCachedEnglish,
  hashDescription,
  loadDescriptionCache,
  queueCacheUpdates,
  type DescriptionCacheEntry,
} from './catalogDescriptionCache.js';
import { isCatalogTranslateConfigured, translateDescriptionsBatch } from './catalogTranslate.js';
import { config } from '../config.js';
import { modelSlug, parseModelsList, type GommoEnvelope, type GommoModel } from '../types/gommo.js';

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

function applyEnglishToModel(m: GommoModel, en: string): void {
  (m as Record<string, unknown>).description_en = en;
}

/**
 * Merge file cache (+ optional live translate) into catalog models when lang=en.
 * Mutates models inside envelope in place.
 */
export async function enrichModelsCatalogLanguage(
  envelope: GommoEnvelope,
  lang: string | undefined,
): Promise<GommoEnvelope> {
  if (lang !== 'en') return envelope;

  const models = parseModelsList(envelope);
  if (!models.length) return envelope;

  const cache = await loadDescriptionCache();
  const pending: Array<{ slug: string; text: string }> = [];

  for (const m of models) {
    const slug = modelSlug(m);
    const vi = modelDescriptionVi(m);
    if (!slug) continue;

    if (!vi) continue;

    if (!looksVietnamese(vi)) {
      applyEnglishToModel(m, vi);
      continue;
    }

    const cached = getCachedEnglish(cache, slug, vi);
    if (cached) {
      applyEnglishToModel(m, cached);
      continue;
    }

    if (config.catalog.translateOnRequest && isCatalogTranslateConfigured()) {
      pending.push({ slug, text: vi });
    }
  }

  if (pending.length) {
    try {
      const translated = await translateDescriptionsBatch(pending);
      const updates: Record<string, DescriptionCacheEntry> = {};
      const now = new Date().toISOString();

      for (const item of pending) {
        const en = translated[item.slug];
        if (!en) continue;
        const model = models.find((m) => modelSlug(m) === item.slug);
        if (model) applyEnglishToModel(model, en);
        updates[item.slug] = {
          hash: hashDescription(item.text),
          en,
          updatedAt: now,
        };
      }

      if (Object.keys(updates).length) {
        await queueCacheUpdates(updates);
      }
    } catch (err) {
      console.warn('[catalog-lang] translate on request failed:', err);
    }
  }

  return envelope;
}

export { looksVietnamese, modelDescriptionVi };
