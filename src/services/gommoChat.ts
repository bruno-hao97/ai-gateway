import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { buildMarketplaceDeviceInfo, platformDeviceFields } from './gommoDevice.js';

export type ChatAction = 'chat' | 'stream' | 'set_model';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  attachments?: unknown[];
}

export interface ChatDeviceFields {
  device_id?: string;
  device_name?: string;
  device_info?: string;
  debug_info?: string;
}

export interface ChatToolsConfig {
  web_search?: boolean;
  web_fetch?: boolean;
}

export interface ChatGatewayRequest {
  action: ChatAction;
  query?: string;
  sessionId?: string;
  messages?: ChatMessage[];
  agentId?: string;
  server?: string;
  model?: string;
  projectId?: string;
  accessToken: string;
  domain: string;
  device?: ChatDeviceFields;
  systemCustomPrompt?: string;
  customSystemPrompt?: string;
  chatTools?: ChatToolsConfig;
}

export interface SaveMessageRequest {
  accessToken: string;
  domain: string;
  sessionId: string;
  messageId: string;
  role: 'user' | 'model';
  text: string;
  attachments?: unknown[];
  timestamp: number;
  metadata?: Record<string, unknown>;
  device?: ChatDeviceFields;
}

const CHAT_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}/api/v2/chat`;
const CHAT_SESSIONS_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}/api/v2/ai-chat-sessions`;

const DEFAULT_SYSTEM_PROMPT =
  'Bạn là trợ lý AI hữu ích. Trả lời ngắn gọn, chính xác, bằng tiếng Việt khi user dùng tiếng Việt.';

function vietnamDateTime(): string {
  return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function buildSystemCustomPrompt(base = DEFAULT_SYSTEM_PROMPT): string {
  return `${base}\n\nThời gian hiện tại (Việt Nam): ${vietnamDateTime()}`;
}

function chatDefaults(req: ChatGatewayRequest) {
  return {
    agentId: req.agentId || config.gommo.chatAgentId,
    server: req.server || config.gommo.chatServer,
    model: req.model || config.gommo.chatModel,
    projectId: req.projectId || config.gommo.chatProjectId,
    sessionId: req.sessionId || randomUUID(),
  };
}

function serializeMessages(messages: ChatMessage[] = []): string {
  return JSON.stringify(
    messages.map((m) => ({
      role: m.role,
      text: m.text,
      attachments: Array.isArray(m.attachments) ? m.attachments : [],
    })),
  );
}

function appendDeviceFields(form: URLSearchParams, device?: ChatDeviceFields): void {
  const clientId = device?.device_id?.trim();
  const clientName = device?.device_name?.trim();
  const clientInfo = device?.device_info?.trim();
  const clientDebug = device?.debug_info?.trim();

  if (clientId && clientName) {
    form.set('device_id', clientId);
    form.set('device_name', clientName);
    if (clientInfo) form.set('device_info', clientInfo);
    if (clientDebug) form.set('debug_info', clientDebug);
    return;
  }

  const runtime = platformDeviceFields();
  form.set('device_id', runtime.device_id);
  form.set('device_name', runtime.device_name);
  if (runtime.device_info) {
    form.set('device_info', runtime.device_info);
    form.set('debug_info', buildMarketplaceDeviceInfo(runtime.device_id));
  }
}

export function buildChatForm(req: ChatGatewayRequest): URLSearchParams {
  const defaults = chatDefaults(req);
  const form = new URLSearchParams();
  form.set('action', req.action);
  form.set('access_token', req.accessToken);
  form.set('domain', req.domain);
  form.set('language', 'VI');
  appendDeviceFields(form, req.device);

  if (req.action === 'set_model') {
    form.set('chat_id', defaults.sessionId);
    form.set('agent_id', defaults.agentId);
    form.set('server', defaults.server);
    form.set('model', defaults.model);
    return form;
  }

  if (req.action === 'chat') {
    form.set('agent_id', defaults.agentId);
    form.set('query', (req.query || '').trim() || 'Xin chào');
    form.set('chat_id', defaults.sessionId);
    form.set('messages', serializeMessages(req.messages));
    form.set('source', config.gommo.chatSource);
    form.set('system_custom_prompt', req.systemCustomPrompt || buildSystemCustomPrompt());
    return form;
  }

  const userMessageId = randomUUID();
  const assistantMessageId = randomUUID();
  form.set('server', defaults.server);
  form.set('model', defaults.model);
  form.set('mode', defaults.model);
  form.set('body_type', 'chat_completions');
  form.set('agent_id', defaults.agentId);
  form.set('session_id', defaults.sessionId);
  form.set('project_id', defaults.projectId);
  form.set('query', (req.query || '').trim() || 'Xin chào');
  form.set('user_message_id', userMessageId);
  form.set('assistant_message_id', assistantMessageId);
  form.set('messages', serializeMessages(req.messages));
  form.set('source', config.gommo.chatSource);
  const tools = req.chatTools ?? {};
  form.set(
    'chat_tools',
    JSON.stringify({
      web_search: tools.web_search === true,
      web_fetch: tools.web_fetch === true,
    }),
  );
  if (req.customSystemPrompt?.trim()) {
    form.set('custom_system_prompt', req.customSystemPrompt.trim());
  }
  return form;
}

export function buildSaveMessageForm(req: SaveMessageRequest): URLSearchParams {
  return buildChatSessionActionForm(
    'save_message',
    req.accessToken,
    req.domain,
    {
      message_id: req.messageId,
      session_id: req.sessionId,
      role: req.role,
      text: req.text,
      attachments: JSON.stringify(req.attachments ?? []),
      timestamp: String(req.timestamp),
      metadata: JSON.stringify(req.metadata ?? { version: 1 }),
    },
    req.device,
  );
}

export const CHAT_SESSION_ACTIONS = new Set([
  'save_message',
  'list_sessions',
  'get_messages',
  'get_session',
]);

export function buildChatSessionActionForm(
  action: string,
  accessToken: string,
  domain: string,
  fields: Record<string, string>,
  device?: ChatDeviceFields,
): URLSearchParams {
  const form = new URLSearchParams();
  form.set('action', action);
  form.set('access_token', accessToken);
  form.set('domain', domain);
  appendDeviceFields(form, device);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      form.set(key, String(value));
    }
  }
  return form;
}

export async function forwardChat(form: URLSearchParams, signal?: AbortSignal): Promise<Response> {
  return fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'accept-encoding': 'identity',
    },
    body: form.toString(),
    signal,
  });
}

export async function forwardChatSession(
  form: URLSearchParams,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(CHAT_SESSIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'accept-encoding': 'identity',
    },
    body: form.toString(),
    signal,
  });
}

/** Best-effort set_model before agent chat — failures are ignored. */
export async function syncChatModel(req: ChatGatewayRequest, signal?: AbortSignal): Promise<void> {
  const form = buildChatForm({ ...req, action: 'set_model' });
  try {
    const res = await forwardChat(form, signal);
    await res.text();
  } catch {
    /* best-effort */
  }
}

export async function runAgentChat(req: ChatGatewayRequest, signal?: AbortSignal): Promise<Response> {
  await syncChatModel(req, signal);
  const form = buildChatForm({ ...req, action: 'chat' });
  return forwardChat(form, signal);
}
