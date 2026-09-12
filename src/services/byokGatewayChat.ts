import type { Response } from 'express';
import { isByokEnabled } from '../config.js';
import { attemptByokProviderChat, ensureByokPlatformFeeAllowance, PlatformFeeError } from './byokChatHandler.js';
import { resolveByokOwner } from './byokIdentity.js';
import {
  chatRequestToOpenAiMessages,
  modelFieldFromChatRequest,
  openAiMessagesWithSystem,
} from './byokMessages.js';
import { resolveByokChatRoute } from './byokResolver.js';
import type { ChatAction, ChatGatewayRequest } from './gommoChat.js';
import { recordByokUsage } from './byokUsage.js';

export type ByokGatewayOutcome = 'handled' | 'fallback' | 'failed';

export async function tryByokGatewayChat(input: {
  chatReq: ChatGatewayRequest;
  res: Response;
  action: ChatAction;
}): Promise<ByokGatewayOutcome> {
  if (!isByokEnabled()) return 'fallback';
  if (input.action !== 'chat' && input.action !== 'stream') return 'fallback';

  let ownerId = '';
  try {
    const owner = await resolveByokOwner(input.chatReq.accessToken, input.chatReq.domain);
    ownerId = owner.ownerId;
  } catch {
    return 'fallback';
  }

  const modelField = modelFieldFromChatRequest(input.chatReq);
  const route = await resolveByokChatRoute({ ownerId, modelField });
  if (route.mode !== 'byok') return 'fallback';

  try {
    await ensureByokPlatformFeeAllowance({
      ownerId,
      accessToken: input.chatReq.accessToken,
      domain: input.chatReq.domain,
    });
  } catch (err) {
    if (err instanceof PlatformFeeError) {
      input.res.status(err.status).json({
        success: false,
        message: err.message,
        code: err.code,
        data: {
          availableCredits: err.availableCredits,
          requiredCredits: err.requiredCredits,
        },
      });
      return 'handled';
    }
    return 'fallback';
  }

  const { messages, system } = chatRequestToOpenAiMessages(input.chatReq);
  const attempt = await attemptByokProviderChat({
    route,
    ownerId,
    messages: openAiMessagesWithSystem(messages, system),
    stream: input.action === 'stream',
    system,
    usageRoute: 'chat',
    res: input.res,
  });

  if (attempt === 'success' || attempt === 'failed') return 'handled';
  return 'fallback';
}

export async function recordPlatformChatUsage(input: {
  accessToken: string;
  domain: string;
  model?: string;
  started: number;
  ok: boolean;
  errorCode?: string;
}): Promise<void> {
  if (!isByokEnabled()) return;
  try {
    const owner = await resolveByokOwner(input.accessToken, input.domain);
    await recordByokUsage({
      ownerId: owner.ownerId,
      source: 'platform',
      route: 'chat',
      provider: 'gommo',
      model: String(input.model || 'gommo-chat'),
      latencyMs: Date.now() - input.started,
      ok: input.ok,
      errorCode: input.errorCode,
    });
  } catch {
    /* ignore */
  }
}
