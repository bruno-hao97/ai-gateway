---
title: Upload
description: Upload ảnh và video cho media jobs
---

# Upload

Upload asset lên Gommo storage trước khi truyền URL vào media jobs (vd. image-to-video, edit workflows).

## Endpoints (khuyến nghị)

| Asset | URL |
|-------|-----|
| Image | `POST https://v2.api.gommo.net/ai/upload/image` |
| Video | `POST https://v2.api.gommo.net/ai/upload/video` |

Auth: `Authorization: Bearer {access_token}`. Form: `domain`, `project_id=default`, file field.

## Multipart fields

| Loại | Tên field | Ghi chú |
|------|-----------|---------|
| Image | `file` | `fileName` tùy chọn |
| Video | `video_file` hoặc `file` | Tuân giới hạn size upstream |

## Upload ảnh

```bash
curl -X POST "https://v2.api.gommo.net/ai/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "domain=79ai.net" \
  -F "project_id=default" \
  -F "file=@photo.png"
```

Response gồm URL dùng trong job form tiếp theo (tên field chính xác phụ thuộc model target).

## Upload video

```bash
curl -X POST "https://v2.api.gommo.net/ai/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "domain=79ai.net" \
  -F "project_id=default" \
  -F "video_file=@clip.mp4"
```

## Luồng điển hình

```
Upload asset  →  URL trong response
       ↓
POST v2…/ai/models?type=video
       ↓
POST v2…/ai/jobs/video/{model_id}  với URL + prompt + ratio từ catalog
       ↓
Poll POST v2…/ai/jobs/{id}?media=video
```

## Portal UI

Quản lý upload tại [Files](/vi/app/files/) (sidebar **Developer → Files**, badge **beta**):

- Album Gommo (ảnh/video) từ library API
- **Copy URL** dùng trong job form fields

## Tùy chọn: self-host gateway

`POST {gateway}/gateway/upload/image` — multipart JSON wrapper. Xem [Upload reference](../reference/upload.md).

## API đầy đủ

→ [Upload reference](../reference/upload.md) · [Gommo public API](../reference/gommo-public-api.md)

## Tiếp theo

→ [Media jobs](./media-jobs.md) · [Features overview](./)
