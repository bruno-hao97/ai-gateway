import { getStoredToken } from './auth-api';
import { apiBase } from './gateway-base';
import { listChatSessions, touchChatSession } from './chat-storage';

export interface ChatModelOption {
  id: string;
  label: string;
  autoRouter: boolean;
  agentId: string;
  server: string;
  model: string;
  projectId?: string;
  description?: string;
  displayModel: string;
  chatApiMode?: 'agent' | 'stream';
  priceCredit?: number;
  categories?: string[];
  reasoning?: boolean;
  inputs?: string[];
  webSearch?: boolean;
  webFetch?: boolean;
}

const LAST_MODEL_KEY = 'gw_portal_chat_last_model_v1';

export function readLastChatModelId(): string {
  try {
    return localStorage.getItem(LAST_MODEL_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function writeLastChatModelId(modelId: string) {
  try {
    localStorage.setItem(LAST_MODEL_KEY, modelId);
  } catch {
    /* ignore */
  }
}

export async function fetchChatModels(): Promise<{
  defaultId: string;
  models: ChatModelOption[];
  source?: string;
}> {
  const base = apiBase();
  const token = getStoredToken();
  const res = await fetch(`${base}/gateway/chat-models`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      payload && typeof payload === 'object' && typeof payload.message === 'string'
        ? payload.message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const data =
    payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : {};
  const models = Array.isArray(data.models) ? (data.models as ChatModelOption[]) : [];
  const defaultId = typeof data.defaultId === 'string' ? data.defaultId : models[0]?.id || 'auto-router';
  const source = typeof data.source === 'string' ? data.source : undefined;
  return { defaultId, models, source };
}

export function findChatModel(models: ChatModelOption[], modelId: string): ChatModelOption | null {
  return models.find((m) => m.id === modelId) ?? null;
}

export function resolveValidModelId(
  modelId: string | undefined,
  models: ChatModelOption[],
  defaultId: string,
): string {
  const id = String(modelId || '').trim();
  if (id && findChatModel(models, id)) return id;
  if (findChatModel(models, defaultId)) return defaultId;
  return models[0]?.id || 'auto-router';
}

export function repairStaleModelIds(models: ChatModelOption[], defaultId: string): number {
  let fixed = 0;
  for (const session of listChatSessions()) {
    if (!session.modelId) continue;
    if (findChatModel(models, session.modelId)) continue;
    touchChatSession(session.id, { modelId: resolveValidModelId(undefined, models, defaultId) });
    fixed += 1;
  }
  const last = readLastChatModelId();
  if (last && !findChatModel(models, last)) {
    writeLastChatModelId(resolveValidModelId(undefined, models, defaultId));
  }
  return fixed;
}

export function modelPickerLabel(model: ChatModelOption | null, isVi: boolean): string {
  if (!model) return isVi ? 'Chọn model' : 'Select model';
  return model.label;
}

export function modelSubtitle(model: ChatModelOption | null): string {
  if (!model) return '';
  if (model.autoRouter) return model.displayModel;
  return model.displayModel || `${model.model} · ${model.server}`;
}

export function formatPriceCredit(credits: number | undefined, isVi: boolean): string {
  if (credits === undefined || Number.isNaN(credits)) return '';
  if (credits >= 1_000_000) {
    const m = credits / 1_000_000;
    return isVi ? `~${m.toFixed(1)}M cr/out` : `~${m.toFixed(1)}M cr/out`;
  }
  if (credits >= 1_000) {
    const k = credits / 1_000;
    return isVi ? `~${k.toFixed(0)}k cr/out` : `~${k.toFixed(0)}k cr/out`;
  }
  return isVi ? `~${Math.round(credits)} cr/out` : `~${Math.round(credits)} cr/out`;
}

export function categoryLabel(category: string, isVi: boolean): string {
  const map: Record<string, [string, string]> = {
    for_coding: ['Code', 'Code'],
    fast: ['Nhanh', 'Fast'],
    reasoning: ['Suy luận', 'Reasoning'],
  };
  const pair = map[category];
  return pair ? (isVi ? pair[0] : pair[1]) : category.replace(/_/g, ' ');
}

export function modelCapabilityBadges(model: ChatModelOption, isVi: boolean): string[] {
  const badges: string[] = [];
  if (model.reasoning) badges.push(isVi ? 'Suy luận' : 'Reasoning');
  if (model.webSearch) badges.push('Web');
  if (model.inputs?.includes('image')) badges.push(isVi ? 'Ảnh' : 'Vision');
  if (model.inputs?.includes('file')) badges.push('File');
  const price = formatPriceCredit(model.priceCredit, isVi);
  if (price) badges.push(price);
  return badges;
}

export function formatReplyMeta(
  meta: { latencyMs?: number; totalTokens?: number } | undefined,
  isVi: boolean,
): string {
  if (!meta) return '';
  const parts: string[] = [];
  if (typeof meta.totalTokens === 'number' && meta.totalTokens > 0) {
    parts.push(`${meta.totalTokens} tok`);
  }
  if (typeof meta.latencyMs === 'number' && meta.latencyMs > 0) {
    const sec = meta.latencyMs / 1000;
    parts.push(sec >= 10 ? `${sec.toFixed(0)}s` : `${sec.toFixed(1)}s`);
  }
  return parts.join(' · ');
}
