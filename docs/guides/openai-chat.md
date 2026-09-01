---
title: OpenAI-compatible chat
description: Use POST /v1/chat/completions with standard OpenAI SDKs and agents
---

# OpenAI-compatible chat

AI Gateway exposes **`POST /v1/chat/completions`** — map Gommo chat to the OpenAI Chat Completions API so tools like LangChain, OpenAI SDK, or custom agents can plug in without Gommo-specific payloads.

## Auth

Same as `/gateway/*`:

```http
Authorization: Bearer <user_access_token>
```

Get a token via [Authentication](../authentication.md) or `POST /gateway/auth/login`.

## Request

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5::cheap",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

| Field | Notes |
|-------|-------|
| `messages` | Required. `system` / `user` / `assistant` roles supported |
| `model` | Optional. Format `model::server` (Gommo) or omit for `GOMMO_CHAT_MODEL` default |
| `stream` | `true` → SSE in OpenAI chunk format |

`system` messages are prepended to the user query for upstream compatibility.

## Response (non-stream)

Standard OpenAI shape:

```json
{
  "id": "chatcmpl-…",
  "object": "chat.completion",
  "choices": [{
    "message": { "role": "assistant", "content": "…" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

Token usage is not reported by Gommo — fields are `0`.

## Streaming

```bash
curl -N -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.5::cheap","stream":true,"messages":[{"role":"user","content":"Hi"}]}'
```

Returns `text/event-stream` with `chat.completion.chunk` objects and final `data: [DONE]`.

## Models list

```bash
curl http://localhost:3001/v1/models \
  -H "Authorization: Bearer $TOKEN"
```

Returns the configured default chat model from env (`GOMMO_CHAT_MODEL`).

## vs `/gateway/chat`

| | `/v1/chat/completions` | `/gateway/chat` |
|---|------------------------|-----------------|
| Format | OpenAI | Gommo-native (`action`, `query`, `sessionId`) |
| SDKs | OpenAI-compatible | Custom |
| Upstream | Same Gommo chat | Same |

Use `/gateway/chat` when you need `set_model` or full Gommo fields. Use `/v1/*` for agent/SDK portability.

## Next

→ [Chat reference](../reference/chat.md) · [Endpoint map](../routing/endpoint-map.md) · [OpenAPI](/openapi.yaml)
