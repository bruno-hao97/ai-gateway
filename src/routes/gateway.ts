import { Router, type Request, type Response } from 'express';
import {
  clientFromReq,
  gatewayAuth,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import { createJobAndPoll } from '../services/polling.js';
import type { JobType, PollMedia } from '../types/gommo.js';
import { sendError } from '../utils/errors.js';

const JOB_TYPES = new Set<JobType>([
  'image',
  'video',
  'tts',
  'music',
  'avatar-lipsync',
  'image-upscale',
  'remove-bg',
  'video-upscale',
  'video-vfx',
  'video-subtitle',
  'video-cut',
]);

const POLL_MEDIA = new Set<PollMedia>(['image', 'video', 'music']);

const router = Router();
router.use(gatewayAuth);

/** GET /gateway/models?type=image — domain optional (default GOMMO_API_DOMAIN) */
router.get('/models', async (req, res) => {
  try {
    const type = String(req.query.type || '') as JobType;
    if (!JOB_TYPES.has(type)) {
      sendError(res, 400, 'Query type không hợp lệ', 'VALIDATION_ERROR');
      return;
    }
    const envelope = await clientFromReq(req).fetchModels(type);
    res.json(envelope);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** POST /gateway/jobs/:type — body: { modelSlug, fields, wait?: boolean, domain?: string } */
router.post('/jobs/:type', async (req, res) => {
  try {
    const type = req.params.type as JobType;
    if (!JOB_TYPES.has(type)) {
      sendError(res, 400, 'Job type không hợp lệ', 'VALIDATION_ERROR');
      return;
    }

    const { modelSlug, fields, wait } = req.body ?? {};
    if (!modelSlug || typeof modelSlug !== 'string') {
      sendError(res, 400, 'modelSlug bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    if (fields != null && (typeof fields !== 'object' || Array.isArray(fields))) {
      sendError(res, 400, 'fields phải là object', 'VALIDATION_ERROR');
      return;
    }

    const client = clientFromReq(req);
    const jobFields = (fields ?? {}) as Record<string, unknown>;

    if (!wait) {
      const envelope = await client.createJob(type, modelSlug, jobFields);
      res.json(envelope);
      return;
    }

    const result = await createJobAndPoll(client, type, modelSlug, jobFields);
    res.json({
      success: result.pollResult?.success !== false || Boolean(result.resultUrl),
      data: result,
      message: result.pollResult?.error,
    });
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** GET /gateway/jobs/:id?media=image|video|music */
router.get('/jobs/:id', async (req, res) => {
  try {
    const media = String(req.query.media || '') as PollMedia;
    if (!POLL_MEDIA.has(media)) {
      sendError(res, 400, 'Query media=image|video|music bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    const envelope = await clientFromReq(req).pollOnce(req.params.id, media);
    res.json(envelope);
  } catch (err) {
    sendGommoError(res, err);
  }
});

export default router;
