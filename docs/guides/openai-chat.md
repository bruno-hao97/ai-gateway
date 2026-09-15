---
title: OpenAI-compatible chat
description: Use POST /v1/chat/completions with standard OpenAI SDKs and agents
---

# OpenAI-compatible chat

AI Gateway exposes **`POST /v1/chat/completions`** — map Gommo chat to the OpenAI Chat Completions API so tools like LangChain, OpenAI SDK, or custom agents can plug in without Gommo-specific payloads.

::: info Gateway-only shim
This endpoint runs on a **self-hosted gateway** (`{gateway}/v1/*`). For direct Gommo integration use `POST https://api.gommo.net/api/v2/chat` — see [Chat reference](../reference/chat.md).
:::

## Auth

Same user token as all Gommo APIs:

```http
Authorization: Bearer <user_access_token>
```

Get a token via [public login](../authentication.md#login-direct-mode-a):

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$body = "email=you@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" -Body $body
$env:TOKEN = $login.access_token
```

Or paste a token from [/app/token/](/app/token/).

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

## vs `/gateway/chat` vs direct Gommo

| | Direct Gommo | `/v1/chat/completions` | `/gateway/chat` |
|---|--------------|--------------------------|-----------------|
| Host | `api.gommo.net` | Self-host gateway | Self-host gateway |
| Format | Form (`action`, `query`) | OpenAI | Gommo-native JSON |
| SDKs | Custom | OpenAI-compatible | Custom |

Use direct Gommo for production. Use `/v1/*` for OpenAI SDK portability on a self-hosted gateway.

## Next

→ [Chat reference](../reference/chat.md) · [Gommo public API](../reference/gommo-public-api.md) · [OpenAPI](/openapi.yaml)
