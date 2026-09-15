---
title: 'Recipe: Chat + stream'
description: Agent chat and SSE streaming on Gommo platform API
---

# Chat + stream

`POST https://api.gommo.net/api/v2/chat` — upstream requires **non-empty `messages`**. Form body: `application/x-www-form-urlencoded`.

## Chat (JSON response)

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$messages = '[{"role":"user","text":"Say hello in one short sentence."}]'
$form = "action=chat&access_token=$env:TOKEN&domain=$domain&query=Say hello in one short sentence.&messages=$messages"

Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/v2/chat" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $form
```

Optional: pass `sessionId` from a prior response for multi-turn.

## Stream (SSE)

Use `curl -N` to read the stream on the terminal:

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$messages = '[{"role":"user","text":"Tell a very short story."}]'
$form = "action=stream&access_token=$env:TOKEN&domain=$domain&query=Tell a very short story.&messages=$messages"

curl.exe -N -X POST "https://api.gommo.net/api/v2/chat" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d $form
```

## Playground

**Chat** panel → action **stream** → Run request.

## Optional: self-host gateway

`POST {gateway}/gateway/chat` with JSON `{ "action", "query", "messages" }` — gateway pipes SSE without buffering. See [Chat reference](../reference/chat.md).

## Next

- [Chat reference](../reference/chat.md)
- [Agent HTTP flow](./agent-http-flow.md)
