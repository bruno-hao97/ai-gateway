---
title: Chat
description: Agent chat with optional SSE streaming on Gommo platform API
---

# Chat

Conversational AI through Gommo's platform chat API on **`https://api.gommo.net`**.

## Endpoint (recommended)

```http
POST https://api.gommo.net/api/v2/chat
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

action=chat&domain=79ai.net&query=Hello&messages=[{"role":"user","text":"Hello"}]
```

Form may use `access_token` instead of Bearer header — same token.

## Actions

| `action` | Behavior |
|----------|----------|
| `chat` | Single JSON response |
| `stream` | **SSE** stream |
| `set_model` | Change chat model for session |
| `agent` | **set_model** (best-effort) then **chat** — text agent flow |
| `models` | List available chat models |

## Non-empty messages

Upstream `action=chat` requires **`messages` with at least one entry** — e.g. `{ "role": "user", "text": "..." }`.

## Streaming

Set `action=stream` for token-by-token SSE. Consume the stream on the client — do not expect a single JSON body.

## Credits

Chat consumes Gommo user credits. Check balance via `POST https://api.gommo.net/ai/me`.

## Portal chat

[/app/chat/](/app/chat/) uses the same upstream API. Chat history in the portal is **local-only** — export/import JSON from the sidebar for backup.

## Optional: self-host gateway

JSON wrapper at `POST {gateway}/gateway/chat` — see [Chat reference](../reference/chat.md) Mode B section.

## Full API

→ [Chat reference](../reference/chat.md) · [Gommo public API](../reference/gommo-public-api.md)

## Next

→ [Audio & TTS](./audio.md) · [Media jobs](./media-jobs.md)
