import { Router } from 'express';
import {
  fetchTopModelAggregate,
  normalizeAggregateGroupBy,
} from '../services/usageAggregateApi.js';
import {
  getCachedUsageAggregate,
  setCachedUsageAggregate,
  usageAggregateCacheKey,
} from '../services/usageAggregateCache.js';
import {
  UsageStatsApi,
  normalizeUsagePeriod,
  normalizeUsageType,
  type GommoDevicePayload,
} from '../services/usageStatsApi.js';
import {
  gatewayAuth,
  getGatewayAuth,
  readDomain,
  sendGommoError,
} from '../middleware/gatewayAuth.js';

const router = Router();
router.use(gatewayAuth);

function statsClient(req: import('express').Request, projectId?: string) {
  const auth = getGatewayAuth(req);
  const queryProjectId =
    typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  return new UsageStatsApi({
    accessToken: auth.accessToken,
    domain: readDomain(req),
    projectId: projectId || queryProjectId || 'default',
  });
}

function readField(req: import('express').Request, key: string): string {
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body && typeof body[key] === 'string' ? body[key].trim() : '';
  if (fromBody) return fromBody;
  const fromQuery = typeof req.query[key] === 'string' ? req.query[key].trim() : '';
  return fromQuery;
}

function readClientDevice(req: import('express').Request): GommoDevicePayload | undefined {
  const device_id = readField(req, 'device_id');
  const device_name = readField(req, 'device_name');
  const device_info = readField(req, 'device_info');
  if (!device_id || !device_name || !device_info) return undefined;
  return { device_id, device_name, device_info };
}

function readUsageParams(req: import('express').Request, forLogs = false) {
  const period = normalizeUsagePeriod(readField(req, 'period') || undefined);
  const type = normalizeUsageType(readField(req, 'type') || undefined);
  const language = readField(req, 'language') || (forLogs ? 'VI' : 'vi');
  const projectId = readField(req, 'project_id') || readField(req, 'projectId') || undefined;
  const page = Math.max(Number(readField(req, 'page')) || 1, 1);
  const limit = Math.min(Math.max(Number(readField(req, 'limit')) || 30, 1), 100);
  const device = readClientDevice(req);
  return { period, type, language, projectId, page, limit, device };
}

async function handleStats(req: import('express').Request, res: import('express').Response) {
  const { period, type, language, projectId, device } = readUsageParams(req);
  const data = await statsClient(req, projectId).fetchStats({
    period,
    type,
    language,
    device,
  });
  res.json({ success: true, data });
}

async function handleLogs(req: import('express').Request, res: import('express').Response) {
  const { period, type, language, projectId, page, limit, device } = readUsageParams(req, true);
  const data = await statsClient(req, projectId).fetchLogs({
    period,
    type,
    language,
    page,
    limit,
    device,
  });
  res.json({ success: true, data });
}

function readAggregateParams(req: import('express').Request) {
  const { period, type, language, projectId, device } = readUsageParams(req, true);
  const groupBy = normalizeAggregateGroupBy(readField(req, 'groupBy') || readField(req, 'group_by'));
  const top = Math.min(Math.max(Number(readField(req, 'top')) || 5, 1), 20);
  const maxPages = Math.min(Math.max(Number(readField(req, 'maxPages')) || 50, 1), 100);
  return { period, type, language, projectId, device, groupBy, top, maxPages };
}

async function handleAggregate(req: import('express').Request, res: import('express').Response) {
  const { period, type, language, projectId, device, groupBy, top, maxPages } = readAggregateParams(req);
  if (groupBy !== 'model') {
    res.status(400).json({
      success: false,
      message: 'groupBy must be "model"',
    });
    return;
  }

  const auth = getGatewayAuth(req);
  const cacheKey = usageAggregateCacheKey({
    token: auth.accessToken,
    domain: readDomain(req),
    projectId: projectId || 'default',
    period,
    type,
    language,
    top,
    maxPages,
    device_id: device?.device_id,
  });

  let data = getCachedUsageAggregate(cacheKey);
  if (!data) {
    data = await fetchTopModelAggregate(statsClient(req, projectId), {
      period,
      type,
      language,
      device,
      top,
      maxPages,
    });
    setCachedUsageAggregate(cacheKey, data);
  }

  res.json({ success: true, data });
}

/** POST /gateway/usage/stats — preferred (device in form body, like 79ai) */
router.post('/usage/stats', async (req, res) => {
  try {
    await handleStats(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** GET /gateway/usage/stats — legacy query */
router.get('/usage/stats', async (req, res) => {
  try {
    await handleStats(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** POST /gateway/usage/logs — per-job rows (79ai action=logs) */
router.post('/usage/logs', async (req, res) => {
  try {
    await handleLogs(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** GET /gateway/usage/logs */
router.get('/usage/logs', async (req, res) => {
  try {
    await handleLogs(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** POST /gateway/usage/aggregate — server-side top models (paginated logs) */
router.post('/usage/aggregate', async (req, res) => {
  try {
    await handleAggregate(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** GET /gateway/usage/aggregate */
router.get('/usage/aggregate', async (req, res) => {
  try {
    await handleAggregate(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** @deprecated Use POST /gateway/usage/logs */
router.post('/usage/list', async (req, res) => {
  try {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</gateway/usage/logs>; rel="successor-version"');
    await handleLogs(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** @deprecated Use GET /gateway/usage/logs */
router.get('/usage/list', async (req, res) => {
  try {
    res.setHeader('Deprecation', 'true');
    await handleLogs(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** @deprecated Use POST /gateway/usage/logs */
router.get('/usage/history', async (req, res) => {
  try {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</gateway/usage/logs>; rel="successor-version"');
    await handleLogs(req, res);
  } catch (err) {
    sendGommoError(res, err);
  }
});

export default router;
