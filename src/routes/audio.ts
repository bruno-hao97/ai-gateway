import { Router } from 'express';
import { AudioApi, type VoiceProvider } from '../services/audioApi.js';
import {
  gatewayAuth,
  getGatewayAuth,
  readDomain,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import { sendError } from '../utils/errors.js';

const VOICE_SERVERS = new Set<VoiceProvider>([
  'elevenlabs_cheap',
  'minimaxai_cheap',
  'omnivoice_local',
]);

function audioClient(req: import('express').Request, projectId?: string): AudioApi {
  const auth = getGatewayAuth(req);
  const bodyProjectId =
    req.body && typeof req.body.projectId === 'string' ? req.body.projectId : undefined;
  const queryProjectId =
    typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  return new AudioApi({
    accessToken: auth.accessToken,
    domain: readDomain(req),
    projectId: projectId || bodyProjectId || queryProjectId || 'default',
  });
}

const router = Router();
router.use(gatewayAuth);

/** POST /gateway/audio/voices */
router.post('/audio/voices', async (req, res) => {
  try {
    const { server, page, query, projectId } = req.body ?? {};
    if (!server || !VOICE_SERVERS.has(server)) {
      sendError(
        res,
        400,
        'server phải là elevenlabs_cheap|minimaxai_cheap|omnivoice_local',
        'VALIDATION_ERROR',
      );
      return;
    }
    const result = await audioClient(req, projectId).searchVoices({
      server,
      page: typeof page === 'number' ? page : Number(page) || 0,
      query: typeof query === 'string' ? query : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** POST /gateway/audio/tts */
router.post('/audio/tts', async (req, res) => {
  try {
    const { text, voice_id, server, model, voice_name, language, voice_settings, projectId } =
      req.body ?? {};
    if (!text || typeof text !== 'string') {
      sendError(res, 400, 'text bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    if (!voice_id || typeof voice_id !== 'string') {
      sendError(res, 400, 'voice_id bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    if (!server || !VOICE_SERVERS.has(server)) {
      sendError(res, 400, 'server không hợp lệ', 'VALIDATION_ERROR');
      return;
    }
    if (!model || typeof model !== 'string') {
      sendError(res, 400, 'model bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    const result = await audioClient(req, projectId).createTts({
      text,
      voice_id,
      server,
      model,
      voice_name,
      language,
      voice_settings,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** GET /gateway/audio/lists?projectId= */
router.get('/audio/lists', async (req, res) => {
  try {
    const lists = await audioClient(req).getLists();
    res.json({ success: true, data: lists });
  } catch (err) {
    sendGommoError(res, err);
  }
});

export default router;
