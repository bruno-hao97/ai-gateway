---
title: มีเดีย & งาน
description: ลิสต์โมเดล สร้างงาน poll — Gommo public API
---

# มีเดีย & งาน

**แนะนำ:** [Gommo public API](./gommo-public-api.md) — `https://v2.api.gommo.net` สำหรับ models, jobs, upload

Poll interval: **3500 ms** สูงสุด **80** ครั้ง ส่ง **`domain`** ในทุก form body (เช่น `79ai.net`) Auth: `Authorization: Bearer <access_token>`

## แผนที่ endpoint

| การดำเนินการ | Gommo public API (แนะนำ) | Self-host ทางเลือก |
|-------------|-------------------------|-------------------|
| ลิสต์โมเดล | `POST https://v2.api.gommo.net/ai/models?type={type}` | `{gateway}/gateway/models` หรือ `{gateway}/v2/ai/models` |
| สร้างงาน | `POST https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` | `{gateway}/gateway/jobs/{type}` (JSON) |
| Poll งาน | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `{gateway}/gateway/jobs/{id}` |

**ประเภทงาน:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

---

## ลิสต์โมเดล

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

เลือก `model` / slug และ `ratio`, `mode`, `resolution` ที่อนุญาตจาก response — ห้ามเดา

---

## สร้างงาน

`ratio`, `mode`, `resolution`, และ `duration` **ต้อง** ตรงกับแคตตาล็อกโมเดล

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

## Poll งาน

ทำซ้ำทุก **3500 ms** สูงสุด **80** ครั้ง:

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

เมื่อสำเร็จ: หา `result_url` / `file_url` ใน `imageInfo`, `videoInfo` หรือเทียบเท่าใน response

---

## ทางเลือก: self-host gateway (Mode B)

JSON create พร้อม poll ฝั่งเซิร์ฟเวอร์ทางเลือก:

```json
POST {gateway}/gateway/jobs/image
{ "modelSlug": "…", "wait": true, "fields": { "prompt": "…", "ratio": "…" } }
```

→ [โหมดการเชื่อมต่อ](../routing/integration-modes.md#mode-b-gateway-rest)

## รูปแบบ response

Gommo คืน JSON native (`success`, `data`, `imageInfo` / `videoInfo`, …) Gateway Mode B wrap เป็น `{ success, data, message, code }`
