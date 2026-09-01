import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { config } from '../config.js';
import {
  buildChatForm,
  forwardChat,
  type ChatGatewayRequest,
  type ChatMessage,
} from './gommoChat.js';

export interface OpenAiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'developer';
  content?: string | Array<{ type?: string; text?: string }> | null;
  name?: string;
}

export interface OpenAiChatCompletionRequest {
  model?: string;
  messages?: OpenAiChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  user?: string;
}

export interface OpenAiErrorBody {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

function messageText(content: OpenAiChatMessage['content']): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function parseModelField(model?: string): { model?: string; server?: string } {
  const raw = String(model || config.gommo.chatModel).trim();
  if (!raw) return {};
  const idx = raw.indexOf('::');
  if (idx === -1) return { model: raw };
  return {
    model: raw.slice(0, idx).trim() || undefined,
    server: raw.slice(idx + 2).trim() || undefined,
  };
}

export function mapOpenAiMessages(messages: OpenAiChatMessage[]): {
  query: string;
  gommoMessages: ChatMessage[];
} {
  const systemParts: string[] = [];
  const gommoMessages: ChatMessage[] = [];
  let lastUser = '';

  for (const msg of messages) {
    const text = messageText(msg.content);
    if (!text) continue;

    if (msg.role === 'system' || msg.role === 'developer') {
      systemParts.push(text);
      continue;
    }

    if (msg.role === 'user') {
      lastUser = text;
      gommoMessages.push({ role: 'user', text });
      continue;
    }

    if (msg.role === 'assistant') {
      gommoMessages.push({ role: 'model', text });
      continue;
    }

    // tool / unknown → treat as user context
    gommoMessages.push({ role: 'user', text });
    lastUser = text;
  }

  let query = lastUser || gommoMessages.filter((m) => m.role === 'user').at(-1)?.text || '';
  if (systemParts.length) {
    const systemBlock = systemParts.join('\n\n');
    query = query ? `${systemBlock}\n\n${query}` : systemBlock;
  }

  return {
    query: query || 'Xin chào',
    gommoMessages,
  };
}

function extractTextFromChatJson(obj: Record<string, unknown>, depth = 0): string | null {
  if (depth > 4) return null;

  const directKeys = ['text', 'reply', 'content', 'message', 'answer', 'output'];
  for (const key of directKeys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }

  const data = obj.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const nested = extractTextFromChatJson(data as Record<string, unknown>, depth + 1);
    if (nested) return nested;
  }

  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const choice = choices[0] as Record<string, unknown>;
    const message = choice.message;
    if (message && typeof message === 'object') {
      const content = (message as { content?: unknown }).content;
      if (typeof content === 'string' && content.trim()) return content.trim();
    }
    const delta = choice.delta;
    if (delta && typeof delta === 'object') {
      const content = (delta as { content?: unknown }).content;
      if (typeof content === 'string' && content.trim()) return content.trim();
    }
  }

  return null;
}

export function extractGommoChatText(raw: string, contentType = ''): string {
  if (contentType.includes('text/event-stream') || raw.includes('data:')) {
    return parseSseChatContent(raw);
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return extractTextFromChatJson(parsed) || raw.trim();
  } catch {
    return raw.trim();
  }
}

function parseSseChatContent(raw: string): string {
  let out = '';
  for (const line of raw.split('\n')) {
    const chunk = extractSseDataLine(line);
    if (chunk) out += chunk;
  }
  return out.trim();
}

function extractSseDataLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return '';
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';

  try {
    const json = JSON.parse(payload) as Record<string, unknown>;
    return extractTextFromChatJson(json) || '';
  } catch {
    return payload.startsWith('{') ? '' : payload;
  }
}

function completionId(): string {
  return `chatcmpl-${randomUUID().replace(/-/g, '')}`;
}

function buildOpenAiCompletion(model: string, content: string, id = completionId()) {
  const created = Math.floor(Date.now() / 1000);
  return {
    id,
    object: 'chat.completion',
    created,
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

function buildOpenAiChunk(
  id: string,
  model: string,
  delta: Record<string, string>,
  finishReason: string | null = null,
) {
  return {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
}

function writeSse(res: Response, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildGommoRequest(
  body: OpenAiChatCompletionRequest,
  accessToken: string,
  domain: string,
  stream: boolean,
): ChatGatewayRequest {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    throw new Error('messages is required');
  }

  const { query, gommoMessages } = mapOpenAiMessages(messages);
  const { model, server } = parseModelField(body.model);

  return {
    action: stream ? 'stream' : 'chat',
    query,
    messages: gommoMessages,
    model,
    server,
    accessToken,
    domain,
  };
}

export async function handleOpenAiChatCompletion(
  body: OpenAiChatCompletionRequest,
  accessToken: string,
  domain: string,
  res: Response,
): Promise<void> {
  const model = String(body.model || config.gommo.chatModel).trim();
  const stream = Boolean(body.stream);
  const chatReq = buildGommoRequest(body, accessToken, domain, stream);
  const form = buildChatForm(chatReq);
  const upstream = await forwardChat(form, AbortSignal.timeout(120_000));

  if (!upstream.ok) {
    const text = await upstream.text();
    res.status(upstream.status).json({
      error: {
        message: text || `Upstream chat HTTP ${upstream.status}`,
        type: 'upstream_error',
        param: null,
        code: 'upstream_error',
      },
    } satisfies OpenAiErrorBody);
    return;
  }

  const contentType = upstream.headers.get('content-type') ?? '';

  if (stream || contentType.includes('text/event-stream')) {
    const id = completionId();
    res.status(200);
    res.setHeader('content-type', 'text/event-stream; charset=utf-8');
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');

    writeSse(res, buildOpenAiChunk(id, model, { role: 'assistant' }));

    if (!upstream.body) {
      writeSse(res, buildOpenAiChunk(id, model, {}, 'stop'));
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const chunk = extractSseDataLine(line);
          if (chunk) writeSse(res, buildOpenAiChunk(id, model, { content: chunk }));
        }
      }

      if (buffer.trim()) {
        const chunk = extractSseDataLine(buffer);
        if (chunk) writeSse(res, buildOpenAiChunk(id, model, { content: chunk }));
      }
    } catch {
      /* client may disconnect */
    } finally {
      reader.releaseLock();
    }

    writeSse(res, buildOpenAiChunk(id, model, {}, 'stop'));
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const text = await upstream.text();
  const content = extractGommoChatText(text, contentType);
  res.status(200).json(buildOpenAiCompletion(model, content));
}

export function listOpenAiModels(): { object: string; data: Array<{ id: string; object: string; owned_by: string }> } {
  const model = config.gommo.chatModel.trim() || 'gommo-chat';
  return {
    object: 'list',
    data: [{ id: model, object: 'model', owned_by: 'gommo' }],
  };
}
