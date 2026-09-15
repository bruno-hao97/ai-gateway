---
title: 'สูตร: อัปโหลดรูป'
description: Multipart upload ไป URL storage ของ gateway
---

# อัปโหลดรูป

`POST /gateway/upload/image` — ฟิลด์ **`file`**

## curl

```bash
curl.exe -X POST "http://localhost:3001/gateway/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "file=@C:\path\to\photo.png"
```

## PowerShell (curl)

```powershell
curl.exe -X POST "http://localhost:3001/gateway/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "file=@C:\path\to\photo.png"
```

Response: `{ "success": true, "data": { "url": "..." } }` — ใช้ `url` ในงานถัดไป (เช่น image-to-video) เมื่อโมเดลรับ URL รูปใน `fields`

## อัปโหลดวิดีโอ

`POST /gateway/upload/video` — ฟิลด์ **`video_file`** หรือ **`file`**

## Playground

แผง **Upload** → แท็บ Image → เลือกไฟล์ → Upload

## ถัดไป

- [อ้างอิงอัปโหลด](../reference/upload.md)
- [งานวิดีโอ](./video-music-job.md)
