import { config, isGommoMerchantConfigured } from '../config.js';
import { buildChatForm, forwardChat, type ChatGatewayRequest } from './gommoChat.js';
import { extractGommoChatText } from './openaiChat.js';

export function isCatalogTranslateConfigured(): boolean {
  return isGommoMerchantConfigured() || Boolean(config.catalog.translateApiKey.trim());
}

function translateProvider(): 'gommo' | 'openrouter' {
  if (isGommoMerchantConfigured()) return 'gommo';
  if (config.catalog.translateApiKey.trim()) return 'openrouter';
  throw new Error('No translate provider configured');
}

export type CatalogTranslateTarget = 'en' | 'th';

function buildTranslatePrompt(payload: Record<string, string>, target: CatalogTranslateTarget): string {
  const lang = target === 'th' ? 'Thai' : 'English';
  const langNote = target === 'th' ? 'Thai string values' : 'English string values';
  return [
    `Translate each value from Vietnamese to concise ${lang} for an AI model catalog.`,
    'Keep brand names, model names, and technical tokens unchanged.',
    `Return ONLY a JSON object with the same keys and ${langNote}.`,
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function buildTranslateEnToThPrompt(payload: Record<string, string>): string {
  return [
    'Translate each value from English to concise Thai for an AI model catalog.',
    'Keep brand names, model names, and technical tokens unchanged.',
    'Return ONLY a JSON object with the same keys and Thai string values.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function buildGommoTranslateRequest(prompt: string): ChatGatewayRequest {
  return {
    action: 'stream',
    query: prompt,
    messages: [{ role: 'user', text: prompt }],
    accessToken: config.gommo.accessToken,
    domain: config.gommo.apiDomain,
    server: config.gommo.chatServer,
    model: config.gommo.chatModel,
    customSystemPrompt:
      'You are a translation assistant for an AI model catalog. Return only valid JSON with the requested keys.',
  };
}

async function translateChunkEnToTh(
  payload: Record<string, string>,
  provider: 'gommo' | 'openrouter',
): Promise<Record<string, string>> {
  const prompt = buildTranslateEnToThPrompt(payload);
  if (provider === 'gommo') {
    return translateChunkViaGommoPrompt(prompt, Object.keys(payload));
  }

  const apiKey = config.catalog.translateApiKey;
  const model = config.catalog.translateModel;
  const baseUrl = config.catalog.translateBaseUrl.replace(/\/$/, '');
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

async function translateChunkViaGommoPrompt(
  prompt: string,
  expectedSlugs: string[],
): Promise<Record<string, string>> {
  const form = buildChatForm(buildGommoTranslateRequest(prompt));
  const res = await forwardChat(form, AbortSignal.timeout(120_000));
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gommo chat HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const content = extractGommoChatText(text, res.headers.get('content-type') ?? '');
  if (!content) return {};
  return parseTranslateJson(content, expectedSlugs);
}

/** Batch translate slug → EN|TH (Gommo chat default; OpenRouter optional fallback). */
export async function translateDescriptionsBatch(
  items: Array<{ slug: string; text: string }>,
  target: CatalogTranslateTarget = 'en',
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
        ? await translateChunkViaGommo(payload, target)
        : await translateChunkViaOpenRouter(payload, target);
    Object.assign(out, chunkResult);
  }

  return out;
}

/** Bootstrap TH cache from EN cache entries (same hash, EN → TH). */
export async function translateEnglishDescriptionsBatch(
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
    const chunkResult = await translateChunkEnToTh(payload, provider);
    Object.assign(out, chunkResult);
  }

  return out;
}

async function translateChunkViaGommo(
  payload: Record<string, string>,
  target: CatalogTranslateTarget,
): Promise<Record<string, string>> {
  const prompt = buildTranslatePrompt(payload, target);
  return translateChunkViaGommoPrompt(prompt, Object.keys(payload));
}

async function translateChunkViaOpenRouter(
  payload: Record<string, string>,
  target: CatalogTranslateTarget,
): Promise<Record<string, string>> {
  const apiKey = config.catalog.translateApiKey;
  const model = config.catalog.translateModel;
  const baseUrl = config.catalog.translateBaseUrl.replace(/\/$/, '');
  const prompt = buildTranslatePrompt(payload, target);

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
