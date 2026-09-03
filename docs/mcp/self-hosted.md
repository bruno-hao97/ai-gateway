---
title: Self-hosted MCP (advanced)
description: Optional @ai-gateway/mcp-server — route Cursor tools through your deployed gateway
---

# Self-hosted MCP (advanced)

Package **`@ai-gateway/mcp-server`** is an **optional** stdio MCP server that wraps your deployed gateway (`/gateway/*`). Use it only when IDE agents must call **your API URL** instead of [79ai remote MCP](./other-hosts.md).

Most Cursor users should use **[79ai MCP](./other-hosts.md)** — simpler, no `npx`, no `GATEWAY_URL`.

## When to use this

| Use self-hosted MCP | Use 79ai MCP instead |
|---------------------|----------------------|
| Merchant white-label: IDE must hit `api.yourdomain.com` | Default for end users on 79ai |
| You need gateway middleware (logging, custom routing) | Personal / standard IDE workflow |
| Testing gateway MCP integration in development | Day-to-day Cursor usage |

## Setup

### Published package

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "https://api.yourdomain.com",
        "GATEWAY_ACCESS_TOKEN": "<from /app/token/>"
      }
    }
  }
}
```

Local dev: set `GATEWAY_URL` to `http://localhost:3001` and run `npm run dev`.

### Monorepo

```bash
npm run mcp:build
```

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "node",
      "args": ["C:/path/to/ai-gateway/packages/mcp-server/dist/index.js"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `http://localhost:3001` | Your gateway base URL |
| `GATEWAY_ACCESS_TOKEN` | *(required)* | User token from [/app/token/](/app/token/) |
| `GATEWAY_DOMAIN` | `79ai.net` | Domain for `/ai/me` |

## Next

→ [79ai MCP](./other-hosts.md) · [MCP tools](./tools.md) · [packages/mcp-server README](../../packages/mcp-server/README.md)
