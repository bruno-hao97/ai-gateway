const STORAGE_DEVICE_ID = 'gw_device_id';

/** Keys 79ai / Gommo web apps may use — import when migrating same browser profile. */
const LEGACY_DEVICE_ID_KEYS = ['gommo_device_id', 'device_id', 'DEVICE_ID'];

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  const fromUrl = new URLSearchParams(window.location.search).get('device_id')?.trim();
  if (fromUrl) {
    localStorage.setItem(STORAGE_DEVICE_ID, fromUrl);
    return fromUrl;
  }

  const existing = localStorage.getItem(STORAGE_DEVICE_ID)?.trim();
  if (existing) return existing;

  for (const key of LEGACY_DEVICE_ID_KEYS) {
    const legacy = localStorage.getItem(key)?.trim();
    if (legacy) {
      localStorage.setItem(STORAGE_DEVICE_ID, legacy);
      return legacy;
    }
  }

  const id = randomId();
  localStorage.setItem(STORAGE_DEVICE_ID, id);
  return id;
}

function parseBrowserName(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Safari';
  return 'Browser';
}

/** 79ai uses "Chrome 1", not the full Chrome major version in device_name. */
export function deviceName79ai(): string {
  if (typeof navigator === 'undefined') return 'Chrome 1';
  return `${parseBrowserName(navigator.userAgent)} 1`;
}

/** Etc/GMT sign is inverted: GMT-7 = UTC+7 (matches 79ai "Etc/GMT-7"). */
export function etcGmtTimezone(): string {
  if (typeof window === 'undefined') return 'Etc/GMT';
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (offsetHours === 0) return 'Etc/GMT';
  return offsetHours > 0 ? `Etc/GMT-${offsetHours}` : `Etc/GMT+${Math.abs(offsetHours)}`;
}

export interface DeviceScreenInfo {
  width: number;
  height: number;
  pixel_ratio: number;
  color_depth: number;
}

export function screenInfo79ai(): DeviceScreenInfo {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080, pixel_ratio: 1, color_depth: 24 };
  }
  return {
    width: window.screen.width,
    height: window.screen.height,
    pixel_ratio: window.devicePixelRatio || 1,
    color_depth: window.screen.colorDepth || 24,
  };
}

/**
 * device_info JSON — same shape as 79ai usage-history / site-ai marketplace.
 * @see site-ai gommoDevice.buildMarketplaceDeviceInfo
 */
export function buildMarketplaceDeviceInfo(deviceId: string, locale = 'vi'): string {
  if (typeof window === 'undefined') {
    return JSON.stringify({
      device_id: deviceId,
      device_name: 'Chrome 1',
      device_type: 'desktop',
      language: locale,
    });
  }

  const ua = navigator.userAgent;
  const browserName = parseBrowserName(ua);
  const deviceName = `${browserName} 1`;
  const chromeVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '0.0.0.0';
  const osMatch = /Windows NT ([\d.]+)/.exec(ua);
  const screen = screenInfo79ai();

  return JSON.stringify({
    device_id: deviceId,
    device_name: deviceName,
    device_type: 'desktop',
    platform: navigator.platform || 'web',
    browser_name: browserName,
    browser_version: chromeVersion,
    os_name: /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : 'Other',
    os_version: osMatch?.[1] || '10.0',
    app_mode: 'browser',
    is_pwa: false,
    user_agent: ua,
    language: locale,
    timezone: etcGmtTimezone(),
    screen,
  });
}

/** @deprecated Use buildMarketplaceDeviceInfo */
export function build79aiDeviceInfo(deviceName = deviceName79ai(), deviceId?: string): string {
  const id = deviceId || getOrCreateDeviceId();
  return buildMarketplaceDeviceInfo(id, 'vi');
}

/** Device fields for Gommo usage-history — aligned with 79ai. */
export function gommoClientDeviceFields(locale = 'vi'): {
  device_id: string;
  device_name: string;
  device_info: string;
} {
  const device_id = getOrCreateDeviceId();
  const device_name = deviceName79ai();
  const device_info = buildMarketplaceDeviceInfo(device_id, locale);
  return { device_id, device_name, device_info };
}

export function appendDeviceToForm(form: URLSearchParams, locale = 'vi'): void {
  const device = gommoClientDeviceFields(locale);
  form.set('device_id', device.device_id);
  form.set('device_name', device.device_name);
  form.set('device_info', device.device_info);
}

/** @deprecated Use appendDeviceToForm */
export function appendDeviceQueryParams(params: URLSearchParams, locale = 'vi'): void {
  appendDeviceToForm(params, locale);
}
