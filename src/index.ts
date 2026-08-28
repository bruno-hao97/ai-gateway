import express from 'express';
import gommoProxyRoutes from './routes/gommoProxy.js';
import gatewayRoutes from './routes/gateway.js';
import uploadRoutes from './routes/upload.js';
import chatRoutes from './routes/chat.js';
import audioRoutes from './routes/audio.js';
import usageRoutes from './routes/usage.js';
import adminRoutes from './routes/admin.js';
import billingRoutes from './routes/billing.js';
import portalRoutes from './routes/portal.js';
import { config, isAdminConfigured, isGommoMerchantConfigured, isPayOsConfigured, isPortalEnabled } from './config.js';
import { gatewayCors } from './middleware/cors.js';
import { adminRateLimit, billingRateLimit, gatewayRateLimit } from './middleware/rateLimit.js';
import { sendError } from './utils/errors.js';

const app = express();

// Portal static — mount TRƯỚC CORS (ES module scripts send Origin; must not 403 same-origin).
if (isPortalEnabled()) {
  app.use('/portal', portalRoutes);
  app.get('/', (_req, res) => {
    res.redirect('/portal/');
  });
}

const corsMiddleware = gatewayCors();
if (corsMiddleware) {
  app.use(corsMiddleware);
}

// Gommo pass-through proxy — mount TRƯỚC express.json vì cần raw body.
app.use(gommoProxyRoutes);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      ok: true,
      merchantConfigured: isGommoMerchantConfigured(),
      adminConfigured: isAdminConfigured(),
      payosConfigured: isPayOsConfigured(),
    },
  });
});

const gatewayMount = express.Router();
gatewayMount.use(gatewayRoutes);
gatewayMount.use(uploadRoutes);
gatewayMount.use(chatRoutes);
gatewayMount.use(audioRoutes);
gatewayMount.use(usageRoutes);
app.use('/gateway', gatewayRateLimit, gatewayMount);

app.use('/admin', adminRateLimit, adminRoutes);

app.use('/billing', billingRateLimit, billingRoutes);

app.use((_req, res) => {
  sendError(res, 404, 'Not found');
});

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message === 'Not allowed by CORS') {
    sendError(res, 403, message, 'FORBIDDEN');
    return;
  }
  console.error('[gateway]', message);
  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
});

app.listen(config.port, () => {
  const portal = isPortalEnabled() ? ` · portal http://localhost:${config.port}/portal/` : '';
  console.log(`AI gateway http://localhost:${config.port} (Gommo proxy + REST gateway + admin${portal})`);
});
