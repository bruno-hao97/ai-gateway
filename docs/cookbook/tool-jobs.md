---
title: 'Recipe: Tool jobs (upscale, remove-bg)'
description: Upload source asset, list tool models, run image or video tools
---

# Tool jobs (upscale, remove-bg)

Tool jobs use the same REST shape as media jobs — only the **job `type`** and **poll `media`** change.

| Tool type | Endpoint | Poll `?media=` |
|-----------|----------|----------------|
| `image-upscale` | `POST /gateway/jobs/image-upscale` | `image` |
| `remove-bg` | `POST /gateway/jobs/remove-bg` | `image` |
| `video-upscale` | `POST /gateway/jobs/video-upscale` | `video` |
| `video-vfx`, `video-subtitle`, `video-cut` | `POST /gateway/jobs/{type}` | `video` |

## 1. Upload source (if needed)

Many tools need an input URL first — see [Upload image](./upload-image.md).

```powershell
$upload = curl.exe -s -X POST "http://localhost:3001/gateway/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "file=@C:\path\to\product.png" | ConvertFrom-Json
$imageUrl = $upload.data.url
```

## 2. List tool models

```powershell
$type = 'remove-bg'   # or image-upscale, video-upscale, …
$models = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=$type" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$m = $models.data[0]
$slug = $m.model ?? $m.slug
```

Add catalog fields (`ratio`, `mode`, `resolution`, …) from the model entry — **never guess**.

## 3. Create tool job

Pass extra field names from the model catalog (e.g. image URL). Common pattern after upload:

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$fields = @{
  prompt = 'Product on white background'
  image_url = $imageUrl   # field name from catalog if required
}
# Add ratio/mode/resolution from catalog when present:
# $fields.ratio = $ratio

$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = $fields
} | ConvertTo-Json -Depth 5

$job = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/$type" `
  -Headers $h -Body $jobBody
$job.data.resultUrl
```

::: tip Field names
If the catalog expects a different key (`url`, `image`, …), use that exact key from upstream — check `GET /gateway/models?type=…` or the RESPONSE in [Playground](/app/playground/).
:::

## 4. Async + poll

Same as [Async job + poll](./job-poll-async.md) — use poll media `image` for image tools, `video` for video tools.

## Playground

Sidebar **Tool jobs** → **Remove bg** or **Upscale image** → List models for that type → Run.

## Next

- [Upload image](./upload-image.md)
- [Media reference](../reference/media.md)
