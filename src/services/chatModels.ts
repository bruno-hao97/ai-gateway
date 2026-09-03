import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { fetchUpstreamChatModels } from './gommoChatCatalog.js';

export interface ChatModelEntry {
  id: string;
  label: string;
  autoRouter?: boolean;
  agentId?: string;
  server?: string;
  model?: string;
  projectId?: string;
  description?: string;
  chatApiMode?: 'agent' | 'stream';
  upstream?: boolean;
  hidden?: boolean;
  priceCredit?: number;
  categories?: string[];
  reasoning?: boolean;
  inputs?: string[];
  webSearch?: boolean;
  webFetch?: boolean;
}

export interface ResolvedChatModel {
  id: string;
  label: string;
  autoRouter: boolean;
  agentId: string;
  server: string;
  model: string;
  projectId: string;
  description?: string;
  chatApiMode: 'agent' | 'stream';
}

interface ChatModelsFile {
  defaultId?: string;
  upstream?: boolean;
  models?: ChatModelEntry[];
}

const AUTO_ROUTER_ENTRY: ChatModelEntry = {
  id: 'auto-router',
  label: 'Auto Router',
  autoRouter: true,
  description: 'Gateway default — same as env GOMMO_CHAT_*',
  chatApiMode: 'agent',
};

const FALLBACK_MODELS: ChatModelEntry[] = [
  AUTO_ROUTER_ENTRY,
  {
    id: 'moon-chat',
    label: 'Moon Chat',
    agentId: config.gommo.chatAgentId,
    server: config.gommo.chatServer,
    model: config.gommo.chatModel,
    projectId: config.gommo.chatProjectId,
    description: 'Default Gommo text agent',
    chatApiMode: 'agent',
  },
];

function catalogFilePath(): string {
  const fromEnv = (process.env.GOMMO_CHAT_MODELS_FILE || '').trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  return path.join(process.cwd(), 'data', 'chat-models.json');
}

