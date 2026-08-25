---
title: 'Recipe: Chat + stream'
description: Agent chat và SSE streaming qua gateway
---

# Chat + stream

`POST /gateway/chat` — upstream yêu cầu **`messages` không rỗng**.

## Chat (JSON response)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$body = @{
  action = 'chat'
  query = 'Say hello in one short sentence.'
  messages = @(@{ role = 'user'; text = 'Say hello in one short sentence.' })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/chat" `
  -Headers $h -Body $body
```

Tùy chọn: truyền `sessionId` từ response trước cho multi-turn.

## Stream (SSE)

Dùng `curl -N` để đọc stream trên terminal:

```powershell
$body = @{
  action = 'stream'
  query = 'Tell a very short story.'
  messages = @(@{ role = 'user'; text = 'Tell a very short story.' })
} | ConvertTo-Json -Depth 5

curl.exe -N -X POST "http://localhost:3001/gateway/chat" `
  -H "Authorization: Bearer $env:TOKEN" `
  -H "Content-Type: application/json" `
  -d $body
```

Gateway pipe SSE không buffer.

## Playground

Panel **Chat** → action **stream** → Run request.

## Tiếp theo

- [Chat reference](../reference/chat.md)
- [Agent HTTP flow](./agent-http-flow.md)
