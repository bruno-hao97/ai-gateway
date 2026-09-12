import { Router } from 'express';
import { gatewayAuth, getGatewayAuth, readDomain } from '../middleware/gatewayAuth.js';
import { sendError } from '../utils/errors.js';
import { ByokIdentityError, resolveByokOwner } from '../services/byokIdentity.js';
import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  isAllowedWebhookUrl,
  listWebhooks,
  updateWebhook,
} from '../services/observabilityStore.js';
import { sendTestWebhook } from '../services/observabilityWebhook.js';

const router = Router();
router.use(gatewayAuth);

async function ownerFromReq(req: import('express').Request) {
  const auth = getGatewayAuth(req);
  return resolveByokOwner(auth.accessToken, readDomain(req));
}

function sendIdentityError(res: import('express').Response, err: unknown): void {
  if (err instanceof ByokIdentityError) {
    sendError(res, err.status, err.message, err.code === 'AUTH_REQUIRED' ? 'UNAUTHORIZED' : 'FORBIDDEN');
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  sendError(res, 500, message, 'INTERNAL_ERROR');
}

/** GET /gateway/observability/webhooks */
router.get('/webhooks', async (req, res) => {
  try {
    const owner = await ownerFromReq(req);
    const webhooks = await listWebhooks(owner.ownerId);
    res.json({ success: true, data: { webhooks, ownerId: owner.ownerId } });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** POST /gateway/observability/webhooks — body: { url, label?, secret? } */
router.post('/webhooks', async (req, res) => {
  try {
    const owner = await ownerFromReq(req);
    const { url, label, secret } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      sendError(res, 400, 'url is required', 'VALIDATION_ERROR');
      return;
    }
    if (!isAllowedWebhookUrl(url)) {
      sendError(res, 400, 'url must be https (http allowed only for localhost)', 'VALIDATION_ERROR');
      return;
    }

    const webhook = await createWebhook({
      ownerId: owner.ownerId,
      url,
      label: typeof label === 'string' ? label : undefined,
      secret: typeof secret === 'string' ? secret : undefined,
    });
    res.json({ success: true, data: webhook });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Maximum')) {
      sendError(res, 400, err.message, 'VALIDATION_ERROR');
      return;
    }
    sendIdentityError(res, err);
  }
});

/** PATCH /gateway/observability/webhooks/:id — body: { enabled?, label? } */
router.patch('/webhooks/:id', async (req, res) => {
  try {
    const owner = await ownerFromReq(req);
    const { enabled, label } = req.body ?? {};
    const webhook = await updateWebhook(owner.ownerId, req.params.id, {
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      label: typeof label === 'string' ? label : undefined,
    });
    if (!webhook) {
      sendError(res, 404, 'Webhook not found', 'VALIDATION_ERROR');
      return;
    }
    res.json({ success: true, data: webhook });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** DELETE /gateway/observability/webhooks/:id */
router.delete('/webhooks/:id', async (req, res) => {
  try {
    const owner = await ownerFromReq(req);
    const deleted = await deleteWebhook(owner.ownerId, req.params.id);
    if (!deleted) {
      sendError(res, 404, 'Webhook not found', 'VALIDATION_ERROR');
      return;
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** POST /gateway/observability/webhooks/:id/test */
router.post('/webhooks/:id/test', async (req, res) => {
  try {
    const owner = await ownerFromReq(req);
    const webhook = await getWebhook(owner.ownerId, req.params.id);
    if (!webhook) {
      sendError(res, 404, 'Webhook not found', 'VALIDATION_ERROR');
      return;
    }
    const result = await sendTestWebhook(owner.ownerId, webhook);
    res.json({ success: result.ok, data: result, message: result.error });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

export default router;
