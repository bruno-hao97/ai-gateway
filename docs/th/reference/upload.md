---
title: อัปโหลด
description: endpoint อัปโหลดรูปและวิดีโอ
---

# อัปโหลด

| การดำเนินการ | Gommo (Direct) | Gateway REST | Gateway proxy |
|-------------|----------------|--------------|---------------|
| อัปโหลดรูป | `POST https://v2.api.gommo.net/ai/upload/image` | `POST /gateway/upload/image` | `POST /v2/ai/upload/image` |
| อัปโหลดวิดีโอ | `POST https://v2.api.gommo.net/ai/upload/video` | `POST /gateway/upload/video` | `POST /v2/ai/upload/video` |

REST auth: `Authorization: Bearer {token}` Domain REST: ทางเลือก (ฟิลด์ multipart `domain` เพื่อ override)

ฟิลด์ multipart:

| ประเภท | ฟิลด์ |
|--------|-------|
| รูป | `file` (+ `fileName` ทางเลือก) |
| วิดีโอ | `video_file` หรือ `file` |

---

## อัปโหลดรูป

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

## อัปโหลดวิดีโอ

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/upload/video" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "video_file=@C:\path\to\clip.mp4"
```

```powershell [PowerShell]
curl.exe -X POST "http://localhost:3001/gateway/upload/video" `
  -H "Authorization: Bearer $env:TOKEN" `
  -F "video_file=@C:\path\to\clip.mp4"
```

```bash [curl — Direct]
curl.exe -X POST "https://v2.api.gommo.net/ai/upload/video" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "access_token=%TOKEN%" -F "domain=%GOMMO_API_DOMAIN%" ^
  -F "project_id=default" -F "video_file=@clip.mp4"
```

:::

Response มี URL สาธารณะสำหรับฟิลด์งานมีเดีย (ชื่อฟิลด์จากแคตตาล็อกโมเดล)
