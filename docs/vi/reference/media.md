---
title: Media & jobs
description: Liệt kê models, tạo job, poll — REST, proxy và direct
---

# Media & jobs

Gateway poll interval: **3500ms**, tối đa **80** lần khi `wait: true`.

Mode B: **`domain` tùy chọn** — gateway dùng `GOMMO_API_DOMAIN`. Mode A/C: gửi `domain` trong form (cùng giá trị env).

## Bản đồ endpoint

| Thao tác | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| List models | `POST https://v2.api.gommo.net/ai/models?type={type}` | `GET /gateway/models?type={type}` | `POST /v2/ai/models?type={type}` |
| Create job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{slug}` | `POST /gateway/jobs/{type}` | `POST /v2/ai/jobs/{type}/{slug}` |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `GET /gateway/jobs/{id}?media={media}` | `POST /v2/ai/jobs/{id}?media={media}` |

**Job types:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

---

## List models

::: tip Catalog public
`GET /gateway/models` **không bắt buộc** Bearer — browse model kiểu OpenRouter. **Tạo job / poll** vẫn cần auth.
:::

::: code-group

```bash [curl — REST (không auth)]
curl.exe "http://localhost:3001/gateway/models?type=image"
```

```bash [curl — REST (có token)]
curl.exe "http://localhost:3001/gateway/models?type=image" ^
  -H "Authorization: Bearer %TOKEN%"
```

```powershell [PowerShell — REST]
$h = @{ Authorization = "Bearer $env:TOKEN" }
Invoke-RestMethod "http://localhost:3001/gateway/models?type=image" -Headers $h
```

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/models?type=image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "type=image&domain=%GOMMO_API_DOMAIN%"
```

```powershell [PowerShell — Proxy]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/v2/ai/models?type=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "type=image&domain=$d"
```

:::

---

## Create job

### REST body

```json
{
  "modelSlug": "flux-dev",
  "wait": false,
  "fields": {
    "prompt": "A sunset over mountains",
    "ratio": "16:9"
  }
}
```

- `wait: true` → gateway poll tới khi xong hoặc timeout (~5 phút).
- `fields.ratio` (và `mode`, `resolution`, `duration`) **phải** khớp catalog model.

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/jobs/image" ^
  -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" ^
  -d "{\"modelSlug\":\"SLUG\",\"fields\":{\"prompt\":\"Hello\",\"ratio\":\"RATIO\"}}"
```

```powershell [PowerShell — REST]
$body = @{
  modelSlug = $slug
  wait = $false
  fields = @{ prompt = 'Hello'; ratio = $ratio }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/gateway/jobs/image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type'='application/json' } -Body $body
```

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/jobs/image/SLUG" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=%GOMMO_API_DOMAIN%&project_id=default&prompt=Hello&ratio=RATIO"
```

```powershell [PowerShell — Proxy]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "domain=$d&project_id=default&prompt=Hello&ratio=$ratio"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/v2/ai/jobs/image/$slug" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

:::

---

## Poll job

::: code-group

```bash [curl — REST]
curl.exe "http://localhost:3001/gateway/jobs/JOB_ID?media=image" ^
  -H "Authorization: Bearer %TOKEN%"
```

```powershell [PowerShell — REST]
Invoke-RestMethod "http://localhost:3001/gateway/jobs/$jobId?media=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/jobs/JOB_ID?media=image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=%GOMMO_API_DOMAIN%"
```

:::

Khi thành công: `data.resultUrl` hoặc `raw.imageInfo.result_url`.

---

## Envelope

```json
{
  "success": true,
  "data": { "id_base": "...", "status": "PROCESSING" },
  "raw": { "imageInfo": { "status": "...", "result_url": "https://..." } }
}
```
