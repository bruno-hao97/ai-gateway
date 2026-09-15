---
title: Upload
description: Image and video upload endpoints
---

# Upload

| Operation | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Upload image | `POST https://v2.api.gommo.net/ai/upload/image` | `POST /gateway/upload/image` | `POST /v2/ai/upload/image` |
| Upload video | `POST https://v2.api.gommo.net/ai/upload/video` | `POST /gateway/upload/video` | `POST /v2/ai/upload/video` |

Auth: `Authorization: Bearer {token}` and/or form `access_token`. Include `domain` and `project_id` in multipart.

Multipart fields:

| Type | Field |
|------|-------|
| Image | `file` (+ optional `fileName`) |
| Video | `video_file` or `file` |

---

## Upload image

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=79ai.net" ^
  -F "project_id=default" -F "file=@C:\path\to\photo.png"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "access_token=$env:TOKEN" -F "domain=$d" `
  -F "project_id=default" -F "file=@C:\path\to\photo.png"
```

```bash [curl — Bearer only]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "domain=79ai.net" -F "project_id=default" -F "file=@photo.png"
```

:::

---

## Upload video

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/video" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=79ai.net" ^
  -F "project_id=default" -F "video_file=@C:\path\to\clip.mp4"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/video" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "access_token=$env:TOKEN" -F "domain=$d" `
  -F "project_id=default" -F "video_file=@C:\path\to\clip.mp4"
```

:::

---

## Optional: self-host gateway (Mode B / C)

Mode B: `POST {gateway}/gateway/upload/image` — field `file`, Bearer auth, optional `domain` in multipart.

Mode C: `POST {gateway}/v2/ai/upload/image` — same multipart as Direct, base URL is your gateway.

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "file=@C:\path\to\photo.png"
```

```bash [curl — Proxy]
curl.exe -X POST "http://localhost:3001/v2/ai/upload/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=79ai.net" ^
  -F "file=@photo.png"
```

:::

→ [Gommo public API](./gommo-public-api.md) · [Upload recipe](../cookbook/upload-image.md)
