import type { OpenAiChatMessage } from './openaiChat.js';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

export async function testOpenAiCredential(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(OPENAI_MODELS_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, message: text || `OpenAI HTTP ${response.status}` };
    }
    return { ok: true, message: 'OpenAI key is valid' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function openAiByokChatRequest(input: {
  apiKey: string;
  model: string;
  messages: OpenAiChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}): Promise<Response> {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
    stream: Boolean(input.stream),
  };
  if (typeof input.temperature === 'number') body.temperature = input.temperature;
  if (typeof input.max_tokens === 'number') body.max_tokens = input.max_tokens;

  return fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
}

export function readOpenAiUsage(raw: string): { tokensIn?: number; tokensOut?: number } {
  try {
    const parsed = JSON.parse(raw) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      tokensIn: parsed.usage?.prompt_tokens,
      tokensOut: parsed.usage?.completion_tokens,
    };
  } catch {
    return {};
  }
}
