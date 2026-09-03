---
title: Self-hosted MCP (nâng cao)
description: Tùy chọn @ai-gateway/mcp-server — route tool Cursor qua gateway bạn deploy
---

# Self-hosted MCP (nâng cao)

Package **`@ai-gateway/mcp-server`** là MCP stdio **tùy chọn**, wrap gateway deploy (`/gateway/*`). Chỉ dùng khi agent IDE phải gọi **URL API của bạn** thay vì [79ai remote MCP](./other-hosts.md).

Đa số user Cursor nên dùng **[79ai MCP](./other-hosts.md)** — đơn giản, không `npx`, không `GATEWAY_URL`.

## Khi nào dùng

| Dùng self-hosted | Dùng 79ai MCP |
|------------------|---------------|
| White-label: IDE gọi `api.yourdomain.com` | Mặc định cho user 79ai |
| Cần middleware gateway (log, routing) | Workflow Cursor hàng ngày |
| Test tích hợp gateway MCP khi dev | Dùng IDE bình thường |

## Cấu hình

### Package publish

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "https://api.yourdomain.com",
        "GATEWAY_ACCESS_TOKEN": "<từ /vi/app/token/>"
      }
    }
  }
}
```

Dev local: `GATEWAY_URL` = `http://localhost:3001`, chạy `npm run dev`.

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
        "GATEWAY_ACCESS_TOKEN": "TOKEN"
      }
    }
  }
}
```

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `GATEWAY_URL` | `http://localhost:3001` | URL gateway |
| `GATEWAY_ACCESS_TOKEN` | *(bắt buộc)* | Token [/vi/app/token/](/vi/app/token/) |
| `GATEWAY_DOMAIN` | `79ai.net` | Domain `/ai/me` |

## Tiếp theo

→ [79ai MCP](./other-hosts.md) · [Tools](./tools.md)
