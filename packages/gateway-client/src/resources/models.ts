import { requestJson } from '../http.js';
import type { HttpContext } from '../http.js';
import { ensureAccessToken } from '../http.js';
import type { GatewayEnvelope, GommoModel, JobType, ListModelsParams } from '../types.js';

export class ModelsResource {
  constructor(private readonly ctx: HttpContext) {}

  /** GET /gateway/models?type= */
  async list(params: ListModelsParams): Promise<GatewayEnvelope<GommoModel[]>> {
    ensureAccessToken(this.ctx);
    const type = encodeURIComponent(params.type);
    return requestJson(this.ctx, `/gateway/models?type=${type}`);
  }
}

export function parseModelsList(envelope: GatewayEnvelope): GommoModel[] {
  const data = envelope.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { models?: GommoModel[] }).models)) {
    return (data as { models: GommoModel[] }).models;
  }
  if (data && Array.isArray((data as { items?: GommoModel[] }).items)) {
    return (data as { items: GommoModel[] }).items;
  }
  return [];
}

export function modelSlug(model: GommoModel): string {
  return model.model || model.slug || model.model_id || model.id || model.id_base || '';
}

export function pickFirstRatio(model: GommoModel): string | undefined {
  const ratios = model.ratios;
  if (!Array.isArray(ratios) || ratios.length === 0) return undefined;
  const first = ratios[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    const obj = first as Record<string, unknown>;
    const value = obj.value ?? obj.ratio ?? obj.id ?? obj.name;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export type { JobType };