function readCatalogFile(): ChatModelsFile | null {
  const filePath = catalogFilePath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ChatModelsFile;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeEntry(entry: ChatModelEntry): ChatModelEntry | null {
  const id = String(entry.id || '').trim();
  const label = String(entry.label || '').trim();
  if (!id || !label) return null;
  return {
    id,
    label,
    autoRouter: entry.autoRouter === true,
    agentId: typeof entry.agentId === 'string' ? entry.agentId.trim() : undefined,
    server: typeof entry.server === 'string' ? entry.server.trim() : undefined,
    model: typeof entry.model === 'string' ? entry.model.trim() : undefined,
    projectId: typeof entry.projectId === 'string' ? entry.projectId.trim() : undefined,
    description: typeof entry.description === 'string' ? entry.description.trim() : undefined,
    chatApiMode: entry.chatApiMode === 'stream' ? 'stream' : entry.chatApiMode === 'agent' ? 'agent' : undefined,
    upstream: entry.upstream === true,
    hidden: entry.hidden === true,
    priceCredit: typeof entry.priceCredit === 'number' ? entry.priceCredit : undefined,
    categories: Array.isArray(entry.categories) ? entry.categories : undefined,
    reasoning: entry.reasoning === true,
    inputs: Array.isArray(entry.inputs) ? entry.inputs : undefined,
    webSearch: entry.webSearch === true,
    webFetch: entry.webFetch === true,
  };
}

function mergeCatalogEntries(...groups: ChatModelEntry[][]): ChatModelEntry[] {
  const map = new Map<string, ChatModelEntry>();
  for (const group of groups) {
    for (const item of group) {
      const normalized = normalizeEntry(item);
      if (!normalized || normalized.hidden) {
        if (normalized?.hidden) map.delete(normalized.id);
        continue;
      }
      map.set(normalized.id, { ...map.get(normalized.id), ...normalized });
    }
  }
  const autoRouter = map.get('auto-router') ?? AUTO_ROUTER_ENTRY;
  map.delete('auto-router');
  const rest = [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  return [autoRouter, ...rest];
}

export function listFallbackModelEntries(): ChatModelEntry[] {
  const fromFile = readCatalogFile();
  if (fromFile?.models?.length) {
    return mergeCatalogEntries(FALLBACK_MODELS, fromFile.models);
  }
  return FALLBACK_MODELS;
}

export async function listChatModelEntries(
  accessToken?: string,
  domain?: string,
): Promise<{ models: ChatModelEntry[]; source: 'upstream' | 'fallback' }> {
  const fromFile = readCatalogFile();
  const fileModels = fromFile?.models?.length
    ? fromFile.models.map((m) => normalizeEntry(m)).filter((m): m is ChatModelEntry => Boolean(m))
    : [];

  const useUpstream = fromFile?.upstream !== false;
  if (useUpstream && accessToken?.trim()) {
    try {
      const upstream = await fetchUpstreamChatModels(
        accessToken.trim(),
        (domain || config.gommo.apiDomain).trim(),
      );
      if (upstream.length) {
        return {
          models: mergeCatalogEntries([AUTO_ROUTER_ENTRY], upstream, fileModels),
          source: 'upstream',
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (fileModels.length) {
    return {
      models: mergeCatalogEntries(FALLBACK_MODELS, fileModels),
      source: 'fallback',
    };
  }

  return { models: listFallbackModelEntries(), source: 'fallback' };
}

export function defaultChatModelId(entries: ChatModelEntry[]): string {
  const fromFile = readCatalogFile();
  const candidate = String(fromFile?.defaultId || 'auto-router').trim();
  if (entries.some((m) => m.id === candidate)) return candidate;
  return entries[0]?.id || 'auto-router';
}

export function resolveChatModel(modelId: string | undefined, entries: ChatModelEntry[]): ResolvedChatModel {
  const fallbackId = defaultChatModelId(entries);
  const id = String(modelId || fallbackId).trim() || fallbackId;
  const entry = entries.find((m) => m.id === id) ?? entries[0];
  if (!entry) {
    return {
      id: 'auto-router',
      label: 'Auto Router',
      autoRouter: true,
      agentId: config.gommo.chatAgentId,
      server: config.gommo.chatServer,
      model: config.gommo.chatModel,
      projectId: config.gommo.chatProjectId,
      chatApiMode: 'agent',
    };
  }

  if (entry.autoRouter) {
    return {
      id: entry.id,
      label: entry.label,
      autoRouter: true,
      agentId: config.gommo.chatAgentId,
      server: config.gommo.chatServer,
      model: config.gommo.chatModel,
      projectId: config.gommo.chatProjectId,
      description: entry.description,
      chatApiMode: 'agent',
    };
  }

  const server = entry.server || config.gommo.chatServer;
  const isWorkflow = server === 'cursorai';

  return {
    id: entry.id,
    label: entry.label,
    autoRouter: false,
    agentId:
      entry.agentId ||
      (isWorkflow ? config.gommo.chatWorkflowAgentId : config.gommo.chatAgentId),
    server,
    model: entry.model || config.gommo.chatModel,
    projectId:
      entry.projectId ||
      (isWorkflow ? config.gommo.chatWorkflowProjectId : config.gommo.chatProjectId),
    description: entry.description,
    chatApiMode: entry.chatApiMode === 'stream' ? 'stream' : entry.chatApiMode === 'agent' ? 'agent' : 'stream',
  };
}

export async function chatModelsCatalogResponse(accessToken?: string, domain?: string) {
  const { models: entries, source } = await listChatModelEntries(accessToken, domain);
  const models = entries.map((m) => {
    const resolved = resolveChatModel(m.id, entries);
    const modelBase = resolved.model.split('::')[0] || resolved.model;
    return {
      id: m.id,
      label: m.label,
      autoRouter: Boolean(m.autoRouter),
      agentId: resolved.agentId,
      server: resolved.server,
      model: resolved.model,
      projectId: resolved.projectId,
      description: m.description,
      chatApiMode: resolved.chatApiMode,
      displayModel: `${modelBase} · ${resolved.server}`,
      priceCredit: m.priceCredit,
      categories: m.categories,
      reasoning: m.reasoning,
      inputs: m.inputs,
      webSearch: m.webSearch,
      webFetch: m.webFetch,
    };
  });
  return {
    success: true,
    data: {
      defaultId: defaultChatModelId(entries),
      source,
      models,
    },
  };
}
