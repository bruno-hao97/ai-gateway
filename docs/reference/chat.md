# Chat

Upstream: `POST https://api.gommo.net/api/v2/chat` (form urlencoded).

| Operation | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Chat agent | `POST .../api/v2/chat` `action=chat` | `POST /gateway/chat` | `POST /api/v2/chat` |
| Chat stream | `action=stream` | `POST /gateway/chat` `action=stream` | SSE pipe |
| Set model | `action=set_model` | `POST /gateway/chat` | `POST /api/v2/chat` |

Default env: `GOMMO_CHAT_SERVER=cheap`, `GOMMO_CHAT_MODEL=gpt-5.5::cheap`, `GOMMO_CHAT_AGENT_ID`.

## REST body

```json
{
  "action": "chat",
  "query": "Xin chào",
  "sessionId": "optional-uuid",
  "messages": [
    { "role": "user", "text": "Xin chào" }
  ]
}
```

::: warning
Upstream `action=chat` yêu cầu **`messages` không rỗng**. Gửi ít nhất một `{ "role": "user", "text": "..." }`.
:::

`domain` **không cần** trong body REST — gateway dùng `GOMMO_API_DOMAIN`.

`action=stream` → response **SSE**, gateway pipe không buffer.

---

## Chat (agent)

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/chat" ^
  -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" ^
  -d "{\"action\":\"chat\",\"query\":\"Xin chao\",\"messages\":[{\"role\":\"user\",\"text\":\"Xin chao\"}]}"
```

```powershell [PowerShell — REST]
$body = @{
  action = 'chat'
  query = 'Xin chao'
  messages = @(@{ role = 'user'; text = 'Xin chao' })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/gateway/chat" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type'='application/json' } -Body $body
```

```bash [curl — Proxy]
curl.exe -X POST "http://localhost:3001/api/v2/chat" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=chat&access_token=%TOKEN%&domain=%GOMMO_API_DOMAIN%&query=Xin+chao&..."
```

:::

---

## Stream

```powershell
$body = @{
  action = 'stream'
  query = 'Ke chuyen ngan'
  messages = @(@{ role = 'user'; text = 'Ke chuyen ngan' })
} | ConvertTo-Json -Depth 5
curl.exe -N -X POST "http://localhost:3001/gateway/chat" `
  -H "Authorization: Bearer $env:TOKEN" -H "Content-Type: application/json" `
  -d $body
```
