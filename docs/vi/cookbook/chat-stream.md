---
title: 'Recipe: Chat + stream'
description: Agent chat và SSE streaming qua Gommo platform API
---

# Chat + stream

`POST https://api.gommo.net/api/v2/chat` — upstream yêu cầu **`messages` không rỗng**.

## Chat (JSON response)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN" }
$body = "action=chat&domain=79ai.net&query=Say hello in one short sentence.&messages=[{\"role\":\"user\",\"text\":\"Say hello in one short sentence.\"}]"
Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/v2/chat" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

Tùy chọn: truyền `sessionId` từ response trước cho multi-turn.

## Stream (SSE)

Dùng `curl -N` đọc stream trên terminal:

```powershell
curl.exe -N -X POST "https://api.gommo.net/api/v2/chat" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=stream&domain=79ai.net&query=Tell a very short story.&messages=[{\"role\":\"user\",\"text\":\"Tell a very short story.\"}]"
```

## Tùy chọn: gateway dev

`POST http://localhost:3001/gateway/chat` — JSON wrapper khi self-host local.

## Playground

**Chat** panel → action **stream** → Run request.

## Tiếp theo

- [Chat reference](../reference/chat.md)
- [Agent HTTP flow](./agent-http-flow.md)
