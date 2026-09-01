---
title: Setup Cursor MCP
description: Configure @ai-gateway/mcp-server in Cursor IDE
---

# Setup Cursor MCP

## Prerequisites

- AI Gateway running (`npm run dev` or production URL)
- Gommo **user** `access_token` ([Authentication](../authentication.md))
- Node.js 18+ (for `npx`)

## Cursor configuration

Open **Cursor Settings → MCP → Add server** (or edit `~/.cursor/mcp.json`):

### Published package (recommended)

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "YOUR_USER_ACCESS_TOKEN"
      }
    }
  }
}
```

### Monorepo dev (local build)

```bash
npm run mcp:build
```

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "node",
      "args": ["C:/Users/You/ai-gateway/packages/mcp-server/dist/index.js"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "YOUR_USER_ACCESS_TOKEN"
      }
    }
  }
}
```

Use forward slashes in paths on Windows.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `http://localhost:3001` | Your gateway base URL |
| `GATEWAY_ACCESS_TOKEN` | *(required)* | User Bearer token |
| `GATEWAY_DOMAIN` | `79ai.net` | Domain for `/ai/me` profile |

::: danger Never use merchant token
`GOMO_ACCESS_TOKEN` / merchant keys are **server-only**. MCP uses user token only.
:::

## Verify

1. Restart Cursor after saving MCP config
2. Open chat — MCP tools should list `gommo_*`
3. Try: *"Check my credit balance"* → calls `gommo_credit_balance`
4. Try: *"List image models"* → calls `gommo_models_list`

```bash
curl http://localhost:3001/health
```

## Claude Desktop

Same env pattern — set `command` / `args` per [Claude MCP docs](https://modelcontextprotocol.io):

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "https://api.yourdomain.com",
        "GATEWAY_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GATEWAY_ACCESS_TOKEN is required` | Add token to MCP env block |
| 401 on tools | Token expired — re-login |
| Connection refused | Start gateway or fix `GATEWAY_URL` |
| Invalid ratio/mode | Call `gommo_models_list` first — never guess enums |

## Next

→ [MCP tools](./tools.md) · [MCP overview](./index.md)
