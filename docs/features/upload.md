---
title: Upload
description: Upload images and videos for use in media jobs
---

# Upload

Upload assets to Gommo storage before passing URLs into media jobs (e.g. image-to-video, edit workflows).

## Endpoints (recommended)

| Asset | URL |
|-------|-----|
| Image | `POST https://v2.api.gommo.net/ai/upload/image` |
| Video | `POST https://v2.api.gommo.net/ai/upload/video` |

Auth: `Authorization: Bearer {access_token}`. Form: `domain`, `project_id=default`, file field.

## Multipart fields

| Type | Field name | Notes |
|------|------------|-------|
| Image | `file` | Optional `fileName` |
| Video | `video_file` or `file` | Respect upstream size limits |

## Upload image

```bash
curl -X POST "https://v2.api.gommo.net/ai/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "domain=79ai.net" \
  -F "project_id=default" \
  -F "file=@photo.png"
```

Response includes a URL to use in subsequent job form fields (exact field name depends on the target model).

## Upload video

```bash
curl -X POST "https://v2.api.gommo.net/ai/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "domain=79ai.net" \
  -F "project_id=default" \
  -F "video_file=@clip.mp4"
```

## Typical workflow

```
Upload asset  →  URL in response
       ↓
POST v2…/ai/models?type=video
       ↓
POST v2…/ai/jobs/video/{model_id}  with URL + prompt + ratio from catalog
       ↓
Poll POST v2…/ai/jobs/{id}?media=video
```

## Portal UI

Manage uploads at [Files](/app/files/) (sidebar **Developer → Files**, badge **beta**):

- Gommo album (images/videos) from library API
- **Copy URL** for use in job form fields

## Optional: self-host gateway

`POST {gateway}/gateway/upload/image` — multipart JSON wrapper. See [Upload reference](../reference/upload.md).

## Full API

→ [Upload reference](../reference/upload.md) · [Gommo public API](../reference/gommo-public-api.md)

## Next

→ [Media jobs](./media-jobs.md) · [Features overview](./)
