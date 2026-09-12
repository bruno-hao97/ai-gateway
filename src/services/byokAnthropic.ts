import type { OpenAiChatMessage } from './openaiChat.js';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

function splitSystem(messages: OpenAiChatMessage[]): {
  system?: string;
  conversation: AnthropicMessage[];
} {
  const systemParts: string[] = [];
  const conversation: AnthropicMessage[] = [];

  for (const msg of messages) {
    const text =
      typeof msg.content === 'string'
        ? msg.content.trim()
        : Array.isArray(msg.content)
          ? msg.content.map((p) => p.text || '').join('').trim()
          : '';
    if (!text) continue;

    if (msg.role === 'system' || msg.role === 'developer') {
      systemParts.push(text);
      continue;
    }
    if (msg.role === 'assistant') {
      conversation.push({ role: 'assistant', content: text });
      continue;
    }
    conversation.push({ role: 'user', content: text });
  }

  return {
    system: systemParts.length ? systemParts.join('\n\n') : undefined,
    conversation,
  };
}

export async function testAnthropicCredential(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await anthropicByokChatRequest({
      apiKey,
      model: 'claude-3-5-haiku-20241022',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 8,
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, message: text || `Anthropic HTTP ${response.status}` };
    }
    return { ok: true, message: 'Anthropic key is valid' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function anthropicByokChatRequest(input: {
  apiKey: string;
  model: string;
  messages: OpenAiChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  system?: string;
}): Promise<Response> {
  const { system, conversation } = splitSystem(input.messages);
  const mergedSystem = [input.system?.trim(), system?.trim()].filter(Boolean).join('\n\n') || undefined;

  const body: Record<string, unknown> = {
    model: input.model,
    max_tokens: Math.max(1, Math.floor(Number(input.max_tokens) || 4096)),
    messages: conversation.length ? conversation : [{ role: 'user', content: 'Hello' }],
    stream: Boolean(input.stream),
  };
  if (mergedSystem) body.system = mergedSystem;

  return fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey.trim(),
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
}

export function anthropicStreamChunkToGommoSse(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const type = String(parsed.type || '');
    if (type === 'content_block_delta') {
      const delta = parsed.delta as { type?: string; text?: string } | undefined;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text) {
        return `data: ${JSON.stringify({ text: delta.text })}\n\n`;
      }
    }
    if (type === 'message_delta') {
      const delta = parsed.delta as { stop_reason?: string } | undefined;
      if (delta?.stop_reason) return `data: [DONE]\n\n`;
    }
  } catch {
    return null;
  }
  return null;
}

export async function pipeAnthropicStreamToGommoSse(
  upstream: Response,
  write: (chunk: string) => void,
): Promise<void> {
  if (!upstream.body) return;
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';
      for (const line of parts) {
        const out = anthropicStreamChunkToGommoSse(line);
        if (out) write(out);
      }
    }
    if (buffer.trim()) {
      const out = anthropicStreamChunkToGommoSse(buffer);
      if (out) write(out);
    }
  } finally {
    reader.releaseLock();
  }
  write('data: [DONE]\n\n');
}
