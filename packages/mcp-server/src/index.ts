#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerGatewayTools } from './tools.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const server = new McpServer({
    name: 'ai-gateway',
    version: '0.1.0',
  });

  registerGatewayTools(server, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[ai-gateway-mcp]', err instanceof Error ? err.message : err);
  process.exit(1);
});
