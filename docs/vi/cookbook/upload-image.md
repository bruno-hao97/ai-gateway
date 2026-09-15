---
title: 'Recipe: Upload ảnh'
description: Multipart upload lên Gommo storage
---

# Upload ảnh

`POST https://v2.api.gommo.net/ai/upload/image` — field **`file`**.

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

Response: URL dùng trong job tiếp theo (vd. image-to-video) khi model chấp nhận image URL trong form.

## Upload video

`POST https://v2.api.gommo.net/ai/upload/video` — field **`video_file`** hoặc **`file`**.

## Tùy chọn: gateway dev

`POST http://localhost:3001/gateway/upload/image` khi self-host local.

## Playground

**Upload** panel → Image tab → chọn file → Upload.

## Tiếp theo

- [Upload reference](../reference/upload.md)
- [Video job](./video-music-job.md)
