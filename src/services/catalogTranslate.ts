import { config, isGommoMerchantConfigured } from '../config.js';
import { buildChatForm, forwardChat } from './gommoChat.js';

export function isCatalogTranslateConfigured(): boolean {
  return isGommoMerchantConfigured() || Boolean(config.catalog.translateApiKey.trim());
}

function translateProvider(): 'gommo' | 'openrouter' {
  if (isGommoMerchantConfigured()) return 'gommo';
  if (config.catalog.translateApiKey.trim()) return 'openrouter';
  throw new Error('No translate provider configured');
}

function buildTranslatePrompt(payload: Record<string, string>): string {
  return [
    'Translate each value from Vietnamese to concise English for an AI model catalog.',
    'Keep brand names, model names, and technical tokens unchanged.',
    'Return ONLY a JSON object with the same keys and English string values.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

/** Batch translate slug → EN (Gommo chat default; OpenRouter optional fallback). */
export async function translateDescriptionsBatch(
  items: Array<{ slug: string; text: string }>,
): Promise<Record<string, string>> {
  if (!items.length || !isCatalogTranslateConfigured()) return {};

  const provider = translateProvider();
  const chunkSize =
    provider === 'gommo'
      ? Math.min(config.catalog.translateBatchSize, 8)
      : config.catalog.translateBatchSize;
  const out: Record<string, string> = {};

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const payload = Object.fromEntries(chunk.map((c) => [c.slug, c.text]));
    const chunkResult =
      provider === 'gommo'
        ? await translateChunkViaGommo(payload)
        : await translateChunkViaOpenRouter(payload);
    Object.assign(out, chunkResult);
  }

  return out;
}

async function translateChunkViaGommo(payload: Record<string, string>): Promise<Record<string, string>> {
  const prompt = buildTranslatePrompt(payload);
  const form = buildChatForm({
    action: 'chat',
    query: prompt,
    messages: [{ role: 'user', text: prompt }],
    accessToken: config.gommo.accessToken,
    domain: config.gommo.apiDomain,
  });

  const res = await forwardChat(form, AbortSignal.timeout(120_000));
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gommo chat HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const content =
    contentType.includes('text/event-stream') || text.includes('data: {')
      ? parseSseChatContent(text)
      : extractTextFromChatResponse(text);
  if (!content) return {};

  return parseTranslateJson(content, Object.keys(payload));
}

function parseSseChatContent(raw: string): string {
  let out = '';
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const json = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        text?: string;
      };
      const delta = json.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') out += delta;
      const message = json.choices?.[0]?.message?.content;
      if (typeof message === 'string') out += message;
      if (typeof json.text === 'string') out += json.text;
    } catch {
      /* ignore non-JSON SSE lines */
    }
  }
  return out.trim();
}

async function translateChunkViaOpenRouter(payload: Record<string, string>): Promise<Record<string, string>> {
  const apiKey = config.catalog.translateApiKey;
  const model = config.catalog.translateModel;
  const baseUrl = config.catalog.translateBaseUrl.replace(/\/$/, '');
  const prompt = buildTranslatePrompt(payload);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.appUrl,
      'X-Title': 'ai-gateway catalog translate',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    throw new Error(body.error?.message || `Translate API HTTP ${res.status}`);
  }

  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) return {};

  return parseTranslateJson(content, Object.keys(payload));
}

function extractTextFromChatResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return extractTextFromChatJson(parsed) || raw.trim();
  } catch {
    return raw.trim();
  }
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

  return null;
}

function parseTranslateJson(content: string, expectedSlugs: string[]): Record<string, string> {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return pickTranslateEntries(parsed, expectedSlugs);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      return pickTranslateEntries(parsed, expectedSlugs);
    } catch {
      return {};
    }
  }
}

function pickTranslateEntries(parsed: Record<string, unknown>, expectedSlugs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slug of expectedSlugs) {
    const v = parsed[slug];
    if (typeof v === 'string' && v.trim()) out[slug] = v.trim();
  }
  return out;
}
