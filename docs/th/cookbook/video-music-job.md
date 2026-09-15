---
title: 'Recipe: งานวิดีโอหรือเพลง'
description: ลิสต์โมเดลและสร้างงานวิดีโอ/เพลง
---

# งานวิดีโอหรือเพลง

รูปแบบ public API เดียวกับรูป — เปลี่ยน `type` และ poll `media`

## 1. ลิสต์โมเดล

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN" }

# Video
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=video" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=video&domain=79ai.net"

# Music
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/models?type=music" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body "type=music&domain=79ai.net"
```

แยก model id และฟิลด์แคตตาล็อก (`ratio`, `mode`, `duration`, …) จาก response — **ห้ามเดา**

## 2. สร้างงานเพลง (ตัวอย่าง)

```powershell
$body = "domain=79ai.net&project_id=default&prompt=Upbeat electronic loop&ratio=$ratio"
Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/music/$slug" `
  -Headers $h -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

วิดีโอ: `POST https://v2.api.gommo.net/ai/jobs/video/{model_id}` กับโมเดล `type=video`

## 3. Poll media

| ประเภทงาน | `?media=` |
|-----------|-----------|
| `video`, `avatar-lipsync`, `video-*` tools | `video` |
| `music` | `music` |
| `image`, `image-upscale`, `remove-bg` | `image` |

## Playground

Sidebar **Music job** หรือ **Video job** → fetch models ประเภทเดียวกันก่อน

## ถัดไป

- [Async poll](./job-poll-async.md)
- [อ้างอิงมีเดีย](../reference/media.md)
