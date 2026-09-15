---
title: Media & jobs
description: List models, create jobs, poll — Gommo public API
---

# Media & jobs

**Khuyến nghị:** [Gommo public API](./gommo-public-api.md) — `https://v2.api.gommo.net` cho models, jobs, upload.

Poll interval: **3500 ms**, tối đa **80** lần. Gửi **`domain`** trong mọi form body (vd. `79ai.net`). Auth: `Authorization: Bearer <access_token>`.

## Bản đồ endpoint

| Thao tác | Gommo public API (khuyến nghị) | Self-host tùy chọn |
|----------|-------------------------------|-------------------|
| List models | `POST https://v2.api.gommo.net/ai/models?type={type}` | `{gateway}/gateway/models` hoặc `{gateway}/v2/ai/models` |
| Create job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` | `{gateway}/gateway/jobs/{type}` (JSON) |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `{gateway}/gateway/jobs/{id}` |

**Job types:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

---

## List models

::: code-group

```bash [curl]
curl.exe -X POST "https://v2.api.gommo.net/ai/models?type=image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "type=image&domain=79ai.net"
```

```powershell [PowerShell]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$h = @{ Authorization = "Bearer $env:TOKEN" }
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=image" `
  -Headers $h `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "type=image&domain=$d"
```

:::

Chọn `model` / slug và `ratio`, `mode`, `resolution` cho phép từ response — không đoán.

---

## Create job

`ratio`, `mode`, `resolution`, và `duration` **phải** khớp catalog model.

::: code-group

```bash [curl]
curl.exe -X POST "https://v2.api.gommo.net/ai/jobs/image/MODEL_ID" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&project_id=default&prompt=Hello&ratio=RATIO_FROM_CATALOG"
```

```powershell [PowerShell]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "domain=$d&project_id=default&prompt=Hello&ratio=$ratio"
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

:::

---

## Poll job

Lặp mỗi **3500 ms**, tối đa **80** lần:

::: code-group

```bash [curl]
curl.exe -X POST "https://v2.api.gommo.net/ai/jobs/JOB_ID?media=image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&project_id=default"
```

```powershell [PowerShell]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$jobId?media=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "domain=$d&project_id=default"
```

:::

Khi thành công: tìm `result_url` / `file_url` trong `imageInfo`, `videoInfo`, hoặc tương đương trong response.

---

## Tùy chọn: self-host gateway (Mode B)

JSON create với poll phía server tùy chọn:

```json
POST {gateway}/gateway/jobs/image
{ "modelSlug": "…", "wait": true, "fields": { "prompt": "…", "ratio": "…" } }
```

→ [Integration modes](../routing/integration-modes.md#mode-b-gateway-rest)

## Response shape

Gommo trả JSON native (`success`, `data`, `imageInfo` / `videoInfo`, …). Gateway Mode B wrap thành `{ success, data, message, code }`.
