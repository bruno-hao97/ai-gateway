---
title: 'Recipe: Tool jobs (upscale, remove-bg)'
description: Upload asset, list model tool, chạy image hoặc video tools
---

# Tool jobs (upscale, remove-bg)

Tool jobs dùng cùng shape REST với media job — chỉ đổi **`type`** và **poll `media`**.

| Tool type | Endpoint | Poll `?media=` |
|-----------|----------|----------------|
| `image-upscale` | `POST /gateway/jobs/image-upscale` | `image` |
| `remove-bg` | `POST /gateway/jobs/remove-bg` | `image` |
| `video-upscale` | `POST /gateway/jobs/video-upscale` | `video` |
| `video-vfx`, `video-subtitle`, `video-cut` | `POST /gateway/jobs/{type}` | `video` |

## 1. Upload nguồn (nếu cần)

Nhiều tool cần URL input trước — xem [Upload ảnh](./upload-image.md).

```powershell
$upload = curl.exe -s -X POST "http://localhost:3001/gateway/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "file=@C:\path\to\product.png" | ConvertFrom-Json
$imageUrl = $upload.data.url
```

## 2. List model tool

```powershell
$type = 'remove-bg'   # hoặc image-upscale, video-upscale, …
$models = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=$type" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$m = $models.data[0]
$slug = $m.model ?? $m.slug
```

Thêm catalog fields (`ratio`, `mode`, `resolution`, …) từ model — **không đoán**.

## 3. Tạo tool job

Truyền field names từ catalog (vd. URL ảnh). Pattern sau upload:

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$fields = @{
  prompt = 'Product on white background'
  image_url = $imageUrl   # tên field từ catalog nếu bắt buộc
}

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

::: tip Tên field
Nếu catalog dùng key khác (`url`, `image`, …), dùng đúng key đó — kiểm tra `GET /gateway/models?type=…` hoặc RESPONSE trên [Playground](/vi/app/playground/).
:::

## 4. Async + poll

Giống [Job async + poll](./job-poll-async.md) — poll `image` cho image tools, `video` cho video tools.

## Playground

Sidebar **Tool jobs** → **Remove bg** hoặc **Upscale image** → List models cùng type → Run.

## Tiếp theo

- [Upload ảnh](./upload-image.md)
- [Media reference](../reference/media.md)
