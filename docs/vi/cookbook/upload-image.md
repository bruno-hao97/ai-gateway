---
title: 'Recipe: Upload ảnh'
description: Multipart upload lên storage URL của gateway
---

# Upload ảnh

`POST /gateway/upload/image` — field **`file`**.

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

Response: `{ "success": true, "data": { "url": "..." } }` — dùng `url` trong job downstream (vd. image-to-video) khi model chấp nhận image URL trong `fields`.

## Upload video

`POST /gateway/upload/video` — field **`video_file`** hoặc **`file`**.

## Playground

Panel **Upload** → tab Image → chọn file → Upload.

## Tiếp theo

- [Upload reference](../reference/upload.md)
- [Video job](./video-music-job.md)
