---
title: MCP & agents
description: 79ai MCP — Cursor, Claude Desktop, and compatible hosts
---

# MCP & agents

Use **79ai MCP** in Cursor, Claude Desktop, Windsurf, or any host that supports **remote MCP** — create images/videos, check credits, and track jobs with your account on this site.

::: tip Recommended — 79ai MCP
Remote MCP at `https://api.gommo.net/api/v2/gommo-mcp` — **10 `gommo_*` tools**. Only your token from [/app/token/](/app/token/); no local gateway required.
:::

## Where you can use it

| Host | Support | Guide |
|------|---------|-------|
| **Cursor** | ✅ | [Other hosts](./other-hosts.md) |
| **Claude Desktop** | ✅ | [Other hosts](./other-hosts.md) |
| **Windsurf** | ✅ | [Other hosts](./other-hosts.md) |
| **VS Code / Zed** | ⚠️ Depends on extension | [Other hosts](./other-hosts.md) |
| **Apps / backends** | HTTP, not MCP | [`/gateway/*`](../routing/endpoint-map.md) |

## 10 tools when connected

| Group | Tools |
|-------|-------|
| Account | `gommo_account_info`, `gommo_credit_balance` |
| Catalog | `gommo_models_list` |
| Create media | `gommo_image_create`, `gommo_video_create` |
| Track jobs | `gommo_image_status`, `gommo_video_status`, `gommo_task_stream` |
| History | `gommo_tasks_list` |
| Notify | `gommo_notify_send` |

Details: [Tool reference](./tools.md) · Example prompts: [Use cases](./use-cases.md)

## User flow

1. [Sign in](/login/) → copy token from [/app/token/](/app/token/)
2. Copy JSON for your AI client — [Other MCP hosts](./other-hosts.md) (Cursor · Claude · ChatGPT)
3. Restart IDE → chat with `gommo_*` tools

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

Templates: [Cursor](/mcp-cursor-79ai.example.json) · [Claude](/mcp-claude-79ai.example.json) · [Extended](/cursor-mcp-79ai.example.json)

## MCP vs HTTP

| | **79ai MCP** | **HTTP `/gateway/*`** |
|---|-------------|----------------------|
| Cursor / Claude / IDE | ✅ | ❌ |
| Website / mobile / scripts | ❌ | ✅ |
| Needs gateway running | ❌ | ✅ (deployed API) |

Same login token — different integration style.

Optional [self-hosted MCP](./self-hosted.md) routes IDE tools through `GATEWAY_URL`.

## Next

→ [Other hosts](./other-hosts.md) · [Tools](./tools.md) · [Use cases](./use-cases.md)
