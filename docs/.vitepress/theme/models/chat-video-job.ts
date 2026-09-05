import type { CatalogModel } from './catalog-api';
import type { CatalogJobFieldValues } from './catalog-job-fields';
import {
  createMediaJobWait,
  fetchMediaCatalogModels,
  filterModelsForPlaygroundTab,
  readLastMediaModelSlug,
  resolveMediaModel,
  writeLastMediaModelSlug,
  type MediaJobRef,
  type MediaJobResult,
} from './media-job';

export type VideoJobResult = MediaJobResult;

const VIDEO_MODEL_KEY = 'gw_portal_chat_video_model_v1';

export function readLastVideoModelSlug(): string {
  const legacy = (() => {
    try {
      return localStorage.getItem(VIDEO_MODEL_KEY)?.trim() || '';
    } catch {
      return '';
    }
  })();
  return legacy || readLastMediaModelSlug('video');
}

export function writeLastVideoModelSlug(slug: string) {
  try {
    localStorage.setItem(VIDEO_MODEL_KEY, slug.trim());
  } catch {
    /* ignore */
  }
  writeLastMediaModelSlug('video', slug);
}

export function resolveVideoModel(models: CatalogModel[], slug?: string): CatalogModel | null {
  return resolveMediaModel(models, slug);
}

export async function fetchVideoCatalogModels(): Promise<CatalogModel[]> {
  return filterModelsForPlaygroundTab(await fetchMediaCatalogModels('video'), 'video');
}

export async function createVideoJobWait(
  model: CatalogModel,
  prompt: string,
  fieldValues: CatalogJobFieldValues,
  signal?: AbortSignal,
  refs: MediaJobRef[] = [],
): Promise<MediaJobResult> {
  return createMediaJobWait(model, prompt, fieldValues, signal, refs);
}
