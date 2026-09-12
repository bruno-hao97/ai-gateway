import type { Response as ExpressResponse } from 'express';
import {
  anthropicByokChatRequest,
  pipeAnthropicStreamToGommoSse,
} from './byokAnthropic.js';
import {
  extractAssistantTextFromAnthropicResponse,
  extractAssistantTextFromOpenAiResponse,
  readAnthropicUsage,
} from './byokMessages.js';
import type { ByokProviderRoute } from './byokResolver.js';
import { isByokUpstreamFailure } from './byokResolver.js';
import { openAiByokChatRequest, readOpenAiUsage } from './byokOpenAi.js';
import type { OpenAiChatMessage } from './openaiChat.js';
import { touchCredential } from './byokStore.js';
import { recordByokUsage } from './byokUsage.js';
import {
  accruePlatformFee,
  assertPlatformFeeAllowance,
  calculatePlatformFeeCredits,
  PlatformFeeError,
} from './byokPlatformFee.js';

export { PlatformFeeError };

export type ByokChatAttempt = 'success' | 'fallback' | 'failed';
export type ByokUsageRoute = 'openai' | 'chat';

interface ByokChatInput {
  route: ByokProviderRoute;
  ownerId: string;
  messages: OpenAiChatMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  system?: string;
  usageRoute: ByokUsageRoute;
}

function openAiError(res: ExpressResponse, status: number, message: string): void {
  res.status(status).json({
    error: {
      message,
      type: 'upstream_error',
      param: null,
      code: 'byok_upstream_error',
    },
  });
}

async function recordAttempt(input: {
  ownerId: string;
  route: ByokProviderRoute;
  usageRoute: ByokUsageRoute;
  started: number;
  ok: boolean;
  tokensIn?: number;
  tokensOut?: number;
  errorCode?: string;
}): Promise<void> {
  const platformFeeCredits =
    input.ok && input.route
      ? calculatePlatformFeeCredits({ tokensIn: input.tokensIn, tokensOut: input.tokensOut })
      : 0;

  await recordByokUsage({
    ownerId: input.ownerId,
    credentialId: input.route.credentialId,
    source: 'byok',
    route: input.usageRoute,
    provider: input.route.provider,
    model: input.route.upstreamModel,
    tokensIn: input.tokensIn,
    tokensOut: input.tokensOut,
    platformFeeCredits,
    latencyMs: Date.now() - input.started,
    ok: input.ok,
    errorCode: input.errorCode,
  });

  if (input.ok && platformFeeCredits > 0) {
    await accruePlatformFee(input.ownerId, platformFeeCredits);
  }
}

export async function ensureByokPlatformFeeAllowance(input: {
  ownerId: string;
  accessToken: string;
  domain: string;
}): Promise<void> {
  const estimatedFeeCredits = calculatePlatformFeeCredits({});
  await assertPlatformFeeAllowance({
    ownerId: input.ownerId,
    accessToken: input.accessToken,
    domain: input.domain,
    estimatedFeeCredits,
  });
}

async function upstreamRequest(input: ByokChatInput): Promise<globalThis.Response> {
  if (input.route.provider === 'anthropic') {
    return anthropicByokChatRequest({
      apiKey: input.route.apiKey,
      model: input.route.upstreamModel,
      messages: input.messages,
      stream: input.stream,
      max_tokens: input.max_tokens,
      system: input.system,
    });
  }

  return openAiByokChatRequest({
    apiKey: input.route.apiKey,
    model: input.route.upstreamModel,
    messages: input.messages,
    stream: input.stream,
    temperature: input.temperature,
    max_tokens: input.max_tokens,
  });
}

function extractText(provider: ByokProviderRoute['provider'], raw: string): string {
  return provider === 'anthropic'
    ? extractAssistantTextFromAnthropicResponse(raw)
    : extractAssistantTextFromOpenAiResponse(raw);
}

function readUsage(provider: ByokProviderRoute['provider'], raw: string) {
  return provider === 'anthropic' ? readAnthropicUsage(raw) : readOpenAiUsage(raw);
}

export async function pipeByokStreamToResponse(
  upstream: globalThis.Response,
  res: ExpressResponse,
  provider: ByokProviderRoute['provider'],
): Promise<void> {
  res.status(200);
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache');
  res.setHeader('connection', 'keep-alive');

  if (provider === 'anthropic') {
    await pipeAnthropicStreamToGommoSse(upstream, (chunk) => {
      res.write(chunk);
    });
    res.end();
    return;
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  res.end();
}

export async function attemptByokProviderChat(input: ByokChatInput & { res: ExpressResponse }): Promise<ByokChatAttempt> {
  const started = Date.now();

  try {
    const upstream = await upstreamRequest(input);

    if (!upstream.ok) {
      const text = await upstream.text();
      await touchCredential(input.route.credentialId, false, text);
      await recordAttempt({
        ownerId: input.ownerId,
        route: input.route,
        usageRoute: input.usageRoute,
        started,
        ok: false,
        errorCode: String(upstream.status),
      });

      if (input.route.strictOnly || !input.route.sharedFallback) {
        openAiError(input.res, upstream.status, text || `Upstream HTTP ${upstream.status}`);
        return 'failed';
      }
      if (isByokUpstreamFailure(upstream.status)) return 'fallback';
      openAiError(input.res, upstream.status, text || `Upstream HTTP ${upstream.status}`);
      return 'failed';
    }

    const contentType = upstream.headers.get('content-type') ?? '';

    if (input.stream || contentType.includes('text/event-stream')) {
      await pipeByokStreamToResponse(upstream, input.res, input.route.provider);
      await touchCredential(input.route.credentialId, true);
      await recordAttempt({
        ownerId: input.ownerId,
        route: input.route,
        usageRoute: input.usageRoute,
        started,
        ok: true,
      });
      return 'success';
    }

    const text = await upstream.text();
    const usage = readUsage(input.route.provider, text);
    const assistantText = extractText(input.route.provider, text);

    if (input.usageRoute === 'openai') {
      input.res.status(200);
      input.res.setHeader('content-type', contentType || 'application/json');
      input.res.send(text);
    } else {
      input.res.status(200).json({
        success: true,
        data: { text: assistantText || text },
      });
    }

    await touchCredential(input.route.credentialId, true);
    await recordAttempt({
      ownerId: input.ownerId,
      route: input.route,
      usageRoute: input.usageRoute,
      started,
      ok: true,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
    });
    return 'success';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await touchCredential(input.route.credentialId, false, message);
    await recordAttempt({
      ownerId: input.ownerId,
      route: input.route,
      usageRoute: input.usageRoute,
      started,
      ok: false,
      errorCode: 'network_error',
    });

    if (input.route.strictOnly || !input.route.sharedFallback) {
      openAiError(input.res, 502, message);
      return 'failed';
    }
    return 'fallback';
  }
}

/** @deprecated use attemptByokProviderChat */
export async function attemptByokOpenAiChat(input: {
  body: { messages?: OpenAiChatMessage[]; stream?: boolean; temperature?: number; max_tokens?: number };
  route: ByokProviderRoute;
  ownerId: string;
  responseModel: string;
  res: ExpressResponse;
}): Promise<ByokChatAttempt> {
  return attemptByokProviderChat({
    route: input.route,
    ownerId: input.ownerId,
    messages: Array.isArray(input.body.messages) ? input.body.messages : [],
    stream: Boolean(input.body.stream),
    temperature: input.body.temperature,
    max_tokens: input.body.max_tokens,
    usageRoute: 'openai',
    res: input.res,
  });
}
