---
title: 'Recipe: Upload image'
description: Multipart upload to gateway storage URL
---

# Upload image

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

Response: `{ "success": true, "data": { "url": "..." } }` — use `url` in downstream jobs (e.g. image-to-video) when the model accepts image URLs in `fields`.

## Video upload

`POST /gateway/upload/video` — field **`video_file`** or **`file`**.

## Playground

**Upload** panel → Image tab → choose file → Upload.

## Next

- [Upload reference](../reference/upload.md)
- [Video job](./video-music-job.md)
