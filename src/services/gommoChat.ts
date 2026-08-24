import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { buildMarketplaceDeviceInfo, platformDeviceFields } from './gommoDevice.js';

export type ChatAction = 'chat' | 'stream' | 'set_model';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
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
}

const CHAT_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}/api/v2/chat`;

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
  return JSON.stringify(messages.map((m) => ({ role: m.role, text: m.text, attachments: [] })));
}

function appendDeviceFields(form: URLSearchParams): void {
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
  appendDeviceFields(form);

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
    return form;
  }

  // stream
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
  form.set('chat_tools', JSON.stringify({ web_search: false, web_fetch: false }));
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
