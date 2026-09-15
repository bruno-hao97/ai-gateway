---
title: 'Recipe: งาน async + poll'
description: สร้างงานไม่ wait แล้ว poll จนได้ resultUrl
---

# งาน async + poll loop

ใช้เมื่อต้องการ job id ทันทีและ poll จากแอป (หรือ [Playground poll loop](/th/app/playground/))

Gommo poll interval: **3500ms** สูงสุด **80** ครั้ง (~5 นาที) แต่ละ poll คือ `POST` ไป `/ai/jobs/{id_base}?media=…`

::: tip Public API
Create: `POST https://v2.api.gommo.net/ai/jobs/image/{model_id}` (form body) Poll: `POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image` ดู [Gommo public API](../reference/gommo-public-api.md)
:::

## 1. สร้างงาน

สมมติ `$env:TOKEN`, `$slug`, `$ratio` จาก [งานรูปแรก](./image-job-wait.md)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN" }
$body = "domain=79ai.net&project_id=default&prompt=A cute cat&ratio=$ratio"
$created = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body

$jobId = $created.imageInfo.id_base ?? $created.data.id_base ?? $created.id_base
Write-Host "jobId=$jobId"
```

## 2. Poll ครั้งเดียว

```powershell
$pollBody = "domain=79ai.net&project_id=default"
$poll = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $pollBody
$poll
```

## 3. Loop ง่าย (PowerShell)

```powershell
$max = 80
$intervalSec = 3.5
for ($i = 1; $i -le $max; $i++) {
  $poll = Invoke-RestMethod -Method POST `
    -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
    -Headers $h `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $pollBody
  $url = $poll.imageInfo.result_url ?? $poll.data?.resultUrl
  if ($url) { Write-Host "Done: $url"; break }
  Write-Host "Attempt $i — waiting..."
  Start-Sleep -Seconds $intervalSec
}
```

**Poll media:** `image` | `video` | `music` — ต้องตรงกับประเภทงาน

## Playground

Media job → ยกเลิก **wait** → **Poll job** → **Auto poll (3.5s)**

## ถัดไป

- [งานวิดีโอ / เพลง](./video-music-job.md)
- [อ้างอิงมีเดีย](../reference/media.md)
