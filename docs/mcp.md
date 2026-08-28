---
title: MCP & agents
description: Cursor MCP vs AI Gateway HTTP runtime
---

# MCP & agents

This page clarifies how **Model Context Protocol (MCP)** relates to AI Gateway — and what we do **not** ship today.

## Two different things

| | **Cursor MCP tools** (`gommo_*`) | **AI Gateway (this repo)** |
|---|----------------------------------|----------------------------|
| **Runs where** | Inside Cursor IDE | Your server (`npm run dev` / Docker) |
| **Transport** | MCP over stdio / Cursor | **HTTP** REST + proxy |
| **Audience** | You, while coding in Cursor | Your app, scripts, customers |
| **Auth** | Cursor MCP config | Bearer user token, admin keys on server |
| **Billing** | Not a production API surface | `/billing/*`, `/gateway/*` |

::: info Option B — clarify, not duplicate
OpenRouter documents an **MCP server** so agents can call their API. **AI Gateway does not yet expose an official MCP server.** Use HTTP endpoints documented in this site.
:::

## What to use when

### Building a product or backend integration

Use **HTTP**:

- Mode B: `GET/POST /gateway/*`
- Mode C: proxy `/v2`, `/api/v2`, …
- Auth: [Authentication](./authentication.md)

Test interactively: [Playground](/app/playground/) (sign in; gateway API on `:3001` in dev).

### Using Cursor while developing gateway code

You may have **separate** Cursor MCP tools (e.g. `gommo_*`) configured in Cursor settings. Those talk to Gommo **directly** through Cursor — they are **not** the same as calling your deployed `api.yourdomain.com`.

**Do not** confuse MCP tool responses with your gateway’s behavior. Always verify against:

```bash
curl http://localhost:3001/health
```

and the [Quickstart](./quickstart.md).

## Agent-friendly HTTP patterns

For LLM agents that can do HTTP (without MCP):

1. `POST /api/apps/go-mmo/auth/login` → token (or use a pre-issued token).
2. `GET /gateway/models?type=image` → pick slug + ratio.
3. `POST /gateway/jobs/image` with `wait: true` → `resultUrl`.

Structured errors (`code`, `message`) help agents retry safely.

## Roadmap (not implemented)

A future **official MCP server** wrapping `/gateway/*` could expose tools such as:

- `list_models(type)`
- `create_job(type, modelSlug, fields, wait?)`
- `chat(query)`

If you need this, open a GitHub issue with your agent host (Cursor, Claude Desktop, custom).

## Next

→ [Quickstart](./quickstart.md) · [Principles](./principles.md) · [Report feedback](./report-feedback.md)
