import { Readable } from 'node:stream';
import { Router } from 'express';
import {
  gatewayAuth,
  getGatewayAuth,
  readDomain,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import {
  buildChatForm,
  forwardChat,
  type ChatAction,
  type ChatGatewayRequest,
} from '../services/gommoChat.js';
import { sendError } from '../utils/errors.js';

const CHAT_ACTIONS = new Set<ChatAction>(['chat', 'stream', 'set_model']);

const SKIP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
]);

const router = Router();
router.use(gatewayAuth);

/** POST /gateway/chat */
router.post('/chat', async (req, res) => {
  try {
    const body = req.body ?? {};
    const action = String(body.action || '') as ChatAction;
    if (!CHAT_ACTIONS.has(action)) {
      sendError(res, 400, 'action phải là chat|stream|set_model', 'VALIDATION_ERROR');
      return;
    }

    const auth = getGatewayAuth(req);
    const chatReq: ChatGatewayRequest = {
      action,
      query: typeof body.query === 'string' ? body.query : undefined,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      messages: Array.isArray(body.messages) ? body.messages : undefined,
      agentId: typeof body.agentId === 'string' ? body.agentId : undefined,
      server: typeof body.server === 'string' ? body.server : undefined,
      model: typeof body.model === 'string' ? body.model : undefined,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      accessToken: auth.accessToken,
      domain: readDomain(req),
    };

    const form = buildChatForm(chatReq);
    const upstream = await forwardChat(form, AbortSignal.timeout(120_000));

    if (!upstream.ok) {
      const text = await upstream.text();
      sendError(res, upstream.status, text || `Upstream chat HTTP ${upstream.status}`, 'UPSTREAM_ERROR');
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? '';

    if (action === 'stream' || contentType.includes('text/event-stream')) {
      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      if (!res.getHeader('content-type')) {
        res.setHeader('content-type', 'text/event-stream');
      }
      if (upstream.body) {
        const stream = Readable.fromWeb(upstream.body as import('stream/web').ReadableStream);
        stream.on('error', () => {
          if (!res.headersSent) res.status(502).end();
          else res.destroy();
        });
        res.on('close', () => stream.destroy());
        stream.pipe(res);
        return;
      }
      res.end(await upstream.text());
      return;
    }

    if (contentType.includes('application/json')) {
      res.status(upstream.status).type('application/json').send(await upstream.text());
      return;
    }

    res.status(upstream.status).type(contentType || 'text/plain').send(await upstream.text());
  } catch (err) {
    sendGommoError(res, err);
  }
});

export default router;
