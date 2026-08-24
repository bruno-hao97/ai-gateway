# Media & jobs

Poll interval gateway: **3500ms**, max **80** attempts khi `wait: true`.

Mode B: **`domain` tùy chọn** — gateway dùng `GOMMO_API_DOMAIN`. Mode A/C: gửi `domain` trong form (cùng giá trị env).

## Endpoint map

| Operation | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| List models | `POST https://v2.api.gommo.net/ai/models?type={type}` | `GET /gateway/models?type={type}` | `POST /v2/ai/models?type={type}` |
| Create job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{slug}` | `POST /gateway/jobs/{type}` | `POST /v2/ai/jobs/{type}/{slug}` |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `GET /gateway/jobs/{id}?media={media}` | `POST /v2/ai/jobs/{id}?media={media}` |

**Job types:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

---

## List models

::: code-group

```bash [curl — REST]
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

- `wait: true` → gateway poll tới done/timeout (~5 phút).
- `fields.ratio` (và `mode`, `resolution`, `duration`) **phải** khớp catalog models.

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

Kết quả: `data.result_url` hoặc `raw.imageInfo.result_url` khi success.

---

## Envelope

```json
{
  "success": true,
  "data": { "id_base": "...", "status": "PROCESSING" },
  "raw": { "imageInfo": { "status": "...", "result_url": "https://..." } }
}
```
