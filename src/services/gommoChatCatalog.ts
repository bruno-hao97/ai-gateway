import { config } from '../config.js';
import type { ChatModelEntry } from './chatModels.js';

const CHAT_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}/api/v2/chat`;

const CACHE_TTL_MS = Number(process.env.GOMMO_CHAT_MODELS_TTL_MS) || 5 * 60 * 1000;

interface UpstreamSubModel {
  name?: string;
  description?: string;
  status?: string;
  server?: string;
  body_type?: string;
  id?: string;
  category?: string[];
  reasoning?: boolean;
  input?: string[];
  price_credit?: number;
  capabilities?: { web_search?: boolean; web_fetch?: boolean };
  tools?: string[];
}

interface UpstreamModel {
  model: string;
  name?: string;
  description?: string;
  status?: string;
  server?: string;
  body_type?: string;
  sub_models?: Record<string, UpstreamSubModel>;
  category?: string[];
  reasoning?: boolean;
  input?: string[];
  price_credit?: number;
  capabilities?: { web_search?: boolean; web_fetch?: boolean };
  tools?: string[];
}

interface ModelMetaSource {
  category?: string[];
  reasoning?: boolean;
  input?: string[];
  price_credit?: number;
  capabilities?: { web_search?: boolean; web_fetch?: boolean };
  tools?: string[];
}

function extractModelMeta(source: ModelMetaSource): Pick<
  ChatModelEntry,
  'categories' | 'reasoning' | 'inputs' | 'priceCredit' | 'webSearch' | 'webFetch'
> {
  const caps = source.capabilities;
  const tools = Array.isArray(source.tools) ? source.tools : [];
  return {
    categories: Array.isArray(source.category) ? [...source.category] : undefined,
    reasoning: source.reasoning === true,
    inputs: Array.isArray(source.input) ? [...source.input] : undefined,
    priceCredit:
      typeof source.price_credit === 'number' && !Number.isNaN(source.price_credit)
        ? source.price_credit
        : undefined,
    webSearch: caps?.web_search === true || tools.includes('web_search'),
    webFetch: caps?.web_fetch === true || tools.includes('web_fetch'),
  };
}

interface CatalogCacheEntry {
  expiresAt: number;
  models: ChatModelEntry[];
}

const catalogCache = new Map<string, CatalogCacheEntry>();

function slugId(model: string, server: string): string {
  const safeModel = model.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${safeModel}--${server}`;
}

function isActiveStatus(status?: string): boolean {
  if (!status) return true;
  return status === 'active';
}

function pickAgent(server: string): { agentId: string; projectId: string } {
  if (server === 'cursorai') {
    return {
      agentId: config.gommo.chatWorkflowAgentId,
      projectId: config.gommo.chatWorkflowProjectId,
    };
  }
  return {
    agentId: config.gommo.chatAgentId,
    projectId: config.gommo.chatProjectId,
  };
}

function pickChatApiMode(bodyType?: string, server?: string): 'agent' | 'stream' {
  if (server === 'cursorai') return 'stream';
  if (bodyType === 'chat_completions') return 'stream';
  return 'agent';
}

function entryFromParts(
  model: string,
  server: string,
  label: string,
  description?: string,
  bodyType?: string,
  meta?: ModelMetaSource,
): ChatModelEntry {
  const { agentId, projectId } = pickAgent(server);
  return {
    id: slugId(model, server),
    label,
    agentId,
    server,
    model,
    description,
    projectId,
    chatApiMode: pickChatApiMode(bodyType, server),
    upstream: true,
    ...extractModelMeta(meta ?? {}),
  };
}

export function parseUpstreamChatModels(data: unknown): ChatModelEntry[] {
  if (!Array.isArray(data)) return [];

  const out: ChatModelEntry[] = [];
  const seen = new Set<string>();

  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as UpstreamModel;
    const baseModel = String(item.model || '').trim();
    if (!baseModel) continue;

    const parentActive = isActiveStatus(item.status);
    const subModels = item.sub_models && typeof item.sub_models === 'object' ? item.sub_models : null;

    if (parentActive && item.server) {
      const id = slugId(baseModel, item.server);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(
          entryFromParts(
            baseModel,
            item.server,
            String(item.name || baseModel).trim(),
            typeof item.description === 'string' ? item.description.trim() : undefined,
            item.body_type,
            item,
          ),
        );
      }
    }

    if (!subModels) continue;

    for (const [subKey, sub] of Object.entries(subModels)) {
      if (!sub || typeof sub !== 'object') continue;
      if (!isActiveStatus(sub.status)) continue;
      const server = String(sub.server || subKey).trim();
      if (!server) continue;
      const model = `${baseModel}::${subKey}`;
      const id = slugId(model, server);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(
        entryFromParts(
          model,
          server,
          String(sub.name || `${item.name || baseModel} (${subKey})`).trim(),
          typeof sub.description === 'string' ? sub.description.trim() : item.description,
          sub.body_type || item.body_type,
          { ...item, ...sub },
        ),
      );
    }
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchUpstreamChatModels(
  accessToken: string,
  domain: string,
  signal?: AbortSignal,
): Promise<ChatModelEntry[]> {
  const cacheKey = domain.trim() || config.gommo.apiDomain;
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.models;
  }

  const form = new URLSearchParams();
  form.set('action', 'models');
  form.set('access_token', accessToken);
  form.set('domain', cacheKey);
  form.set('language', 'VI');

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'accept-encoding': 'identity',
    },
    body: form.toString(),
    signal,
  });

  const text = await res.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text || `Upstream models HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(
      (typeof parsed.message === 'string' && parsed.message) || `Upstream models HTTP ${res.status}`,
    );
  }

  if (parsed.error !== undefined && parsed.error !== 0 && parsed.error !== false) {
    throw new Error(
      (typeof parsed.message === 'string' && parsed.message) || 'Upstream models error',
    );
  }

  const models = parseUpstreamChatModels(parsed.data);
  catalogCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, models });
  return models;
}

export function clearChatModelsCache(): void {
  catalogCache.clear();
}
