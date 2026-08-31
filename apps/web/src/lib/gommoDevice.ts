const STORAGE_DEVICE_ID = 'gw_device_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateDeviceId(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('device_id')?.trim();
  if (fromUrl) {
    localStorage.setItem(STORAGE_DEVICE_ID, fromUrl);
    return fromUrl;
  }

  const existing = localStorage.getItem(STORAGE_DEVICE_ID)?.trim();
  if (existing) return existing;

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

export function deviceName79ai(): string {
  return `${parseBrowserName(navigator.userAgent)} 1`;
}

function etcGmtTimezone(): string {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (offsetHours === 0) return 'Etc/GMT';
  return offsetHours > 0 ? `Etc/GMT-${offsetHours}` : `Etc/GMT+${Math.abs(offsetHours)}`;
}

export function gommoClientDeviceFields(locale = 'vi'): {
  device_id: string;
  device_name: string;
  device_info: string;
} {
  const device_id = getOrCreateDeviceId();
  const device_name = deviceName79ai();
  const ua = navigator.userAgent;
  const browserName = parseBrowserName(ua);
  const chromeVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '0.0.0.0';
  const osMatch = /Windows NT ([\d.]+)/.exec(ua);

  const device_info = JSON.stringify({
    device_id,
    device_name,
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
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      pixel_ratio: window.devicePixelRatio || 1,
      color_depth: window.screen.colorDepth || 24,
    },
  });

  return { device_id, device_name, device_info };
}
