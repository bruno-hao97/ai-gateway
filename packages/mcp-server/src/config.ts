export interface McpServerConfig {
  gatewayUrl: string;
  accessToken: string;
  domain: string;
}

export function loadConfig(): McpServerConfig {
  const gatewayUrl = (process.env.GATEWAY_URL || 'http://localhost:3001').trim();
  const accessToken = (process.env.GATEWAY_ACCESS_TOKEN || '').trim();
  const domain = (process.env.GATEWAY_DOMAIN || process.env.GOMMO_API_DOMAIN || '79ai.net').trim();

  if (!accessToken) {
    throw new Error(
      'GATEWAY_ACCESS_TOKEN is required. Set your Gommo user access_token in the MCP server env.',
    );
  }

  return { gatewayUrl, accessToken, domain };
}
