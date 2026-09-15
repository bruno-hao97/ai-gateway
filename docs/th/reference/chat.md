---
title: แชท
description: Agent chat และสตรีม SSE ผ่าน /gateway/chat
---

# แชท

Upstream: `POST https://api.gommo.net/api/v2/chat` (form urlencoded)

| การดำเนินการ | Gommo (Direct) | Gateway REST | Gateway proxy |
|-------------|----------------|--------------|---------------|
| Chat agent | `POST .../api/v2/chat` `action=chat` | `POST /gateway/chat` | `POST /api/v2/chat` |
| Chat stream | `action=stream` | `POST /gateway/chat` `action=stream` | pipe SSE |
| Set model | `action=set_model` | `POST /gateway/chat` | `POST /api/v2/chat` |

Env ค่าเริ่มต้น: `GOMMO_CHAT_SERVER=cheap`, `GOMMO_CHAT_MODEL=gpt-5.5::cheap`, `GOMMO_CHAT_AGENT_ID`

## REST body

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

::: warning
Upstream `action=chat` ต้องมี **`messages` ไม่ว่าง** ส่งอย่างน้อย `{ "role": "user", "text": "..." }`
:::

`domain` **ไม่จำเป็น** ใน REST body — gateway ใช้ `GOMMO_API_DOMAIN`

`action=stream` → response **SSE** gateway pipe โดยไม่ buffer

---

## Chat (agent)

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

```bash [curl — Proxy]
curl.exe -X POST "http://localhost:3001/api/v2/chat" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=chat&access_token=%TOKEN%&domain=%GOMMO_API_DOMAIN%&query=Hello&..."
```

:::

---

## Stream

```powershell
$body = @{
  action = 'stream'
  query = 'Tell a short story'
  messages = @(@{ role = 'user'; text = 'Tell a short story' })
} | ConvertTo-Json -Depth 5
curl.exe -N -X POST "http://localhost:3001/gateway/chat" `
  -H "Authorization: Bearer $env:TOKEN" -H "Content-Type: application/json" `
  -d $body
```
