---
title: 'Recipe: Video hoặc music job'
description: List models và tạo video/music jobs
---

# Video hoặc music job

Cùng pattern public API với image — đổi `type` và poll `media`.

## 1. List models

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN" }

# Video
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=video" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=video&domain=79ai.net"

# Music
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=music" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=music&domain=79ai.net"
```

Parse model id và field catalog (`ratio`, `mode`, `duration`, …) từ response — **không đoán**.

## 2. Tạo music job (ví dụ)

```powershell
$body = "domain=79ai.net&project_id=default&prompt=Upbeat electronic loop&ratio=$ratio"
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/music/$slug" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

Video: `POST https://v2.api.gommo.net/ai/jobs/video/{model_id}` với models `type=video`.

## 3. Poll media

| Job type | `?media=` |
|----------|-----------|
| `video`, `avatar-lipsync`, `video-*` tools | `video` |
| `music` | `music` |
| `image`, `image-upscale`, `remove-bg` | `image` |

## Playground

Sidebar **Music job** hoặc **Video job** → fetch models cùng type trước.

## Tiếp theo

- [Async poll](./job-poll-async.md)
- [Media reference](../reference/media.md)
