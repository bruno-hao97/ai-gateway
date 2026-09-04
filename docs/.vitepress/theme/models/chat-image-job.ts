import type { CatalogModel } from './catalog-api';
import type { CatalogJobFieldValues } from './catalog-job-fields';
import {
  createMediaJobWait,
  fetchMediaCatalogModels,
  filterModelsForPlaygroundTab,
  readLastMediaModelSlug,
  resolveMediaModel,
  writeLastMediaModelSlug,
  type MediaJobResult,
} from './media-job';

export type ImageJobResult = MediaJobResult;

const IMAGE_MODEL_KEY = 'gw_portal_chat_image_model_v1';

export function readLastImageModelSlug(): string {
  const legacy = (() => {
    try {
      return localStorage.getItem(IMAGE_MODEL_KEY)?.trim() || '';
    } catch {
      return '';
    }
  })();
  return legacy || readLastMediaModelSlug('image');
}

export function writeLastImageModelSlug(slug: string) {
  try {
    localStorage.setItem(IMAGE_MODEL_KEY, slug.trim());
  } catch {
    /* ignore */
  }
  writeLastMediaModelSlug('image', slug);
}

export function resolveImageModel(models: CatalogModel[], slug?: string): CatalogModel | null {
  return resolveMediaModel(models, slug);
}

export async function fetchImageCatalogModels(): Promise<CatalogModel[]> {
  return filterModelsForPlaygroundTab(await fetchMediaCatalogModels('image'), 'image');
}

export async function createImageJobWait(
  model: CatalogModel,
  prompt: string,
  fieldValues: CatalogJobFieldValues,
  signal?: AbortSignal,
): Promise<MediaJobResult> {
  return createMediaJobWait(model, prompt, fieldValues, signal);
}
