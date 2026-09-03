import { parseGatewayError } from './chat-api';
import { getStoredToken } from './auth-api';
import { apiBase } from './gateway-base';
import { fetchModelsForType, type CatalogModel } from './catalog-api';
import {
  buildImageJobFields,
  type CatalogJobFieldValues,
  writeImageFieldValues,
} from './catalog-job-fields';

const IMAGE_MODEL_KEY = 'gw_portal_chat_image_model_v1';

export interface ImageJobResult {
  resultUrl: string;
  coverUrl?: string | null;
  latencyMs: number;
  modelSlug: string;
  modelLabel: string;
  jobId?: string;
  credits?: number | null;
  fields: CatalogJobFieldValues;
}

export function readLastImageModelSlug(): string {
  try {
    return localStorage.getItem(IMAGE_MODEL_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function writeLastImageModelSlug(slug: string) {
  try {
    localStorage.setItem(IMAGE_MODEL_KEY, slug.trim());
  } catch {
    /* ignore */
  }
}

export function resolveImageModel(models: CatalogModel[], slug?: string): CatalogModel | null {
  const key = slug?.trim();
  if (key) {
    const found = models.find((m) => m.slug === key);
    if (found) return found;
  }
  const sorted = [...models].sort((a, b) => (a.credits ?? Infinity) - (b.credits ?? Infinity));
  return sorted[0] ?? null;
}

export async function fetchImageCatalogModels(): Promise<CatalogModel[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not signed in');
  return fetchModelsForType('image');
}

function extractResultUrl(payload: unknown): { resultUrl: string; coverUrl?: string | null; jobId?: string } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Empty image job response');
  }
  const root = payload as Record<string, unknown>;
  const data = root.data;
  const layers = [root, data && typeof data === 'object' ? (data as Record<string, unknown>) : null].filter(
    Boolean,
  ) as Record<string, unknown>[];

  for (const layer of layers) {
    const url =
      (typeof layer.resultUrl === 'string' && layer.resultUrl) ||
      (typeof layer.result_url === 'string' && layer.result_url) ||
      '';
    if (url) {
      const cover =
        (typeof layer.coverUrl === 'string' && layer.coverUrl) ||
        (typeof layer.cover_url === 'string' && layer.cover_url) ||
        null;
      const jobId =
        (typeof layer.idBase === 'string' && layer.idBase) ||
        (typeof layer.id_base === 'string' && layer.id_base) ||
        (typeof layer.providerJobId === 'string' && layer.providerJobId) ||
        undefined;
      return { resultUrl: url, coverUrl: cover, jobId };
    }
    const raw = layer.raw;
    if (raw && typeof raw === 'object') {
      const imageInfo = (raw as Record<string, unknown>).imageInfo;
      if (imageInfo && typeof imageInfo === 'object') {
        const info = imageInfo as Record<string, unknown>;
        const nested =
          (typeof info.result_url === 'string' && info.result_url) ||
          (typeof info.resultUrl === 'string' && info.resultUrl) ||
          '';
        if (nested) {
          return {
            resultUrl: nested,
            coverUrl:
              (typeof info.cover_url === 'string' && info.cover_url) ||
              (typeof info.coverUrl === 'string' && info.coverUrl) ||
              null,
            jobId: (typeof info.id_base === 'string' && info.id_base) || undefined,
          };
        }
      }
    }
  }

  const message =
    (typeof root.message === 'string' && root.message) ||
    (data && typeof data === 'object' && typeof (data as Record<string, unknown>).error === 'string'
      ? String((data as Record<string, unknown>).error)
      : '') ||
    'Image job failed';
  throw new Error(message);
}

export async function createImageJobWait(
  model: CatalogModel,
  prompt: string,
  fieldValues: CatalogJobFieldValues,
  signal?: AbortSignal,
): Promise<ImageJobResult> {
  const started = Date.now();
  const fields = buildImageJobFields(model, prompt, fieldValues);
  const res = await fetch(`${apiBase()}/gateway/jobs/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStoredToken()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal,
    body: JSON.stringify({
      modelSlug: model.slug,
      wait: true,
      fields,
    }),
  });

  const raw = await res.json().catch(async () => {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  });

  if (!res.ok) throw new Error(parseGatewayError(raw, res.status));
  if (raw && typeof raw === 'object' && (raw as Record<string, unknown>).success === false) {
    throw new Error(parseGatewayError(raw, res.status));
  }

  const parsed = extractResultUrl(raw);
  writeLastImageModelSlug(model.slug);
  writeImageFieldValues(model.slug, fieldValues);

  return {
    resultUrl: parsed.resultUrl,
    coverUrl: parsed.coverUrl,
    latencyMs: Date.now() - started,
    modelSlug: model.slug,
    modelLabel: model.name,
    jobId: parsed.jobId,
    credits: model.credits,
    fields: fieldValues,
  };
}
