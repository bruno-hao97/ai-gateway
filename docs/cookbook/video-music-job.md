---
title: 'Recipe: Video or music job'
description: List models and create video or music jobs
---

# Video or music job

Same REST shape as image — change `type` and poll `media`.

## 1. List models

```powershell
# Video
Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=video" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }

# Music
Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=music" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

Parse `modelSlug` and catalog fields (`ratio`, `mode`, `duration`, …) from the response — **never guess**.

## 2. Create music job (example)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = @{
    prompt = 'Upbeat electronic loop'
    ratio = $ratio   # from catalog if present
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/music" `
  -Headers $h -Body $jobBody
```

Video: `POST /gateway/jobs/video` with `type=video` models.

## 3. Poll media

| Job type | `?media=` |
|----------|-----------|
| `video`, `avatar-lipsync`, `video-*` tools | `video` |
| `music` | `music` |
| `image`, `image-upscale`, `remove-bg` | `image` |

## Playground

Sidebar **Music job** or **Video job** → fetch models for same type first.

## Next

- [Async poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
