import { Readable } from 'node:stream';
import { Router, type Request, type Response } from 'express';
import {
  gatewayAuth,
  getGatewayAuth,
  readDomain,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import {
  buildChatForm,
  buildChatSessionActionForm,
  buildSaveMessageForm,
  CHAT_SESSION_ACTIONS,
  forwardChat,
  forwardChatSession,
  runAgentChat,
  type ChatAction,
  type ChatDeviceFields,
  type ChatGatewayRequest,
  type SaveMessageRequest,
} from '../services/gommoChat.js';
import { chatModelsCatalogResponse } from '../services/chatModels.js';
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

/** GET /gateway/chat-models — catalog for portal model picker */
router.get('/chat-models', (_req, res) => {
  res.json(chatModelsCatalogResponse());
});

function readDevice(body: Record<string, unknown> | undefined): ChatDeviceFields | undefined {
  if (!body) return undefined;
  const device_id = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  const device_name = typeof body.device_name === 'string' ? body.device_name.trim() : '';
  const device_info = typeof body.device_info === 'string' ? body.device_info : '';
  const debug_info = typeof body.debug_info === 'string' ? body.debug_info : '';
  if (!device_id && !device_name && !device_info) {
    const nested = body.device;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return readDevice(nested as Record<string, unknown>);
    }
    return undefined;
  }
  return {
    device_id: device_id || undefined,
    device_name: device_name || undefined,
    device_info: device_info || undefined,
    debug_info: debug_info || undefined,
  };
}

function buildChatRequest(req: Request, action: ChatAction): ChatGatewayRequest {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const auth = getGatewayAuth(req);
  return {
    action,
    query: typeof body.query === 'string' ? body.query : undefined,
    sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
    messages: Array.isArray(body.messages) ? body.messages : undefined,
    agentId: typeof body.agentId === 'string' ? body.agentId : undefined,
    server: typeof body.server === 'string' ? body.server : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    systemCustomPrompt:
      typeof body.systemCustomPrompt === 'string' ? body.systemCustomPrompt : undefined,
    customSystemPrompt:
      typeof body.customSystemPrompt === 'string' ? body.customSystemPrompt : undefined,
    accessToken: auth.accessToken,
    domain: readDomain(req),
    device: readDevice(body),
  };
}

async function pipeUpstreamResponse(
  res: Response,
  upstream: globalThis.Response,
  action: ChatAction,
): Promise<void> {
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
}

/** POST /gateway/chat — action: set_model | chat | stream | agent */
router.post('/chat', async (req, res) => {
  try {
    const body = req.body ?? {};
    const actionRaw = String(body.action || '') as ChatAction | 'agent';

    if (actionRaw === 'agent') {
      const chatReq = buildChatRequest(req, 'chat');
      const upstream = await runAgentChat(chatReq, AbortSignal.timeout(120_000));
      await pipeUpstreamResponse(res, upstream, 'chat');
      return;
    }

    const action = actionRaw as ChatAction;
    if (!CHAT_ACTIONS.has(action)) {
      sendError(res, 400, 'action phải là chat|stream|set_model|agent', 'VALIDATION_ERROR');
      return;
    }

    const chatReq = buildChatRequest(req, action);
    const form = buildChatForm(chatReq);
    const upstream = await forwardChat(form, AbortSignal.timeout(120_000));
    await pipeUpstreamResponse(res, upstream, action);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** POST /gateway/chat-sessions — save_message | list_sessions | get_messages | get_session */
router.post('/chat-sessions', async (req, res) => {
  try {
    const body = req.body ?? {};
    const action = String(body.action || '');
    if (!CHAT_SESSION_ACTIONS.has(action)) {
      sendError(
        res,
        400,
        'action phải là save_message|list_sessions|get_messages|get_session',
        'VALIDATION_ERROR',
      );
      return;
    }

    const auth = getGatewayAuth(req);
    const device = readDevice(body);

    if (action === 'save_message') {
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
      const messageId = typeof body.messageId === 'string' ? body.messageId : '';
      const role = body.role === 'model' ? 'model' : body.role === 'user' ? 'user' : '';
      const text = typeof body.text === 'string' ? body.text : '';

      if (!sessionId || !messageId || !role || !text) {
        sendError(res, 400, 'sessionId, messageId, role, text are required', 'VALIDATION_ERROR');
        return;
      }

      const saveReq: SaveMessageRequest = {
        accessToken: auth.accessToken,
        domain: readDomain(req),
        sessionId,
        messageId,
        role,
        text,
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
        metadata:
          body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
            ? (body.metadata as Record<string, unknown>)
            : { version: 1 },
        device,
      };

      const form = buildSaveMessageForm(saveReq);
      const upstream = await forwardChatSession(form, AbortSignal.timeout(30_000));
      const textBody = await upstream.text();

      if (!upstream.ok) {
        sendError(res, upstream.status, textBody || `Upstream HTTP ${upstream.status}`, 'UPSTREAM_ERROR');
        return;
      }

      res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(textBody);
      return;
    }

    const fields: Record<string, string> = {};
    if (action !== 'list_sessions') {
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
      if (!sessionId) {
        sendError(res, 400, 'sessionId is required', 'VALIDATION_ERROR');
        return;
      }
      fields.session_id = sessionId;
    }
    if (typeof body.limit === 'number' && !Number.isNaN(body.limit)) {
      fields.limit = String(body.limit);
    }
    if (typeof body.offset === 'number' && !Number.isNaN(body.offset)) {
      fields.offset = String(body.offset);
    }
    if (typeof body.cursor === 'string' && body.cursor.trim()) {
      fields.cursor = body.cursor.trim();
    }

    const form = buildChatSessionActionForm(
      action,
      auth.accessToken,
      readDomain(req),
      fields,
      device,
    );
    const upstream = await forwardChatSession(form, AbortSignal.timeout(30_000));
    const textBody = await upstream.text();

    if (!upstream.ok) {
      sendError(res, upstream.status, textBody || `Upstream HTTP ${upstream.status}`, 'UPSTREAM_ERROR');
      return;
    }

    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(textBody);
  } catch (err) {
    sendGommoError(res, err);
  }
});

export default router;
