---
title: 'สูตร: งานวิดีโอหรือเพลง'
description: ลิสต์โมเดลและสร้างงานวิดีโอหรือเพลง
---

# งานวิดีโอหรือเพลง

รูปแบบ REST เหมือนรูป — เปลี่ยน `type` และ poll `media`

## 1. ลิสต์โมเดล

```powershell
# วิดีโอ
Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=video" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }

# เพลง
Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=music" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

แยก `modelSlug` และฟิลด์แคตตาล็อก (`ratio`, `mode`, `duration`, …) จาก response — **ห้ามเดา**

## 2. สร้างงานเพลง (ตัวอย่าง)

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = @{
    prompt = 'Upbeat electronic loop'
    ratio = $ratio   # จากแคตตาล็อกถ้ามี
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/music" `
  -Headers $h -Body $jobBody
```

วิดีโอ: `POST /gateway/jobs/video` ด้วยโมเดล `type=video`

## 3. Poll media

| ประเภทงาน | `?media=` |
|-----------|-----------|
| `video`, `avatar-lipsync`, เครื่องมือ `video-*` | `video` |
| `music` | `music` |
| `image`, `image-upscale`, `remove-bg` | `image` |

## Playground

Sidebar **Music job** หรือ **Video job** → ดึงโมเดลประเภทเดียวกันก่อน

## ถัดไป

- [Poll async](./job-poll-async.md)
- [อ้างอิงมีเดีย](../reference/media.md)
