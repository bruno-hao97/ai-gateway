---
title: Upload
description: Upload ảnh và video cho media jobs
---

# Upload

Upload asset lên Gommo trước khi truyền URL vào media job (image-to-video, edit, …).

## Endpoint

| Asset | REST | Proxy |
|-------|------|-------|
| Ảnh | `POST /gateway/upload/image` | `POST /v2/ai/upload/image` |
| Video | `POST /gateway/upload/video` | `POST /v2/ai/upload/video` |

Auth: `Authorization: Bearer {token}`.

Mode B: `domain` tùy chọn.

## Multipart

| Loại | Field |
|------|-------|
| Ảnh | `file` (+ `fileName` tùy chọn) |
| Video | `video_file` hoặc `file` |

Giới hạn gateway: **50 MB**.

## Upload ảnh

```bash
curl -X POST "http://localhost:3001/gateway/upload/image" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@photo.png"
```

Response có URL dùng trong `fields` job tiếp theo.

## Luồng điển hình

```
Upload → URL
   ↓
List models
   ↓
POST /gateway/jobs/video + wait hoặc poll
```

## Mode C / Direct

Form: `access_token`, `domain`, `project_id=default`, `file` / `video_file`.

## API đầy đủ

→ [Upload reference](../reference/upload.md) · [Media jobs](./media-jobs.md)

## Tiếp theo

→ [Media jobs](./media-jobs.md)
