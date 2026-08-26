import 'dotenv/config';
import path from 'node:path';

const appUrl = (process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');

export const config = {
  port: Number(process.env.PORT) || 3001,
  appUrl,
  gommo: {
    baseUrl: process.env.GOMMO_API_BASE_URL || process.env.GOMMO_BASE_URL || 'https://v2.api.gommo.net',
    authBaseUrl: process.env.GOMMO_AUTH_BASE_URL || 'https://api.gommo.net',
    authPath: process.env.GOMMO_AUTH_PATH || '/api/apps/go-mmo',
    apiDomain: (process.env.GOMMO_API_DOMAIN || '79ai.net').trim(),
    /** Server-only — sendBalances / register. Không log, không expose ra client. */
    accessToken: (process.env.GOMMO_ACCESS_TOKEN || '').trim(),
    managerId: (process.env.GOMMO_MANAGER_ID || 'c8f06b2317880f42').trim(),
    registerExpiredTime: (process.env.GOMMO_REGISTER_EXPIRED_TIME || '999').trim(),
    chatAgentId: (process.env.GOMMO_CHAT_AGENT_ID || '560ee19d40623da6851a1bd0af0930dd').trim(),
    chatServer: (process.env.GOMMO_CHAT_SERVER || 'cheap').trim(),
    chatModel: (process.env.GOMMO_CHAT_MODEL || 'gpt-5.5::cheap').trim(),
    chatProjectId: (process.env.GOMMO_CHAT_PROJECT_ID || 'default').trim(),
    chatSource: (process.env.GOMMO_CHAT_SOURCE || 'vmedia').trim(),
  },
  topup: {
    merchantBufferCredits: Number(process.env.TOPUP_MERCHANT_BUFFER_CREDITS) || 300_000,
    creditsPerVnd: Number(process.env.TOPUP_CREDITS_PER_VND) || 1,
    ordersFile: process.env.TOPUP_ORDERS_FILE || path.join(process.cwd(), 'data', 'topup-orders.json'),
  },
  payos: {
    clientId: (process.env.PAYOS_CLIENT_ID || '').trim().replace(/\r/g, ''),
    apiKey: (process.env.PAYOS_API_KEY || '').trim().replace(/\r/g, ''),
    checksumKey: (process.env.PAYOS_CHECKSUM_KEY || '').trim().replace(/\r/g, ''),
    webhookUrl: (process.env.PAYOS_WEBHOOK_URL || '').trim().replace(/\r/g, ''),
    returnUrl: (process.env.PAYOS_RETURN_URL || `${appUrl}/portal/`).trim(),
    cancelUrl: (process.env.PAYOS_CANCEL_URL || `${appUrl}/portal/`).trim(),
  },
  adminApiKey: (process.env.ADMIN_API_KEY || '').trim(),
  /** Comma-separated origins, e.g. https://app.example.com — empty = CORS off */
  corsOrigins: (process.env.GATEWAY_CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimit: {
    windowMs: Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS) || 60_000,
    gatewayMax: Number(process.env.GATEWAY_RATE_LIMIT_MAX) || 120,
    adminMax: Number(process.env.ADMIN_RATE_LIMIT_MAX) || 30,
    billingMax: Number(process.env.BILLING_RATE_LIMIT_MAX) || 60,
  },
  catalog: {
    descriptionCacheFile:
      process.env.CATALOG_DESCRIPTION_CACHE_FILE ||
      path.join(process.cwd(), 'cache', 'catalog-descriptions.en.json'),
    translateApiKey: (process.env.OPENROUTER_API_KEY || process.env.CATALOG_TRANSLATE_API_KEY || '').trim(),
    translateBaseUrl: (process.env.CATALOG_TRANSLATE_BASE_URL || 'https://openrouter.ai/api/v1').trim(),
    translateModel: (process.env.CATALOG_TRANSLATE_MODEL || 'google/gemini-2.0-flash-001').trim(),
    translateBatchSize: Number(process.env.CATALOG_TRANSLATE_BATCH_SIZE) || 25,
    /** Live translate cache misses on GET /gateway/models?lang=en (default off — warm cache offline) */
    translateOnRequest: process.env.CATALOG_TRANSLATE_ON_REQUEST === 'true',
  },
};

export function isGommoMerchantConfigured(): boolean {
  return Boolean(config.gommo.accessToken && config.gommo.apiDomain);
}

export function isGommoRegisterConfigured(): boolean {
  return Boolean(config.gommo.accessToken && config.gommo.apiDomain && config.gommo.managerId);
}

export function isAdminConfigured(): boolean {
  return Boolean(config.adminApiKey);
}

export function isPayOsConfigured(): boolean {
  return Boolean(config.payos.clientId && config.payos.apiKey && config.payos.checksumKey);
}

export function vndToCredits(amountVnd: number): number {
  return Math.floor(amountVnd * config.topup.creditsPerVnd);
}

/** Dev portal at /portal — off in production unless GATEWAY_PORTAL=true */
export function isPortalEnabled(): boolean {
  if (process.env.GATEWAY_PORTAL === 'false') return false;
  if (process.env.GATEWAY_PORTAL === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}
