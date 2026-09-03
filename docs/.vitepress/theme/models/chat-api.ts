import { getStoredToken } from './auth-api';
import { apiBase } from './gateway-base';
import { gommoClientDeviceFields } from './gommo-device';
import type { ChatAttachment } from './chat-storage';

export interface ChatTurnMessage {
  role: 'user' | 'model';
  text: string;
  attachments?: unknown[];
}

export interface ChatToolsOptions {
  web_search?: boolean;
  web_fetch?: boolean;
}

export interface ChatUsageMeta {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatReplyResult {
  text: string;
  latencyMs: number;
  usage?: ChatUsageMeta;
}

export interface AgentChatOptions {
  sessionId: string;
  query: string;
  messages: ChatTurnMessage[];
  agentId?: string;
  server?: string;
  model?: string;
  projectId?: string;
  useStream?: boolean;
  chatTools?: ChatToolsOptions;
  signal?: AbortSignal;
}

export interface SaveChatMessageOptions {
  sessionId: string;
  messageId: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
}

export interface RemoteChatSession {
  id: string;
  title: string;
  updatedAt: number;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getStoredToken()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
}

function devicePayload() {
  const d = gommoClientDeviceFields('vi');
  return {
    device_id: d.device_id,
    device_name: d.device_name,
    device_info: d.device_info,
  };
}

export function parseGatewayError(payload: unknown, status: number): string {
  if (!payload || typeof payload !== 'object') return `HTTP ${status}`;
  const p = payload as Record<string, unknown>;
  if (typeof p.message === 'string' && p.message) return p.message;
  if (typeof p.error === 'string' && p.error) return p.error;
  return `HTTP ${status}`;
}

/** Parse usage from SSE event data (OpenAI-style or Gommo variants). */
export function extractSseUsage(payload: string): ChatUsageMeta | null {
  if (!payload || payload === '[DONE]') return null;
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const usage =
      parsed.usage && typeof parsed.usage === 'object' && !Array.isArray(parsed.usage)
        ? (parsed.usage as Record<string, unknown>)
        : parsed;
    const prompt =
      (typeof usage.prompt_tokens === 'number' && usage.prompt_tokens) ||
      (typeof usage.input_tokens === 'number' && usage.input_tokens) ||
      undefined;
    const completion =
      (typeof usage.completion_tokens === 'number' && usage.completion_tokens) ||
      (typeof usage.output_tokens === 'number' && usage.output_tokens) ||
      undefined;
    const total =
      (typeof usage.total_tokens === 'number' && usage.total_tokens) ||
      (prompt !== undefined && completion !== undefined ? prompt + completion : undefined);
    if (prompt === undefined && completion === undefined && total === undefined) return null;
    return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
  } catch {
    return null;
  }
}

/** Extract text chunk from SSE data line per Gommo spec. */
export function extractSseChatChunk(payload: string): string {
  if (!payload || payload === '[DONE]') return '';
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.error !== undefined && parsed.error !== 0 && parsed.error !== false) {
      const msg = typeof parsed.message === 'string' ? parsed.message : 'Upstream chat error';
      throw new Error(msg);
    }
    const choices = parsed.choices;
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
      const delta = (choices[0] as Record<string, unknown>).delta;
      if (delta && typeof delta === 'object') {
        const content = (delta as Record<string, unknown>).content;
        if (typeof content === 'string') return content;
      }
    }
    if (typeof parsed.text === 'string') return parsed.text;
    if (typeof parsed.content === 'string') return parsed.content;
    if (typeof parsed.reply === 'string') return parsed.reply;
    const message = parsed.message;
    if (typeof message === 'string') return message;
  } catch (err) {
    if (err instanceof Error) throw err;
    if (!payload.startsWith('{')) return payload;
  }
  return '';
}

/** Parse JSON chat response — text | content | reply. */
export function extractJsonChatReply(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  if (p.error !== undefined && p.error !== 0 && p.error !== false) {
    throw new Error(typeof p.message === 'string' ? p.message : 'Chat failed');
  }
  const data = p.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (typeof d.text === 'string') return d.text;
    if (typeof d.content === 'string') return d.content;
    if (typeof d.reply === 'string') return d.reply;
  }
  if (typeof p.text === 'string') return p.text;
  if (typeof p.content === 'string') return p.content;
  if (typeof p.reply === 'string') return p.reply;
  return '';
}

