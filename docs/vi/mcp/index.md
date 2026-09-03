---
title: MCP & agents
description: 79ai MCP — Cursor, Claude Desktop và host tương thích
---

# MCP & agents

Dùng **79ai MCP** trong Cursor, Claude Desktop, Windsurf hoặc host hỗ trợ **remote MCP** — tạo ảnh/video, xem credit, theo dõi job với tài khoản trên site này.

::: tip Khuyên dùng — 79ai MCP
MCP remote tại `https://api.gommo.net/api/v2/gommo-mcp` — **10 tool** `gommo_*`. Chỉ cần token [/vi/app/token/](/vi/app/token/), không cần gateway local.
:::

## Dùng được ở đâu?

| Host | Hỗ trợ | Hướng dẫn |
|------|--------|-----------|
| **Cursor** | ✅ | [Host khác](./other-hosts.md) |
| **Claude Desktop** | ✅ | [Host khác](./other-hosts.md) |
| **Windsurf** | ✅ | [Host khác](./other-hosts.md) |
| **VS Code / Zed** | ⚠️ Tùy extension | [Host khác](./other-hosts.md) |
| **App / backend** | HTTP, không MCP | [`/gateway/*`](/vi/routing/endpoint-map.md) |

## 10 tools khi connected

| Nhóm | Tools |
|------|-------|
| Tài khoản | `gommo_account_info`, `gommo_credit_balance` |
| Catalog | `gommo_models_list` |
| Tạo media | `gommo_image_create`, `gommo_video_create` |
| Theo dõi | `gommo_image_status`, `gommo_video_status`, `gommo_task_stream` |
| Lịch sử | `gommo_tasks_list` |
| Thông báo | `gommo_notify_send` |

Chi tiết: [Tools](./tools.md) · Prompt: [Use cases](./use-cases.md)

## Luồng user

1. [/vi/login/](/vi/login/) → token [/vi/app/token/](/vi/app/token/)
2. Copy JSON cho client AI — [Host MCP khác](./other-hosts.md) (Cursor · Claude · ChatGPT)
3. Restart IDE → chat `gommo_*`

```json
{
  "mcpServers": {
    "79-ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

Mẫu: [Cursor](/mcp-cursor-79ai.example.json) · [Claude](/mcp-claude-79ai.example.json) · [Mở rộng](/cursor-mcp-79ai.example.json)

## MCP vs HTTP

| | **79ai MCP** | **HTTP `/gateway/*`** |
|---|-------------|----------------------|
| IDE (Cursor, Claude…) | ✅ | ❌ |
| Web / mobile / script | ❌ | ✅ |
| Cần gateway | ❌ | ✅ |

Cùng token — khác cách tích hợp. [Self-hosted](./self-hosted.md) — tùy chọn nâng cao.

## Tiếp theo

→ [Host khác](./other-hosts.md) · [Tools](./tools.md) · [Use cases](./use-cases.md)
