---
title: อัปโหลด
description: อัปโหลดรูปและวิดีโอสำหรับงานมีเดีย
---

# อัปโหลด

อัปโหลด asset ไป Gommo storage ก่อนส่ง URL เข้างานมีเดีย (เช่น image-to-video, workflow แก้ไข)

## Endpoints (แนะนำ)

| Asset | URL |
|-------|-----|
| Image | `POST https://v2.api.gommo.net/ai/upload/image` |
| Video | `POST https://v2.api.gommo.net/ai/upload/video` |

Auth: `Authorization: Bearer {access_token}` Form: `domain`, `project_id=default`, file field

## ฟิลด์ multipart

| ประเภท | ชื่อฟิลด์ | หมายเหตุ |
|--------|----------|----------|
| Image | `file` | `fileName` ทางเลือก |
| Video | `video_file` หรือ `file` | เคารพขีดขนาด upstream |

## อัปโหลดรูป

```bash
curl -X POST "https://v2.api.gommo.net/ai/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "domain=79ai.net" \
  -F "project_id=default" \
  -F "file=@photo.png"
```

response มี URL สำหรับ job form ถัดไป (ชื่อฟิลด์ที่แน่นอนขึ้นกับโมเดลเป้าหมาย)

## อัปโหลดวิดีโอ

```bash
curl -X POST "https://v2.api.gommo.net/ai/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "domain=79ai.net" \
  -F "project_id=default" \
  -F "video_file=@clip.mp4"
```

## Flow ทั่วไป

```
อัปโหลด asset  →  URL ใน response
       ↓
POST v2…/ai/models?type=video
       ↓
POST v2…/ai/jobs/video/{model_id}  พร้อม URL + prompt + ratio จากแคตตาล็อก
       ↓
Poll POST v2…/ai/jobs/{id}?media=video
```

## Portal UI

จัดการอัปโหลดที่ [Files](/th/app/files/) (sidebar **Developer → Files**, badge **beta**):

- อัลบั้ม Gommo (รูป/วิดีโอ) จาก library API
- **Copy URL** สำหรับ job form fields

## ทางเลือก: self-host gateway

`POST {gateway}/gateway/upload/image` — multipart JSON wrapper ดู [อ้างอิงอัปโหลด](../reference/upload.md)

## API ฉบับเต็ม

→ [อ้างอิงอัปโหลด](../reference/upload.md) · [Gommo public API](../reference/gommo-public-api.md)

## ถัดไป

→ [งานมีเดีย](./media-jobs.md) · [ภาพรวมฟีเจอร์](./)
