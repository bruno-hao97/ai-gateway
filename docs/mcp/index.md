---
title: MCP & agents
description: Bring AI Gateway tools into Cursor and Claude — official MCP server
---

# MCP & agents

**Đưa công cụ AI Gateway vào AI của bạn** — Cursor, Claude Desktop, hoặc bất kỳ host MCP nào.  
Một kết nối, nhiều việc thực tế: tạo ảnh/video, xem credit, theo dõi job.

::: tip Official MCP server
Package **`@ai-gateway/mcp-server`** — stdio transport, wrap REST `/gateway/*` trên server bạn deploy.
:::

## Một kết nối. Nhiều việc thực tế.

| Use case | MCP tool | Mô tả |
|----------|----------|--------|
| **Tạo ảnh & video** | `gommo_image_create`, `gommo_video_create` | Agent gọi model + prompt; poll status hoặc `gommo_task_stream` |
| **Xem hồ sơ & credit** | `gommo_account_info`, `gommo_credit_balance` | Số dư trước khi gen |
| **Theo dõi job** | `gommo_image_status`, `gommo_video_status`, `gommo_task_stream` | Không cần ngồi chờ đoán mò |
| **Catalog** | `gommo_models_list` | Luôn gọi trước create — **không đoán** ratio/mode/duration |

## AI nhận công cụ, không nhận bí mật của bạn

| Secret | MCP server | Cursor |
|--------|------------|--------|
| User `access_token` | Env `GATEWAY_ACCESS_TOKEN` | Không embed trong prompt |
| Merchant `GOMMO_ACCESS_TOKEN` | **Không dùng** | Không expose |
| `ADMIN_API_KEY` | **Không dùng** | Không expose |

MCP chỉ gọi **HTTP gateway** với user Bearer — billing và fulfill chạy server-side như portal.

## Quick start

1. Chạy gateway: `npm run dev` → `:3001`
2. Lấy user token: [Authentication](../authentication.md) hoặc Playground login
3. Cấu hình Cursor: [Setup Cursor](./setup-cursor.md)
4. Tool reference: [MCP tools](./tools.md)

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

## MCP vs HTTP vs Cursor `gommo_*` IDE tools

| | **@ai-gateway/mcp-server** | **HTTP `/gateway/*`** | **Cursor built-in `gommo_*`** |
|---|---------------------------|----------------------|------------------------------|
| Chạy qua gateway deploy | ✅ | ✅ | ❌ Gommo trực tiếp |
| Cursor / Claude MCP | ✅ | ❌ | ✅ (IDE only) |
| Production white-label | ✅ | ✅ | ❌ |

Dùng **MCP server này** khi muốn agent trong IDE gọi **gateway của bạn**. Dùng **HTTP** cho app/backend. Cursor `gommo_*` riêng chỉ để dev — xem [FAQ](../faq.md#mcp-cursor).

## Roadmap

| Tool | Trạng thái |
|------|------------|
| models, image/video create+status, task_stream, account/credit | ✅ v0.1 |
| `gommo_tasks_list` | 🔜 |
| `gommo_notify_send` | 🔜 (cần gateway route) |
| Remote MCP (SSE) | 🔜 |

## Next

→ [Setup Cursor](./setup-cursor.md) · [Tool reference](./tools.md) · [Agent HTTP flow](../cookbook/agent-http-flow.md)
