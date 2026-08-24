const SERVER_DEVICE_ID = 'ai-gateway-server';

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
  return JSON.stringify({
    device_id: deviceId,
    device_name: 'AIGateway',
    device_type: 'server',
    platform: 'node',
    app_mode: 'gateway',
    language: locale,
  });
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
