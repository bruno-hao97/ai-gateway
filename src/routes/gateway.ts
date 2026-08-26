import { Router, type Request, type Response } from 'express';
import {
  clientFromReq,
  gatewayAuth,
  gatewayAuthOptional,
  readDomain,
  readOptionalBearerToken,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import { fetchModelsCatalog } from '../services/gommoClient.js';
import { enrichModelsCatalogLanguage } from '../services/catalogLang.js';
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

/** GET /gateway/models?type=image&lang=en — Bearer optional; lang=en merges EN descriptions from cache */
router.get('/models', gatewayAuthOptional, async (req, res) => {
  try {
    const type = String(req.query.type || '') as JobType;
    if (!JOB_TYPES.has(type)) {
      sendError(res, 400, 'Query type không hợp lệ', 'VALIDATION_ERROR');
      return;
    }
    const lang = String(req.query.lang || '').toLowerCase();
    if (lang && lang !== 'en' && lang !== 'vi') {
      sendError(res, 400, 'Query lang chỉ hỗ trợ en hoặc vi', 'VALIDATION_ERROR');
      return;
    }
    const envelope = await fetchModelsCatalog(type, readDomain(req), readOptionalBearerToken(req));
    await enrichModelsCatalogLanguage(envelope, lang === 'en' ? 'en' : undefined);
    res.json(envelope);
  } catch (err) {
    sendGommoError(res, err);
  }
});

router.use(gatewayAuth);

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
