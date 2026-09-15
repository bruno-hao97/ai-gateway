---
title: Chat
description: Agent chat and SSE streaming on Gommo platform API
---

# Chat

Upstream: `POST https://api.gommo.net/api/v2/chat` (form urlencoded).

| Operation | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Chat agent | `POST .../api/v2/chat` `action=chat` | `POST /gateway/chat` | `POST /api/v2/chat` |
| Chat stream | `action=stream` | `POST /gateway/chat` `action=stream` | SSE pipe |
| Set model | `action=set_model` | `POST /gateway/chat` | `POST /api/v2/chat` |

Default env (gateway only): `GOMMO_CHAT_SERVER=cheap`, `GOMMO_CHAT_MODEL=gpt-5.5::cheap`, `GOMMO_CHAT_AGENT_ID`.

## Form fields (Direct)

| Field | Notes |
|-------|-------|
| `action` | `chat`, `stream`, `set_model`, `models` |
| `access_token` | User token (or use Bearer header) |
| `domain` | Registration domain, e.g. `79ai.net` |
| `query` | User message text |
| `messages` | JSON array — **required non-empty** for `action=chat` |
| `sessionId` | Optional — multi-turn |

::: warning
Upstream `action=chat` requires **non-empty `messages`**. Send at least one `{ "role": "user", "text": "..." }`.
:::

`action=stream` → **SSE** response.

---

## Chat (agent)

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://api.gommo.net/api/v2/chat" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=chat&access_token=%TOKEN%&domain=79ai.net&query=Hello&messages=[{\"role\":\"user\",\"text\":\"Hello\"}]"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$messages = '[{"role":"user","text":"Hello"}]'
$form = "action=chat&access_token=$env:TOKEN&domain=$d&query=Hello&messages=$messages"
Invoke-RestMethod -Method POST -Uri "https://api.gommo.net/api/v2/chat" `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

```bash [curl — Bearer header]
curl.exe -X POST "https://api.gommo.net/api/v2/chat" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=chat&domain=79ai.net&query=Hello&messages=[{\"role\":\"user\",\"text\":\"Hello\"}]"
```

:::

---

## Stream

::: code-group

```bash [curl — Direct]
curl.exe -N -X POST "https://api.gommo.net/api/v2/chat" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=stream&access_token=%TOKEN%&domain=79ai.net&query=Tell a short story&messages=[{\"role\":\"user\",\"text\":\"Tell a short story\"}]"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$messages = '[{"role":"user","text":"Tell a short story"}]'
$form = "action=stream&access_token=$env:TOKEN&domain=$d&query=Tell a short story&messages=$messages"
curl.exe -N -X POST "https://api.gommo.net/api/v2/chat" `
  -ContentType "application/x-www-form-urlencoded" -d $form
```

:::

---

## Optional: self-host gateway (Mode B)

JSON wrapper at `POST {gateway}/gateway/chat`. Gateway fills `domain` from `GOMMO_API_DOMAIN` when omitted.

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

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/chat" ^
  -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" ^
  -d "{\"action\":\"chat\",\"query\":\"Hello\",\"messages\":[{\"role\":\"user\",\"text\":\"Hello\"}]}"
```

```powershell [PowerShell — REST]
$body = @{
  action = 'chat'
  query = 'Hello'
  messages = @(@{ role = 'user'; text = 'Hello' })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/gateway/chat" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type'='application/json' } -Body $body
```

:::

`action=stream` → gateway pipes SSE without buffering.

→ [Gommo public API](./gommo-public-api.md) · [Integration modes](../routing/integration-modes.md)
