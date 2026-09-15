---
title: 'Recipe: อัปโหลดรูป'
description: Multipart upload ไป Gommo storage
---

# อัปโหลดรูป

`POST https://v2.api.gommo.net/ai/upload/image` — ฟิลด์ **`file`**

## curl

```bash
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "domain=79ai.net" ^
  -F "project_id=default" ^
  -F "file=@C:\path\to\photo.png"
```

## PowerShell (curl)

```powershell
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "domain=79ai.net" `
  -F "project_id=default" `
  -F "file=@C:\path\to\photo.png"
```

Response: URL สำหรับงานถัดไป (เช่น image-to-video) เมื่อโมเดลรับ image URL ใน form

## อัปโหลดวิดีโอ

`POST https://v2.api.gommo.net/ai/upload/video` — ฟิลด์ **`video_file`** หรือ **`file`**

## ทางเลือก: gateway dev

`POST http://localhost:3001/gateway/upload/image` เมื่อ self-host local

## Playground

**Upload** panel → Image tab → เลือกไฟล์ → Upload

## ถัดไป

- [อ้างอิงอัปโหลด](../reference/upload.md)
- [งานวิดีโอ](./video-music-job.md)
