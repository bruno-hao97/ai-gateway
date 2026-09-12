import { Router } from 'express';
import { config, isByokEnabled, isByokBeta } from '../config.js';
import {
  gatewayAuth,
  getGatewayAuth,
  readDomain,
} from '../middleware/gatewayAuth.js';
import { sendError } from '../utils/errors.js';
import { ByokIdentityError, resolveByokOwner } from '../services/byokIdentity.js';
import {
  countCredentialsByProvider,
  createGommoAccount,
  createProviderCredential,
  deleteCredential,
  getCredential,
  getDecryptedSecret,
  hasGommoAccounts,
  listCredentials,
  listProviderCatalog,
  setPrimaryGommoAccount,
  updateCredential,
  type ByokProviderSlug,
} from '../services/byokStore.js';
import { testOpenAiCredential } from '../services/byokOpenAi.js';
import { testAnthropicCredential } from '../services/byokAnthropic.js';
import { listByokUsage, summarizeByokUsage } from '../services/byokUsage.js';
import { listByokModelMapSummaries } from '../services/byokModelMap.js';
import { readPrimaryGommoAccountSummary } from '../services/byokGatewayAuth.js';
import {
  getPlatformFeeLedger,
  readUserPlatformCredits,
} from '../services/byokPlatformFee.js';

const router = Router();
router.use(gatewayAuth);

function byokDisabled(_req: import('express').Request, res: import('express').Response): boolean {
  if (isByokEnabled()) return false;
  sendError(res, 503, 'BYOK is disabled on this gateway', 'NOT_CONFIGURED');
  return true;
}

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

function isProviderSlug(value: string): value is Exclude<ByokProviderSlug, 'gommo'> {
  return value === 'openai' || value === 'anthropic';
}

