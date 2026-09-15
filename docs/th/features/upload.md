---
title: อัปโหลด
description: อัปโหลดรูปและวิดีโอสำหรับงานมีเดีย
---

# อัปโหลด

อัปโหลด asset ไป Gommo storage ก่อนส่ง URL เข้างานมีเดีย (เช่น image-to-video workflow แก้ไข)

## Endpoints

| Asset | Gateway REST | Proxy |
|-------|--------------|-------|
| รูป | `POST /gateway/upload/image` | `POST /v2/ai/upload/image` |
| วิดีโอ | `POST /gateway/upload/video` | `POST /v2/ai/upload/video` |

Auth: `Authorization: Bearer {token}`

โหมด B: **`domain` ทางเลือก** — gateway ใช้ env ส่ง multipart `domain` เพื่อ override ได้

## ฟิลด์ multipart

| ประเภท | ชื่อฟิลด์ | หมายเหตุ |
|--------|-----------|----------|
| รูป | `file` | `fileName` ทางเลือก |
| วิดีโอ | `video_file` หรือ `file` | ไฟล์ใหญ่รองรับสูงสุด **50 MB** ขีด gateway |

## อัปโหลดรูป (REST)

```bash
curl -X POST "http://localhost:3001/gateway/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.png"
```

Response มี URL สำหรับใช้ใน `fields` ของงานถัดไป (ชื่อฟิลด์ขึ้นกับโมเดลเป้าหมาย)

## อัปโหลดวิดีโอ (REST)

```bash
curl -X POST "http://localhost:3001/gateway/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video_file=@clip.mp4"
```

## Workflow ทั่วไป

```
อัปโหลด asset  →  URL ใน response
       ↓
ลิสต์โมเดล (ประเภท video/image)
       ↓
POST /gateway/jobs/video  พร้อม URL + prompt + ratio จากแคตตาล็อก
       ↓
wait: true  หรือ  poll งาน
```

## UI Portal

จัดการอัปโหลดที่ [Files](/th/app/files/) (sidebar **Developer → Files** badge **beta**):

- อัลบั้ม Gommo (รูป/วิดีโอ) จาก library API
- **อัปโหลดล่าสุด** เก็บใน `localStorage` ของเบราว์เซอร์บนอุปกรณ์นี้
- **Copy URL** หรือ **Copy fields** (snippet JSON สำหรับ `POST /gateway/jobs/*`)

## โหมด C / Direct

Proxy และ direct ใช้ฟิลด์ form ของ Gommo:

```
access_token, domain, project_id=default, file or video_file
```

Direct upstream: `https://v2.api.gommo.net/ai/upload/image`

## ข้อผิดพลาด

การอัปโหลด REST ล้มเหลวคืนข้อผิดพลาดมีโครงสร้าง:

```json
{ "success": false, "message": "…", "code": "UPSTREAM_ERROR" }
```

ตรวจขนาดไฟล์ (ขีด proxy 50 MB) และความถูกต้องของ token

## API ฉบับเต็ม

→ [อ้างอิงอัปโหลด](../reference/upload.md) · [งานมีเดีย](./media-jobs.md)

## ถัดไป

→ [งานมีเดีย](./media-jobs.md) · [ภาพรวมฟีเจอร์](./)
