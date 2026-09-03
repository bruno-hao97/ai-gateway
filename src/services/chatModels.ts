import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export interface ChatModelEntry {
  id: string;
  label: string;
  autoRouter?: boolean;
  agentId?: string;
  server?: string;
  model?: string;
  description?: string;
}

export interface ResolvedChatModel {
  id: string;
  label: string;
  autoRouter: boolean;
  agentId: string;
  server: string;
  model: string;
  description?: string;
}

interface ChatModelsFile {
  defaultId?: string;
  models?: ChatModelEntry[];
}

const BUILTIN_MODELS: ChatModelEntry[] = [
  {
    id: 'auto-router',
    label: 'Auto Router',
    autoRouter: true,
    description: 'Gateway default — same as env GOMMO_CHAT_*',
  },
  {
    id: 'moon-chat',
    label: 'Moon Chat',
    agentId: config.gommo.chatAgentId,
    server: config.gommo.chatServer,
    model: config.gommo.chatModel,
    description: 'Default Gommo text agent',
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
    if (!parsed || !Array.isArray(parsed.models)) return null;
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
    description: typeof entry.description === 'string' ? entry.description.trim() : undefined,
  };
}

export function listChatModelEntries(): ChatModelEntry[] {
  const fromFile = readCatalogFile();
  const raw = fromFile?.models?.length ? fromFile.models : BUILTIN_MODELS;
  const seen = new Set<string>();
  const out: ChatModelEntry[] = [];
  for (const item of raw) {
    const normalized = normalizeEntry(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out.length ? out : BUILTIN_MODELS;
}

export function defaultChatModelId(): string {
  const fromFile = readCatalogFile();
  const candidate = String(fromFile?.defaultId || 'auto-router').trim();
  const entries = listChatModelEntries();
  if (entries.some((m) => m.id === candidate)) return candidate;
  return entries[0]?.id || 'auto-router';
}

export function resolveChatModel(modelId?: string): ResolvedChatModel {
  const entries = listChatModelEntries();
  const fallbackId = defaultChatModelId();
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
      description: entry.description,
    };
  }

  return {
    id: entry.id,
    label: entry.label,
    autoRouter: false,
    agentId: entry.agentId || config.gommo.chatAgentId,
    server: entry.server || config.gommo.chatServer,
    model: entry.model || config.gommo.chatModel,
    description: entry.description,
  };
}

export function chatModelsCatalogResponse() {
  const models = listChatModelEntries().map((m) => {
    const resolved = resolveChatModel(m.id);
    return {
      id: m.id,
      label: m.label,
      autoRouter: Boolean(m.autoRouter),
      agentId: resolved.agentId,
      server: resolved.server,
      model: resolved.model,
      description: m.description,
      displayModel: `${resolved.model.split('::')[0] || resolved.model} · ${resolved.server}`,
    };
  });
  return {
    success: true,
    data: {
      defaultId: defaultChatModelId(),
      models,
    },
  };
}