/** GET /gateway/byok/status */
router.get('/status', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const providerCounts = await countCredentialsByProvider(owner.ownerId);
    const gommoLinked = await hasGommoAccounts(owner.ownerId);
    const primaryGommo = await readPrimaryGommoAccountSummary({
      sessionAccessToken: getGatewayAuth(req).accessToken,
      sessionDomain: readDomain(req),
    });
    const platformFees = await getPlatformFeeLedger(owner.ownerId);
    const platformCredits = await readUserPlatformCredits(
      getGatewayAuth(req).accessToken,
      readDomain(req),
    ).catch(() => 0);
    const providers = listProviderCatalog().map((provider) => ({
      ...provider,
      configured: (providerCounts[provider.slug] || 0) > 0,
      credentialCount: providerCounts[provider.slug] || 0,
    }));
    const supportedChatModels = await listByokModelMapSummaries();

    res.json({
      success: true,
      data: {
        enabled: true,
        beta: isByokBeta(),
        platformFeePercent: config.byok.platformFeePercent,
        platformFeePerRequest: config.byok.platformFeePerRequest,
        defaultSharedFallback: config.byok.defaultSharedFallback,
        gommoLinked,
        primaryGommo,
        platformFees,
        platformCredits,
        providers,
        supportedChatModels,
        ownerId: owner.ownerId,
      },
    });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** GET /gateway/byok/providers */
router.get('/providers', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const providerCounts = await countCredentialsByProvider(owner.ownerId);
    res.json({
      success: true,
      data: listProviderCatalog().map((provider) => ({
        ...provider,
        configured: (providerCounts[provider.slug] || 0) > 0,
        credentialCount: providerCounts[provider.slug] || 0,
      })),
    });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** GET /gateway/byok/credentials?kind=provider|gommo */
router.get('/credentials', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const kindRaw = typeof req.query.kind === 'string' ? req.query.kind.trim() : '';
    const kind = kindRaw === 'provider' || kindRaw === 'gommo' ? kindRaw : undefined;
    const data = await listCredentials(owner.ownerId, kind);
    res.json({ success: true, data });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** POST /gateway/byok/credentials — provider key */
router.post('/credentials', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const providerSlug = String(req.body?.providerSlug || req.body?.provider || '').trim().toLowerCase();
    const secret = String(req.body?.secret || req.body?.apiKey || '').trim();

    if (!isProviderSlug(providerSlug)) {
      sendError(res, 400, 'providerSlug must be openai or anthropic', 'VALIDATION_ERROR');
      return;
    }
    if (!config.byok.providers.includes(providerSlug)) {
      sendError(res, 400, `Provider ${providerSlug} is not enabled on this gateway`, 'VALIDATION_ERROR');
      return;
    }
    if (!secret) {
      sendError(res, 400, 'secret is required', 'VALIDATION_ERROR');
      return;
    }

    const data = await createProviderCredential({
      ownerId: owner.ownerId,
      providerSlug,
      secret,
      label: typeof req.body?.label === 'string' ? req.body.label : undefined,
      allowedModels: Array.isArray(req.body?.allowedModels) ? req.body.allowedModels : null,
      isFallback: Boolean(req.body?.isFallback),
      strictOnly: Boolean(req.body?.strictOnly),
      sharedFallback:
        typeof req.body?.sharedFallback === 'boolean'
          ? req.body.sharedFallback
          : undefined,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendError(res, 400, message, 'VALIDATION_ERROR');
  }
});

/** PATCH /gateway/byok/credentials/:id */
router.patch('/credentials/:id', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const patch: Parameters<typeof updateCredential>[2] = {};
    if (typeof req.body?.label === 'string') patch.label = req.body.label.trim();
    if (Array.isArray(req.body?.allowedModels) || req.body?.allowedModels === null) {
      patch.allowedModels = req.body.allowedModels;
    }
    if (typeof req.body?.priority === 'number') patch.priority = req.body.priority;
    if (typeof req.body?.isFallback === 'boolean') patch.isFallback = req.body.isFallback;
    if (typeof req.body?.strictOnly === 'boolean') patch.strictOnly = req.body.strictOnly;
    if (typeof req.body?.sharedFallback === 'boolean') patch.sharedFallback = req.body.sharedFallback;
    if (typeof req.body?.disabled === 'boolean') patch.disabled = req.body.disabled;

    const data = await updateCredential(owner.ownerId, req.params.id, patch);
    if (!data) {
      sendError(res, 404, 'Credential not found', 'VALIDATION_ERROR');
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** DELETE /gateway/byok/credentials/:id */
router.delete('/credentials/:id', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const removed = await deleteCredential(owner.ownerId, req.params.id);
    if (!removed) {
      sendError(res, 404, 'Credential not found', 'VALIDATION_ERROR');
      return;
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** POST /gateway/byok/credentials/:id/test */
router.post('/credentials/:id/test', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const cred = await getCredential(owner.ownerId, req.params.id);
    if (!cred) {
      sendError(res, 404, 'Credential not found', 'VALIDATION_ERROR');
      return;
    }

    if (cred.kind === 'gommo') {
      const domain = cred.gommoDomain || readDomain(req);
      const token = await getDecryptedSecret(cred);
      const ownerCheck = await resolveByokOwner(token, domain);
      res.json({
        success: true,
        data: { ok: true, message: `Gommo account @${ownerCheck.username || 'linked'} is valid` },
      });
      return;
    }

    const secret = await getDecryptedSecret(cred);
    if (cred.providerSlug === 'openai') {
      const result = await testOpenAiCredential(secret);
      res.json({ success: true, data: result });
      return;
    }
    if (cred.providerSlug === 'anthropic') {
      const result = await testAnthropicCredential(secret);
      res.json({ success: true, data: result });
      return;
    }

    res.json({
      success: true,
      data: { ok: false, message: `Provider ${cred.providerSlug} test not supported` },
    });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** POST /gateway/byok/gommo-accounts */
router.post('/gommo-accounts', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const auth = getGatewayAuth(req);
    const owner = await ownerFromReq(req);
    const domain = String(req.body?.domain || readDomain(req)).trim();
    const accessToken = String(req.body?.access_token || req.body?.accessToken || auth.accessToken).trim();
    const linked = await resolveByokOwner(accessToken, domain);

    const data = await createGommoAccount({
      ownerId: owner.ownerId,
      accessToken,
      domain,
      username: linked.username,
      label: typeof req.body?.label === 'string' ? req.body.label : undefined,
      setPrimary: req.body?.setPrimary !== false,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err instanceof ByokIdentityError) {
      sendIdentityError(res, err);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    sendError(res, 400, message, 'VALIDATION_ERROR');
  }
});

/** PATCH /gateway/byok/gommo-accounts/:id/primary */
router.patch('/gommo-accounts/:id/primary', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const data = await setPrimaryGommoAccount(owner.ownerId, req.params.id);
    if (!data) {
      sendError(res, 404, 'Gommo account not found', 'VALIDATION_ERROR');
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

/** GET /gateway/byok/usage?days=7&limit=50 */
router.get('/usage', async (req, res) => {
  if (byokDisabled(req, res)) return;
  try {
    const owner = await ownerFromReq(req);
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const summary = await summarizeByokUsage(owner.ownerId, days);
    const platformFees = await getPlatformFeeLedger(owner.ownerId);
    const events = await listByokUsage(owner.ownerId, limit);
    res.json({ success: true, data: { summary, platformFees, events, days } });
  } catch (err) {
    sendIdentityError(res, err);
  }
});

export default router;
