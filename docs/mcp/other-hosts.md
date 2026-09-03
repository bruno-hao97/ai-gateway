---
title: Other MCP hosts
description: JSON config for 79ai MCP — Cursor, Claude Desktop, ChatGPT, and compatible clients
---

# Other MCP hosts

**79ai MCP** is a **remote** server at `https://api.gommo.net/api/v2/gommo-mcp`. Copy the JSON for your AI client below. Replace `YOUR_ACCESS_TOKEN` with your token from [/app/token/](/app/token/).

Static templates: [Cursor](/mcp-cursor-79ai.example.json) · [Claude](/mcp-claude-79ai.example.json) · [Extended headers](/cursor-mcp-79ai.example.json)

## Cursor

File: `~/.cursor/mcp.json` or **Settings → MCP**.

```json
{
  "mcpServers": {
    "79-ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

## Claude Desktop

File:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "79-ai": {
      "type": "http",
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

## ChatGPT

If your plan supports **Connectors / MCP** (varies by version):

| Field | Value |
|-------|-------|
| **Connector URL** | `https://api.gommo.net/api/v2/gommo-mcp` |
| **Authentication** | `Bearer YOUR_ACCESS_TOKEN` |

No `mcp.json` — configure in ChatGPT settings. If Connectors are unavailable, use Cursor or Claude instead.

## Extended (if 401)

Some setups need both headers:

```json
{
  "mcpServers": {
    "79-ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Gommo-Token": "YOUR_ACCESS_TOKEN",
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

---

## Supported hosts

| Host | Support | Config location | Notes |
|------|---------|-----------------|-------|
| **[Cursor](https://cursor.com)** | ✅ Recommended | `~/.cursor/mcp.json` or Settings → MCP | JSON above |
| **[Claude Desktop](https://claude.ai/download)** | ✅ | See above | Add `"type": "http"` |
| **[Windsurf](https://codeium.com/windsurf)** | ✅ | Windsurf MCP settings / `mcp_config.json` | Same `url` + `headers` |
| **VS Code** (MCP extensions) | ⚠️ Varies | Extension docs | Some only support stdio, not remote `url` |
| **Zed / Continue** | ⚠️ Check docs | Per product | Remote MCP support evolving |

### Verify

1. MCP host shows **79-ai** — green, **~10 tools**
2. Try: *"Check my credit balance using 79ai MCP"*
3. More prompts: [Use cases & prompts](./use-cases.md)

### Token expired?

Re-login → [/app/token/](/app/token/) → update config → restart IDE.

Official reference: [Model Context Protocol](https://modelcontextprotocol.io).

---

## Does not support this MCP pattern

| Platform | Why | Use instead |
|----------|-----|-------------|
| **ChatGPT web / mobile** (no Connectors) | No custom MCP | HTTP [`/gateway/*`](../routing/endpoint-map.md) |
| **Gemini web** | No custom MCP | HTTP API |
| **Copilot in browser** | No user MCP config | HTTP API |

---

## MCP vs HTTP

| Goal | Use |
|------|-----|
| IDE agent (Cursor, Claude Desktop…) | **79ai MCP** |
| Website / mobile / backend | **HTTP** `Authorization: Bearer` → [`/gateway/*`](../routing/endpoint-map.md) |
| Route IDE through your API URL | Optional [self-hosted MCP](./self-hosted.md) |

Same login token — different integration style.

---

## Remote MCP requirements

1. **HTTPS remote URL** — not only local `command` / `stdio`
2. **Custom headers** — `Authorization` (and `Gommo-Token` if needed)
3. **Tool listing** — ~10 `gommo_*` tools when connected

If a client only supports stdio MCP, use HTTP API or [self-hosted](./self-hosted.md) `@ai-gateway/mcp-server`.

---

## Next

→ [Tools](./tools.md) · [Use cases & prompts](./use-cases.md) · [Self-hosted](./self-hosted.md)
