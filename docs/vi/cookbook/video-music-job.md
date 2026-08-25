---
title: 'Recipe: Video hoặc music job'
description: List models và tạo video hoặc music job
---

# Video hoặc music job

Cùng shape REST với image — đổi `type` và poll `media`.

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

Parse `modelSlug` và catalog fields (`ratio`, `mode`, `duration`, …) từ response — **không đoán**.

## 2. Tạo music job (ví dụ)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = @{
    prompt = 'Upbeat electronic loop'
    ratio = $ratio   # từ catalog nếu có
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/music" `
  -Headers $h -Body $jobBody
```

Video: `POST /gateway/jobs/video` với models `type=video`.

## 3. Poll media

| Loại job | `?media=` |
|----------|-----------|
| `video`, `avatar-lipsync`, tool `video-*` | `video` |
| `music` | `music` |
| `image`, `image-upscale`, `remove-bg` | `image` |

## Playground

Sidebar **Music job** hoặc **Video job** → fetch models cùng type trước.

## Tiếp theo

- [Async poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
