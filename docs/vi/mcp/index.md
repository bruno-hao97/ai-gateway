---
title: MCP & agents
description: Đưa công cụ AI Gateway vào Cursor và Claude — MCP server chính thức
---

# MCP & agents

**Đưa công cụ AI Gateway vào AI của bạn** — Cursor, Claude Desktop, hoặc host MCP bất kỳ.

::: tip MCP server chính thức
Package **`@ai-gateway/mcp-server`** — stdio, wrap REST `/gateway/*` trên server bạn deploy.
:::

## Một kết nối. Nhiều việc thực tế.

| Use case | Tool MCP |
|----------|----------|
| Tạo ảnh & video | `gommo_image_create`, `gommo_video_create` |
| Xem credit & hồ sơ | `gommo_credit_balance`, `gommo_account_info` |
| Theo dõi job | `gommo_*_status`, `gommo_task_stream` |
| Catalog | `gommo_models_list` — **không đoán** ratio/mode/duration |

## AI nhận công cụ, không nhận bí mật

Chỉ dùng **user `access_token`** trong env MCP — không merchant token, không admin key.

## Quick start

→ [Cấu hình Cursor](./setup-cursor.md) · [Tool reference](./tools.md)

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "<user-access-token>"
      }
    }
  }
}
```

## MCP vs HTTP vs Cursor `gommo_*`

| | **@ai-gateway/mcp-server** | **HTTP** | **Cursor `gommo_*`** |
|---|---------------------------|----------|----------------------|
| Qua gateway deploy | ✅ | ✅ | ❌ |
| IDE agent | ✅ | ❌ | ✅ |

## Roadmap

| Tool | Trạng thái |
|------|------------|
| models, image/video, task_stream, account | ✅ v0.1 |
| `gommo_tasks_list`, `gommo_notify_send` | 🔜 |

## Tiếp theo

→ [Cấu hình Cursor](./setup-cursor.md) · [Tools](./tools.md)
