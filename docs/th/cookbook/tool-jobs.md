---
title: 'Recipe: Tool jobs (upscale, remove-bg)'
description: อัปโหลด asset ลิสต์โมเดล tool รันเครื่องมือรูป/วิดีโอ
---

# Tool jobs (upscale, remove-bg)

tool jobs ใช้รูปแบบ public API เดียวกัน — เปลี่ยนแค่ **job `type`** และ **poll `media`**

| Tool type | Create URL | Poll `?media=` |
|-----------|------------|----------------|
| `image-upscale` | `POST v2…/ai/jobs/image-upscale/{model_id}` | `image` |
| `remove-bg` | `POST v2…/ai/jobs/remove-bg/{model_id}` | `image` |
| `video-upscale` | `POST v2…/ai/jobs/video-upscale/{model_id}` | `video` |
| `video-vfx`, `video-subtitle`, `video-cut` | `POST v2…/ai/jobs/{type}/{model_id}` | `video` |

## 1. อัปโหลด source (ถ้าจำเป็น)

หลาย tool ต้องมี URL อินพุตก่อน — ดู [อัปโหลดรูป](./upload-image.md)

```powershell
curl.exe -s -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "domain=79ai.net" -F "project_id=default" `
  -F "file=@C:\path\to\product.png"
```

## 2. ลิสต์โมเดล tool

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

เพิ่มฟิลด์แคตตาล็อก (`ratio`, `mode`, …) จาก model entry — **ห้ามเดา**

## 3. สร้าง tool job

```powershell
$body = "domain=79ai.net&project_id=default&prompt=Product on white&image_url=$imageUrl"
$job = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/$type/$slug" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

::: tip ชื่อฟิลด์
ถ้าแคตตาล็อกใช้ key อื่น (`url`, `image`, …) ใช้ key นั้น — ตรวจ `POST …/ai/models?type=…` หรือ RESPONSE ใน [Playground](/th/app/playground/)
:::

## 4. Async + poll

เหมือน [งาน async + poll](./job-poll-async.md) — poll media `image` สำหรับ image tools `video` สำหรับ video tools

## ถัดไป

- [อัปโหลดรูป](./upload-image.md)
- [อ้างอิงมีเดีย](../reference/media.md)
