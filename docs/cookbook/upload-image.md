---
title: 'Recipe: Upload image'
description: Multipart upload to Gommo v2 storage
---

# Upload image

`POST https://v2.api.gommo.net/ai/upload/image` — field **`file`**.

## curl

```bash
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=79ai.net" ^
  -F "project_id=default" -F "file=@C:\path\to\photo.png"
```

## PowerShell (curl)

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "access_token=$env:TOKEN" -F "domain=$domain" `
  -F "project_id=default" -F "file=@C:\path\to\photo.png"
```

Response includes a public URL — use it in downstream jobs (e.g. image-to-video) when the model accepts image URLs in form fields.

## Video upload

`POST https://v2.api.gommo.net/ai/upload/video` — field **`video_file`** or **`file`**.

## Playground

**Upload** panel → Image tab → choose file → Upload.

## Optional: self-host gateway

`POST {gateway}/gateway/upload/image` — same multipart field `file`. See [Upload reference](../reference/upload.md).

## Next

- [Upload reference](../reference/upload.md)
- [Video job](./video-music-job.md)
