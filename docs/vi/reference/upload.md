---
title: Upload
description: Endpoint upload ảnh và video
---

# Upload

| Thao tác | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Upload image | `POST https://v2.api.gommo.net/ai/upload/image` | `POST /gateway/upload/image` | `POST /v2/ai/upload/image` |
| Upload video | `POST https://v2.api.gommo.net/ai/upload/video` | `POST /gateway/upload/video` | `POST /v2/ai/upload/video` |

REST auth: `Authorization: Bearer {token}`. Domain REST: tùy chọn (field multipart `domain` để override).

Multipart fields:

| Loại | Field |
|------|-------|
| Image | `file` (+ tùy chọn `fileName`) |
| Video | `video_file` hoặc `file` |

---

## Upload image

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "file=@C:\path\to\photo.png"
```

```powershell [PowerShell]
curl.exe -X POST "http://localhost:3001/gateway/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "file=@C:\path\to\photo.png"
```

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=%GOMMO_API_DOMAIN%" ^
  -F "project_id=default" -F "file=@photo.png"
```

```bash [curl — Proxy]
curl.exe -X POST "http://localhost:3001/v2/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=%GOMMO_API_DOMAIN%" ^
  -F "file=@photo.png"
```

:::

---

## Upload video

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/upload/video" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "video_file=@C:\path\to\clip.mp4"
```

```bash [curl — Proxy]
curl.exe -X POST "http://localhost:3001/v2/ai/upload/video" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=%GOMMO_API_DOMAIN%" ^
  -F "video_file=@clip.mp4"
```

:::