export async function consumeChatSseStream(
  body: ReadableStream<Uint8Array> | null,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onUsage?: (usage: ChatUsageMeta) => void,
): Promise<void> {
  if (!body) throw new Error('No stream body');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';

  const onAbort = () => {
    void reader.cancel();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Chat stopped', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        if (eventName === 'usage') {
          const usage = extractSseUsage(payload);
          if (usage) onUsage?.(usage);
          eventName = '';
          continue;
        }
        eventName = '';
        const chunk = extractSseChatChunk(payload);
        if (chunk) onChunk(chunk);
        else {
          const usage = extractSseUsage(payload);
          if (usage) onUsage?.(usage);
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

async function postChatSessions(body: Record<string, unknown>): Promise<unknown> {
  const base = apiBase();
  const res = await fetch(`${base}/gateway/chat-sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...body, ...devicePayload() }),
  });
  const raw = await parseJsonResponse(res);
  if (!res.ok) throw new Error(parseGatewayError(raw, res.status));
  return raw;
}

function pickArray(payload: unknown, keys: string[]): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const data = root.data;
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const nested = data as Record<string, unknown>;
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }
  if (Array.isArray(data)) return data;
  return [];
}

export function parseRemoteSessions(payload: unknown): RemoteChatSession[] {
  const items = pickArray(payload, ['sessions', 'items', 'list']);
  const out: RemoteChatSession[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id =
      (typeof row.session_id === 'string' && row.session_id) ||
      (typeof row.sessionId === 'string' && row.sessionId) ||
      (typeof row.id === 'string' && row.id) ||
      '';
    if (!id) continue;
    const title =
      (typeof row.title === 'string' && row.title) ||
      (typeof row.name === 'string' && row.name) ||
      'Chat';
    const updatedAt =
      (typeof row.updated_at === 'number' && row.updated_at) ||
      (typeof row.updatedAt === 'number' && row.updatedAt) ||
      (typeof row.timestamp === 'number' && row.timestamp) ||
      Date.now();
    out.push({ id, title, updatedAt });
  }
  return out;
}

export function parseRemoteMessages(
  payload: unknown,
): Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: number }> {
  const items = pickArray(payload, ['messages', 'items', 'list']);
  const out: Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: number }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id =
      (typeof row.message_id === 'string' && row.message_id) ||
      (typeof row.messageId === 'string' && row.messageId) ||
      (typeof row.id === 'string' && row.id) ||
      crypto.randomUUID();
    const roleRaw = String(row.role || '').toLowerCase();
    const role: 'user' | 'assistant' =
      roleRaw === 'user' ? 'user' : roleRaw === 'model' || roleRaw === 'assistant' ? 'assistant' : 'assistant';
    const text =
      (typeof row.text === 'string' && row.text) ||
      (typeof row.content === 'string' && row.content) ||
      '';
    if (!text) continue;
    const createdAt =
      (typeof row.timestamp === 'number' && row.timestamp) ||
      (typeof row.created_at === 'number' && row.created_at) ||
      (typeof row.createdAt === 'number' && row.createdAt) ||
      Date.now();
    out.push({ id, role, text, createdAt });
  }
  return out;
}

/** Best-effort sync sessions from Gommo — returns null if upstream unsupported. */
export async function fetchRemoteChatSessions(): Promise<RemoteChatSession[] | null> {
  try {
    const raw = await postChatSessions({ action: 'list_sessions', limit: 50 });
    return parseRemoteSessions(raw);
  } catch {
    return null;
  }
}

/** Best-effort load messages for a session from Gommo. */
export async function fetchRemoteChatMessages(sessionId: string) {
  try {
    const raw = await postChatSessions({ action: 'get_messages', sessionId, limit: 200 });
    return parseRemoteMessages(raw);
  } catch {
    return null;
  }
}

export async function uploadChatImage(file: File): Promise<string> {
  const base = apiBase();
  const form = new FormData();
  form.append('file', file, file.name);
  const res = await fetch(`${base}/gateway/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStoredToken()}` },
    body: form,
  });
  const raw = await parseJsonResponse(res);
  if (!res.ok) throw new Error(parseGatewayError(raw, res.status));
  const data =
    raw && typeof raw === 'object' && (raw as Record<string, unknown>).data
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
      : (raw as Record<string, unknown>);
  const url =
    (typeof data.url === 'string' && data.url) ||
    (typeof data.result_url === 'string' && data.result_url) ||
    '';
  if (!url) throw new Error('Upload succeeded but no URL returned');
  return url;
}

async function dispatchChat(
  action: 'agent' | 'stream',
  opts: AgentChatOptions,
  onChunk?: (text: string) => void,
): Promise<ChatReplyResult> {
  const started = Date.now();
  let usage: ChatUsageMeta | undefined;
  const base = apiBase();
  const res = await fetch(`${base}/gateway/chat`, {
    method: 'POST',
    headers: authHeaders(),
    signal: opts.signal,
    body: JSON.stringify({
      action,
      query: opts.query,
      sessionId: opts.sessionId,
      messages: opts.messages,
      agentId: opts.agentId,
      server: opts.server,
      model: opts.model,
      projectId: opts.projectId,
      chatTools: opts.chatTools,
      ...devicePayload(),
    }),
  });

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    let reply = '';
    await consumeChatSseStream(
      res.body,
      (chunk) => {
        reply += chunk;
        onChunk?.(reply);
      },
      opts.signal,
      (u) => {
        usage = { ...usage, ...u };
      },
    );
    if (!reply.trim()) throw new Error('Empty chat response');
    return { text: reply, latencyMs: Date.now() - started, usage };
  }

  const raw = await res.json().catch(async () => {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  });

  if (!res.ok) throw new Error(parseGatewayError(raw, res.status));

  const reply = extractJsonChatReply(raw);
  if (!reply.trim()) throw new Error('Empty chat response');
  onChunk?.(reply);

  if (raw && typeof raw === 'object') {
    const parsedUsage = extractSseUsage(JSON.stringify((raw as Record<string, unknown>).usage ?? raw));
    if (parsedUsage) usage = parsedUsage;
  }

  return { text: reply, latencyMs: Date.now() - started, usage };
}

/** Agent text chat: set_model + chat (gateway action=agent). Optional onChunk for SSE. */
export async function sendAgentChat(
  opts: AgentChatOptions,
  onChunk?: (text: string) => void,
): Promise<ChatReplyResult> {
  const action = opts.useStream ? 'stream' : 'agent';
  return dispatchChat(action, opts, onChunk);
}

/** Portal chat is local-only — Gommo save_message disabled. */
export async function saveChatMessage(_opts: SaveChatMessageOptions): Promise<void> {
  /* local-only */
}
