---
title: Chat
description: Agent chat และ SSE streaming บน Gommo platform API
---

# Chat

Upstream: `POST https://api.gommo.net/api/v2/chat` (form urlencoded)

| การดำเนินการ | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Chat agent | `POST .../api/v2/chat` `action=chat` | `POST /gateway/chat` | `POST /api/v2/chat` |
| Chat stream | `action=stream` | `POST /gateway/chat` `action=stream` | SSE pipe |
| Set model | `action=set_model` | `POST /gateway/chat` | `POST /api/v2/chat` |

## Form fields (Direct)

| Field | หมายเหตุ |
|-------|---------|
| `action` | `chat`, `stream`, `set_model`, `models` |
| `access_token` | User token (หรือ Bearer header) |
| `domain` | โดเมนที่สมัคร เช่น `79ai.net` |
| `query` | ข้อความผู้ใช้ |
| `messages` | JSON array — **ต้องไม่ว่าง** สำหรับ `action=chat` |

::: warning
Upstream `action=chat` ต้องมี **`messages` ไม่ว่าง** ส่งอย่างน้อย `{ "role": "user", "text": "..." }`
:::

`action=stream` → response **SSE**

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

## ทางเลือก: self-host gateway (Mode B)

JSON wrapper ที่ `POST {gateway}/gateway/chat` ดู [Integration modes](../routing/integration-modes.md)

→ [Gommo public API](./gommo-public-api.md)
