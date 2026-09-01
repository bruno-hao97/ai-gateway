# @ai-gateway/mcp-server

Official **Model Context Protocol** server for [AI Gateway](https://github.com/bruno-hao97/ai-gateway).  
Wraps your deployed gateway (`/gateway/*`) so Cursor, Claude Desktop, and other MCP hosts can create images, videos, and check credits.

## Requirements

- Node.js 18+
- Running AI Gateway (`npm run dev` or production URL)
- Gommo **user** `access_token` (not merchant token)

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `GATEWAY_URL` | No | Default `http://localhost:3001` |
| `GATEWAY_ACCESS_TOKEN` | **Yes** | User Bearer token |
| `GATEWAY_DOMAIN` | No | Default `79ai.net` (for `/ai/me`) |

## Cursor setup

**Settings → MCP → Add server:**

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "<your-user-access-token>"
      }
    }
  }
}
```

From monorepo (dev):

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "node",
      "args": ["C:/path/to/ai-gateway/packages/mcp-server/dist/index.js"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

## Tools

| Tool | Gateway |
|------|---------|
| `gommo_models_list` | `GET /gateway/models` |
| `gommo_image_create` | `POST /gateway/jobs/image` |
| `gommo_image_status` | `GET /gateway/jobs/{id}?media=image` |
| `gommo_video_create` | `POST /gateway/jobs/video` |
| `gommo_video_status` | `GET /gateway/jobs/{id}?media=video` |
| `gommo_task_stream` | Client poll loop |
| `gommo_credit_balance` | `POST /api/apps/go-mmo/ai/me` |
| `gommo_account_info` | `POST /api/apps/go-mmo/ai/me` |

**Rules:** Never guess `ratio`, `mode`, `resolution`, or `duration` — call `gommo_models_list` first.

## Build

```bash
npm run build --workspace=@ai-gateway/mcp-server
node packages/mcp-server/dist/index.js
```

Docs: [MCP & agents](https://github.com/bruno-hao97/ai-gateway/blob/main/docs/mcp/index.md)
