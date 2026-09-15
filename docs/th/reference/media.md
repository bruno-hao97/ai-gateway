---
title: มีเดีย & งาน
description: รายการโมเดล สร้างงาน poll — REST, proxy และ direct
---

# มีเดีย & งาน

**Public API (แนะนำ):** [Gommo public API](./gommo-public-api.md) — `https://v2.api.gommo.net` สำหรับ jobs/models/upload

ช่วง poll: **3500ms** สูงสุด **80** ครั้ง ส่ง `domain` ใน form body (เช่น `79ai.net`) Gateway Mode B ทางเลือกสำหรับ dev local (`wait: true` ใน JSON)

## แผนที่ endpoint

| การดำเนินการ | Gommo (Direct) | Gateway REST | Gateway proxy |
|-------------|----------------|--------------|---------------|
| รายการโมเดล | `POST https://v2.api.gommo.net/ai/models?type={type}` | `GET /gateway/models?type={type}` | `POST /v2/ai/models?type={type}` |
| สร้างงาน | `POST https://v2.api.gommo.net/ai/jobs/{type}/{slug}` | `POST /gateway/jobs/{type}` | `POST /v2/ai/jobs/{type}/{slug}` |
| Poll งาน | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `GET /gateway/jobs/{id}?media={media}` | `POST /v2/ai/jobs/{id}?media={media}` |

**ประเภทงาน:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

---

## รายการโมเดล

::: tip Catalog สาธารณะ
`GET /gateway/models` **ไม่ต้อง** Bearer — เรียกดูโมเดลแบบ OpenRouter token ผู้ใช้ทางเลือกหรือ fallback ฝั่งเซิร์ฟเวอร์อาจใช้ได้ **สร้างงาน / poll** ยังต้อง auth

เพิ่ม `?lang=en` สำหรับคำอธิบายภาษาอังกฤษจาก `cache/catalog-descriptions.en.json` (warm ด้วย `npm run catalog:translate` และ `GOMMO_ACCESS_TOKEN`) runtime ไม่เรียก API ภายนอกเว้น `CATALOG_TRANSLATE_ON_REQUEST=true`
:::

::: code-group

```bash [curl — REST (ไม่มี auth)]
curl.exe "http://localhost:3001/gateway/models?type=image"
```

```bash [curl — REST (มี token)]
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

## สร้างงาน

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

- `wait: true` → gateway poll จนเสร็จหรือ timeout (~5 นาที)
- `fields.ratio` (และ `mode`, `resolution`, `duration`) **ต้อง** ตรง catalog โมเดล

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

## Poll งาน

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

เมื่อสำเร็จ: `data.resultUrl` หรือ `raw.imageInfo.result_url`

---

## Envelope

```json
{
  "success": true,
  "data": { "id_base": "...", "status": "PROCESSING" },
  "raw": { "imageInfo": { "status": "...", "result_url": "https://..." } }
}
```
