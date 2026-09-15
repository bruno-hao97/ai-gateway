---
title: 'Recipe: แชท + stream'
description: Agent chat และ SSE streaming ผ่าน Gommo platform API
---

# แชท + stream

`POST https://api.gommo.net/api/v2/chat` — upstream ต้องการ **`messages` ไม่ว่าง**

## แชท (JSON response)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN" }
$body = "action=chat&domain=79ai.net&query=Say hello in one short sentence.&messages=[{\"role\":\"user\",\"text\":\"Say hello in one short sentence.\"}]"
Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/v2/chat" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

ทางเลือก: ส่ง `sessionId` จาก response ก่อนหน้าสำหรับ multi-turn

## Stream (SSE)

ใช้ `curl -N` อ่านสตรีมบน terminal:

```powershell
curl.exe -N -X POST "https://api.gommo.net/api/v2/chat" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action=stream&domain=79ai.net&query=Tell a very short story.&messages=[{\"role\":\"user\",\"text\":\"Tell a very short story.\"}]"
```

## ทางเลือก: gateway dev

`POST http://localhost:3001/gateway/chat` — JSON wrapper เมื่อ self-host local

## Playground

**Chat** panel → action **stream** → Run request

## ถัดไป

- [อ้างอิงแชท](../reference/chat.md)
- [Agent HTTP flow](./agent-http-flow.md)
