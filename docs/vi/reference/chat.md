---
title: Chat
description: Agent chat và SSE streaming trên Gommo platform API
---

# Chat

Upstream: `POST https://api.gommo.net/api/v2/chat` (form urlencoded).

| Thao tác | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Chat agent | `POST .../api/v2/chat` `action=chat` | `POST /gateway/chat` | `POST /api/v2/chat` |
| Chat stream | `action=stream` | `POST /gateway/chat` `action=stream` | SSE pipe |
| Set model | `action=set_model` | `POST /gateway/chat` | `POST /api/v2/chat` |

## Form fields (Direct)

| Field | Ghi chú |
|-------|---------|
| `action` | `chat`, `stream`, `set_model`, `models` |
| `access_token` | User token (hoặc Bearer header) |
| `domain` | Domain đăng ký, vd. `79ai.net` |
| `query` | Nội dung tin nhắn |
| `messages` | JSON array — **bắt buộc không rỗng** với `action=chat` |

::: warning
Upstream `action=chat` yêu cầu **`messages` không rỗng**. Gửi ít nhất `{ "role": "user", "text": "..." }`.
:::

`action=stream` → response **SSE**.

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

:::

---

## Stream

::: code-group

```bash [curl — Direct]
curl.exe -N -X POST "https://api.gommo.net/api/v2/chat" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=stream&access_token=%TOKEN%&domain=79ai.net&query=Tell a short story&messages=[{\"role\":\"user\",\"text\":\"Tell a short story\"}]"
```

:::

---

## Tùy chọn: self-host gateway (Mode B)

JSON wrapper tại `POST {gateway}/gateway/chat`. Xem [Integration modes](../routing/integration-modes.md).

→ [Gommo public API](./gommo-public-api.md)
