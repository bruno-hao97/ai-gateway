---
title: Upload
description: Upload ảnh và video trên Gommo V2
---

# Upload

| Thao tác | Gommo public API (khuyên dùng) | Gateway (tùy chọn) |
|-----------|-------------------------------|-------------------|
| Upload image | `POST https://v2.api.gommo.net/ai/upload/image` | `POST /gateway/upload/image` |
| Upload video | `POST https://v2.api.gommo.net/ai/upload/video` | `POST /gateway/upload/video` |

Auth: `Authorization: Bearer` và/hoặc form `access_token`. Multipart gồm `domain`, `project_id`.

---

## Upload image

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "domain=79ai.net" -F "project_id=default" -F "file=@photo.png"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "domain=$d" -F "project_id=default" -F "file=@photo.png"
```

:::

---

## Upload video

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/video" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "domain=79ai.net" -F "project_id=default" -F "video_file=@clip.mp4"
```

:::

---

## Tùy chọn: self-host gateway

→ [Gommo public API](./gommo-public-api.md) · [Upload recipe](../cookbook/upload-image.md)
