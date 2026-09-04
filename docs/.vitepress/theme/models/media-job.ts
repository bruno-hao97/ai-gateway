import { parseGatewayError } from './chat-api';
import { getStoredToken } from './auth-api';
import { apiBase } from './gateway-base';
import { fetchModelsForType, type CatalogModel, type JobTypeId } from './catalog-api';
import {
  buildImageJobFields,
  type CatalogJobFieldValues,
  writeImageFieldValues,
} from './catalog-job-fields';

export type PlaygroundMediaType = 'image' | 'video';

const MODEL_KEY_PREFIX = 'gw_portal_pg_model_';

/** Playground tab + job endpoint — catalog query type can mislabel video models (e.g. duration on image list). */
export function resolveMediaJobType(model: CatalogModel): PlaygroundMediaType {
  if (model.durations.length > 0) return 'video';
  if (
    model.jobType === 'video' ||
    model.jobType.startsWith('video-') ||
    model.jobType === 'avatar-lipsync'
  ) {
    return 'video';
  }
  return 'image';
}

export function filterModelsForPlaygroundTab(
  models: CatalogModel[],
  tab: PlaygroundMediaType,
): CatalogModel[] {
  return models.filter((m) => resolveMediaJobType(m) === tab);
}

export interface MediaJobResult {
  resultUrl: string;
  coverUrl?: string | null;
  latencyMs: number;
  modelSlug: string;
  modelLabel: string;
  jobType: PlaygroundMediaType;
  jobId?: string;
  credits?: number | null;
  fields: CatalogJobFieldValues;
}

function modelStorageKey(type: PlaygroundMediaType): string {
  return `${MODEL_KEY_PREFIX}${type}`;
}

export function readLastMediaModelSlug(type: PlaygroundMediaType): string {
  try {
    return localStorage.getItem(modelStorageKey(type))?.trim() || '';
  } catch {
    return '';
  }
}

export function writeLastMediaModelSlug(type: PlaygroundMediaType, slug: string) {
  try {
    localStorage.setItem(modelStorageKey(type), slug.trim());
  } catch {
    /* ignore */
  }
}

export function resolveMediaModel(models: CatalogModel[], slug?: string): CatalogModel | null {
  const key = slug?.trim();
  if (key) {
    const found = models.find((m) => m.slug === key);
    if (found) return found;
  }
  const sorted = [...models].sort((a, b) => (a.credits ?? Infinity) - (b.credits ?? Infinity));
  return sorted[0] ?? null;
}

export async function fetchMediaCatalogModels(type: PlaygroundMediaType): Promise<CatalogModel[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not signed in');
  return fetchModelsForType(type as JobTypeId);
}

function extractResultUrl(payload: unknown): { resultUrl: string; coverUrl?: string | null; jobId?: string } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Empty job response');
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
      const r = raw as Record<string, unknown>;
      for (const key of ['imageInfo', 'videoInfo']) {
        const info = r[key];
        if (!info || typeof info !== 'object') continue;
        const nested =
          (typeof (info as Record<string, unknown>).result_url === 'string' &&
            (info as Record<string, unknown>).result_url) ||
          (typeof (info as Record<string, unknown>).resultUrl === 'string' &&
            (info as Record<string, unknown>).resultUrl) ||
          '';
        if (nested) {
          return {
            resultUrl: String(nested),
            coverUrl:
              (typeof (info as Record<string, unknown>).cover_url === 'string' &&
                (info as Record<string, unknown>).cover_url) ||
              (typeof (info as Record<string, unknown>).coverUrl === 'string' &&
                (info as Record<string, unknown>).coverUrl) ||
              null,
            jobId:
              (typeof (info as Record<string, unknown>).id_base === 'string' &&
                (info as Record<string, unknown>).id_base) ||
              undefined,
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
    'Job failed';
  throw new Error(message);
}

export async function createMediaJobWait(
  model: CatalogModel,
  prompt: string,
  fieldValues: CatalogJobFieldValues,
  signal?: AbortSignal,
): Promise<MediaJobResult> {
  const started = Date.now();
  const jobType = resolveMediaJobType(model);
  const fields = buildImageJobFields(model, prompt, fieldValues);
  const res = await fetch(`${apiBase()}/gateway/jobs/${jobType}`, {
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
  writeLastMediaModelSlug(jobType, model.slug);
  writeImageFieldValues(model.slug, fieldValues);

  return {
    resultUrl: parsed.resultUrl,
    coverUrl: parsed.coverUrl,
    latencyMs: Date.now() - started,
    modelSlug: model.slug,
    modelLabel: model.name,
    jobType,
    jobId: parsed.jobId,
    credits: model.credits,
    fields: fieldValues,
  };
}
