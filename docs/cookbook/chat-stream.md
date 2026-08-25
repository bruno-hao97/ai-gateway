---
title: 'Recipe: Chat + stream'
description: Agent chat and SSE streaming via gateway
---

# Chat + stream

`POST /gateway/chat` — upstream requires **non-empty `messages`**.

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

Optional: pass `sessionId` from a prior response for multi-turn.

## Stream (SSE)

Use `curl -N` to read the stream on the terminal:

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

Gateway pipes SSE without buffering.

## Playground

**Chat** panel → action **stream** → Run request.

## Next

- [Chat reference](../reference/chat.md)
- [Agent HTTP flow](./agent-http-flow.md)
