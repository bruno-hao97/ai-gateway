import { Router } from 'express';
import {
  gatewayAuth,
  getGatewayAuth,
  readDomain,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import {
  handleOpenAiChatCompletion,
  listOpenAiModels,
  type OpenAiChatCompletionRequest,
} from '../services/openaiChat.js';

const router = Router();

function openAiError(res: import('express').Response, status: number, message: string, type = 'invalid_request_error') {
  res.status(status).json({
    error: {
      message,
      type,
      param: null,
      code: type,
    },
  });
}

/** GET /v1/models — OpenAI-compatible model list */
router.get('/models', gatewayAuth, (_req, res) => {
  res.json(listOpenAiModels());
});

/** POST /v1/chat/completions — OpenAI-compatible chat (maps to Gommo chat) */
router.post('/chat/completions', gatewayAuth, async (req, res) => {
  try {
    const body = (req.body ?? {}) as OpenAiChatCompletionRequest;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      openAiError(res, 400, 'messages is required and must be a non-empty array');
      return;
    }

    const auth = getGatewayAuth(req);
    await handleOpenAiChatCompletion(body, auth.accessToken, readDomain(req), res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('messages is required')) {
      openAiError(res, 400, message);
      return;
    }
    sendGommoError(res, err);
  }
});

export default router;
