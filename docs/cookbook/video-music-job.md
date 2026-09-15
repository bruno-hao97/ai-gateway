---
title: 'Recipe: Video or music job'
description: List models and create video or music jobs
---

# Video or music job

Same form-urlencoded shape as image — change `type` and poll `?media=`.

## 1. List models

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$h = @{ Authorization = "Bearer $env:TOKEN" }

# Video
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=video" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=video&domain=$domain"

# Music
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=music" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=music&domain=$domain"
```

Parse model slug and catalog fields (`ratio`, `mode`, `duration`, …) from the response — **never guess**.

## 2. Create music job (example)

```powershell
$body = "domain=$domain&project_id=default&prompt=Upbeat electronic loop&ratio=$ratio"
$created = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/music/$slug" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' } `
  -Body $body
$jobId = $created.musicInfo.id_base ?? $created.data.id_base
```

Video: `POST https://v2.api.gommo.net/ai/jobs/video/{slug}` with `type=video` models.

## 3. Poll media

| Job type | `?media=` |
|----------|-----------|
| `video`, `avatar-lipsync`, `video-*` tools | `video` |
| `music` | `music` |
| `image`, `image-upscale`, `remove-bg` | `image` |

```powershell
$pollBody = "access_token=$env:TOKEN&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=music" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' } `
  -Body $pollBody
```

Poll every **3.5s**, max **80** attempts.

## Playground

Sidebar **Music job** or **Video job** → fetch models for same type first.

## Next

- [Async poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
