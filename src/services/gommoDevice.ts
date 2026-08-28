const SERVER_DEVICE_ID = 'ai-gateway-server';

export interface Gommo79aiDevicePayload {
  device_id: string;
  device_name: string;
  device_info: string;
}

/** Etc/GMT sign inverted — GMT-7 = UTC+7 (79ai format). */
function etcGmtTimezone(): string {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (offsetHours === 0) return 'Etc/GMT';
  return offsetHours > 0 ? `Etc/GMT-${offsetHours}` : `Etc/GMT+${Math.abs(offsetHours)}`;
}

/** device_info JSON matching 79ai usage-history marketplace shape (server fallback). */
export function build79aiDeviceInfo(deviceId = SERVER_DEVICE_ID, deviceName = 'Chrome 1', locale = 'vi'): string {
  return JSON.stringify({
    device_id: deviceId,
    device_name: deviceName,
    device_type: 'desktop',
    platform: 'Win32',
    browser_name: 'Chrome',
    browser_version: '0.0.0.0',
    os_name: 'Windows',
    os_version: '10.0',
    app_mode: 'browser',
    is_pwa: false,
    user_agent: 'AIGateway',
    language: locale,
    timezone: etcGmtTimezone(),
    screen: { width: 1920, height: 1080, pixel_ratio: 1, color_depth: 24 },
  });
}

/** 79ai-style device for usage-history when client does not send device fields. */
export function gommo79aiDeviceFields(deviceId = SERVER_DEVICE_ID): Gommo79aiDevicePayload {
  const device_name = 'Chrome 1';
  return {
    device_id: deviceId,
    device_name,
    device_info: build79aiDeviceInfo(deviceId, device_name),
  };
}

/** Device fields tối giản cho server-side Gommo V2 calls. */
export function gommoDeviceFields(): Record<string, string> {
  return {
    device_id: SERVER_DEVICE_ID,
    device_name: 'AIGateway',
    device_info: buildDeviceInfo('vi'),
  };
}

/** Form fields device cho POST /api/v2/* (platform API / chat). */
export function platformDeviceFields(): Record<string, string> {
  return {
    device_id: SERVER_DEVICE_ID,
    device_name: 'AIGateway',
    device_info: buildDeviceInfo('vi'),
  };
}

export function buildDeviceInfo(locale = 'vi'): string {
  return JSON.stringify({
    device_id: SERVER_DEVICE_ID,
    device_name: 'AIGateway',
    device_type: 'server',
    platform: 'node',
    language: locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export function buildMarketplaceDeviceInfo(deviceId = SERVER_DEVICE_ID, locale = 'vi'): string {
  return build79aiDeviceInfo(deviceId, 'Chrome 1', locale);
}

/** Device fields cho merchant API (sendBalances, /ai/me) từ server. */
export function gommoServerDeviceFields(): Record<string, string> {
  const deviceInfo = JSON.stringify({
    device_id: SERVER_DEVICE_ID,
    device_name: 'AIGateway',
    device_type: 'server',
    platform: 'node',
    app_mode: 'api',
  });
  return {
    device_id: SERVER_DEVICE_ID,
    device_name: 'AIGateway',
    device_info: deviceInfo,
  };
}
