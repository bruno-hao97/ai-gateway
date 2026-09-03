import { getStoredToken } from './auth-api';
import { apiBase } from './gateway-base';

export interface ChatModelOption {
  id: string;
  label: string;
  autoRouter: boolean;
  agentId: string;
  server: string;
  model: string;
  description?: string;
  displayModel: string;
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
  return { defaultId, models };
}

export function findChatModel(models: ChatModelOption[], modelId: string): ChatModelOption | null {
  return models.find((m) => m.id === modelId) ?? null;
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
