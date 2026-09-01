---
title: Cấu hình Cursor MCP
description: Cấu hình @ai-gateway/mcp-server trong Cursor
---

# Cấu hình Cursor MCP

## Yêu cầu

- Gateway chạy (`npm run dev` hoặc URL production)
- User `access_token` — [Authentication](../authentication.md)
- Node.js 18+

## Cấu hình Cursor

**Settings → MCP → Add server:**

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "TOKEN_CUA_BAN"
      }
    }
  }
}
```

### Dev monorepo

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
        "GATEWAY_ACCESS_TOKEN": "TOKEN_CUA_BAN"
      }
    }
  }
}
```

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `GATEWAY_URL` | `http://localhost:3001` | URL gateway |
| `GATEWAY_ACCESS_TOKEN` | *(bắt buộc)* | User Bearer token |
| `GATEWAY_DOMAIN` | `79ai.net` | Domain cho `/ai/me` |

::: danger Không dùng merchant token
`GOMMO_ACCESS_TOKEN` chỉ trên server — không đưa vào MCP env.
:::

## Kiểm tra

1. Restart Cursor sau khi lưu config
2. Thử: *"Kiểm tra số dư credit"* → `gommo_credit_balance`
3. `curl http://localhost:3001/health`

## Tiếp theo

→ [Tool reference](./tools.md)
