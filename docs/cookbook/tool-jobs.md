---
title: 'Recipe: Tool jobs (upscale, remove-bg)'
description: Upload source asset, list tool models, run image or video tools
---

# Tool jobs (upscale, remove-bg)

Tool jobs use the same **form-urlencoded** shape as media jobs — only the **job `type`** and **poll `?media=`** change.

| Tool type | Create URL | Poll `?media=` |
|-----------|------------|----------------|
| `image-upscale` | `POST v2…/ai/jobs/image-upscale/{slug}` | `image` |
| `remove-bg` | `POST v2…/ai/jobs/remove-bg/{slug}` | `image` |
| `video-upscale` | `POST v2…/ai/jobs/video-upscale/{slug}` | `video` |
| `video-vfx`, `video-subtitle`, `video-cut` | `POST v2…/ai/jobs/{type}/{slug}` | `video` |

## 1. Upload source (if needed)

Many tools need an input URL first — see [Upload image](./upload-image.md).

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$upload = curl.exe -s -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "access_token=$env:TOKEN" -F "domain=$domain" `
  -F "project_id=default" -F "file=@C:\path\to\product.png" | ConvertFrom-Json
$imageUrl = $upload.data.url ?? $upload.url
```

## 2. List tool models

```powershell
$type = 'remove-bg'   # or image-upscale, video-upscale, …
$models = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=$type" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "type=$type&domain=$domain"
$m = $models.data[0]
$slug = $m.model ?? $m.slug
```

Add catalog fields (`ratio`, `mode`, `resolution`, …) from the model entry — **never guess**.

## 3. Create tool job

Pass extra field names from the model catalog (e.g. image URL). Common pattern after upload:

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' }
# Field names from catalog — e.g. image_url, url, image
$body = "domain=$domain&project_id=default&prompt=Product on white background&image_url=$imageUrl"

$created = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$type/$slug" `
  -Headers $h -Body $body
$jobId = $created.imageInfo.id_base ?? $created.data.id_base
```

::: tip Field names
If the catalog expects a different key (`url`, `image`, …), use that exact key from upstream — check `POST v2…/ai/models?type=…` or the RESPONSE in [Playground](/app/playground/).
:::

## 4. Async + poll

Same as [Async job + poll](./job-poll-async.md) — use poll media `image` for image tools, `video` for video tools.

## Playground

Sidebar **Tool jobs** → **Remove bg** or **Upscale image** → List models for that type → Run.

## Next

- [Upload image](./upload-image.md)
- [Media reference](../reference/media.md)
