---
title: 'สูตร: แชท + stream'
description: Agent chat และสตรีม SSE ผ่าน gateway
---

# แชท + stream

`POST /gateway/chat` — upstream ต้องมี **`messages` ไม่ว่าง**

## Chat (response JSON)

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

ทางเลือก: ส่ง `sessionId` จาก response ก่อนหน้าสำหรับหลายเทิร์น

## Stream (SSE)

ใช้ `curl -N` อ่านสตรีมในเทอร์มินัล:

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

Gateway pipe SSE โดยไม่ buffer

## Playground

แผง **Chat** → action **stream** → Run request

## ถัดไป

- [อ้างอิงแชท](../reference/chat.md)
- [Flow HTTP เอเจนต์](./agent-http-flow.md)
