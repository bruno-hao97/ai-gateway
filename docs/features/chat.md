---
title: Chat
description: Agent chat with optional SSE streaming via /gateway/chat
---

# Chat

Conversational AI through Gommo's platform chat API. Gateway REST wraps `POST /api/v2/chat` with JSON — proxy Mode C keeps the upstream form format.

## Endpoints

| Mode | Path |
|------|------|
| REST (recommended) | `POST /gateway/chat` |
| Proxy | `POST /api/v2/chat` |
| Direct | `POST https://api.gommo.net/api/v2/chat` |

Auth: `Authorization: Bearer {user_access_token}`.

## Actions

| `action` | Behavior |
|----------|----------|
| `chat` | Single JSON or SSE response |
| `stream` | **SSE** stream — gateway pipes without buffering |
| `set_model` | Change chat model for session |
| `agent` | **set_model** (best-effort) then **chat** — text agent flow |

## REST request

```json
{
  "action": "chat",
  "query": "Hello",
  "sessionId": "optional-uuid",
  "messages": [
    { "role": "user", "text": "Hello" }
  ]
}
```

::: warning Non-empty messages
Upstream `action=chat` requires **`messages` with at least one entry** — e.g. `{ "role": "user", "text": "..." }`.
:::

`domain` is **not required** in REST body — gateway uses `GOMMO_API_DOMAIN`.

## Default model (server env)

| Env | Purpose |
|-----|---------|
| `GOMMO_CHAT_SERVER` | Chat server (default `cheap`) |
| `GOMMO_CHAT_MODEL` | Model id (default `gpt-5.5::cheap`) |
| `GOMMO_CHAT_AGENT_ID` | Moon Chat agent (default text) |
| `GOMMO_CHAT_WORKFLOW_AGENT_ID` | Composer / workflow agent |
| `GOMMO_CHAT_WORKFLOW_PROJECT_ID` | Project id for workflow stream |
| `GOMMO_CHAT_MODELS_FILE` | Optional JSON overrides (`data/chat-models.json`) |
| `GOMMO_CHAT_MODELS_TTL_MS` | Upstream catalog cache TTL (default 5 min) |

Override per request via REST fields or upstream form params.

## Portal model picker

`GET /gateway/chat-models` (Bearer required) loads the catalog from Gommo **`action=models`** (`POST /api/v2/chat`), cached server-side. Response includes `source: "upstream" | "fallback"`.

```json
{
  "success": true,
  "data": {
    "defaultId": "auto-router",
    "source": "upstream",
    "models": [
      {
        "id": "auto-router",
        "label": "Auto Router",
        "autoRouter": true,
        "chatApiMode": "agent",
        "model": "gpt-5.5::cheap",
        "server": "cheap"
      },
      {
        "id": "composer-2.5--cursorai",
        "label": "Composer 2.5 (Standard)",
        "chatApiMode": "stream",
        "model": "composer-2.5",
        "server": "cursorai"
      }
    ]
  }
}
```

- **Auto Router** — env defaults, `action=agent` (set_model + chat)
- **Other models** — `chatApiMode: stream` when upstream `body_type` is `chat_completions` or server is `cursorai`

Optional `data/chat-models.json` can override labels, hide models (`hidden: true`), or disable upstream (`"upstream": false`).

## Chat sessions (`/gateway/chat-sessions`)

Gateway REST still supports `save_message` / `list_sessions` for API clients. **Portal chat is local-only** — it does not sync with Gommo/79ai history.

Use **Export/Import JSON** in the chat sidebar for local backup.

## Streaming

Set `"action": "stream"` for token-by-token SSE:

```http
POST /gateway/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "stream",
  "query": "Tell a short story",
  "messages": [{ "role": "user", "text": "Tell a short story" }]
}
```

The gateway detects streaming when:

- URL contains `/chat` and action is stream, or
- `Content-Type: text/event-stream` on proxy routes

Response is piped to the client — do not expect a single JSON body.

## Mode C (form body)

```http
POST /api/v2/chat
Content-Type: application/x-www-form-urlencoded

action=chat&access_token={token}&domain={domain}&query=Hello&...
```

Include `domain` matching the user's registration domain.

## Credits

Chat consumes Gommo user credits like other platform APIs. Check balance via `/api/apps/go-mmo/ai/me` (proxied on gateway).

## Full API

→ [Chat reference](../reference/chat.md) · [Endpoint map](../routing/endpoint-map.md)

## Next

→ [Audio & TTS](./audio.md) · [Media jobs](./media-jobs.md)
