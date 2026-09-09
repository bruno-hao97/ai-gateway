/** Gateway base URL — dev: same-origin; prod: VITE_GATEWAY_URL injected at docs:build. */
(function (global) {
  const DEFAULT_API = 'http://localhost:3001';
  const STORAGE_BASE = 'portal_base_url';

  // @build:gateway-url
  if (typeof global.__PORTAL_GATEWAY_URL__ === 'undefined') {
    global.__PORTAL_GATEWAY_URL__ = '';
  }

  function isLocalHost() {
    const h = global.location?.hostname || '';
    return h === 'localhost' || h === '127.0.0.1';
  }

  function resolveGatewayBaseUrl() {
    try {
      const saved = global.localStorage?.getItem(STORAGE_BASE);
      if (saved) return saved.replace(/\/$/, '');
    } catch {
      /* private mode */
    }

    const injected = String(global.__PORTAL_GATEWAY_URL__ || '')
      .trim()
      .replace(/\/$/, '');
    if (injected) return injected;

    const origin = (global.location?.origin || '').replace(/\/$/, '');
    const port = global.location?.port || '';

    // VitePress :5173 or gateway-only :3001 — same-origin + proxy
    if (port === '5173' || port === '3001') return origin;

    // Local dev without docs proxy (e.g. serve portal on :5180)
    if (isLocalHost()) return DEFAULT_API;

    // Production: same-origin when /gateway is reverse-proxied on the docs domain
    return origin || DEFAULT_API;
  }

  global.PortalGatewayConfig = {
    DEFAULT_API,
    resolveBaseUrl: resolveGatewayBaseUrl,
  };
})(typeof window !== 'undefined' ? window : globalThis);
