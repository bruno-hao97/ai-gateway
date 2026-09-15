---
title: 'Recipe: Tool jobs (upscale, remove-bg)'
description: Upload asset, list tool models, chạy image/video tools
---

# Tool jobs (upscale, remove-bg)

Tool jobs dùng cùng shape public API — chỉ **job `type`** và **poll `media`** thay đổi.

| Tool type | Create URL | Poll `?media=` |
|-----------|------------|----------------|
| `image-upscale` | `POST v2…/ai/jobs/image-upscale/{model_id}` | `image` |
| `remove-bg` | `POST v2…/ai/jobs/remove-bg/{model_id}` | `image` |
| `video-upscale` | `POST v2…/ai/jobs/video-upscale/{model_id}` | `video` |
| `video-vfx`, `video-subtitle`, `video-cut` | `POST v2…/ai/jobs/{type}/{model_id}` | `video` |

## 1. Upload source (nếu cần)

Nhiều tool cần URL input trước — xem [Upload ảnh](./upload-image.md).

```powershell
curl.exe -s -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "domain=79ai.net" -F "project_id=default" `
  -F "file=@C:\path\to\product.png"
```

## 2. List tool models

```powershell
$type = 'remove-bg'
$h = @{ Authorization = "Bearer $env:TOKEN" }
$models = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=$type" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=$type&domain=79ai.net"
$m = $models.data[0]
$slug = $m.model ?? $m.slug
```

Thêm field catalog (`ratio`, `mode`, …) từ model entry — **không đoán**.

## 3. Tạo tool job

```powershell
$body = "domain=79ai.net&project_id=default&prompt=Product on white&image_url=$imageUrl"
$job = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$type/$slug" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

::: tip Tên field
Nếu catalog dùng key khác (`url`, `image`, …), dùng key đó — kiểm tra `POST …/ai/models?type=…` hoặc RESPONSE trên [Playground](/vi/app/playground/).
:::

## 4. Async + poll

Giống [Job async + poll](./job-poll-async.md) — poll media `image` cho image tools, `video` cho video tools.

## Tiếp theo

- [Upload ảnh](./upload-image.md)
- [Media reference](../reference/media.md)
