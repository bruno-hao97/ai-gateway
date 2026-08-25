---
title: Upload
description: Upload images and videos for use in media jobs
---

# Upload

Upload assets to Gommo storage before passing URLs into media jobs (e.g. image-to-video, edit workflows).

## Endpoints

| Asset | Gateway REST | Proxy |
|-------|--------------|-------|
| Image | `POST /gateway/upload/image` | `POST /v2/ai/upload/image` |
| Video | `POST /gateway/upload/video` | `POST /v2/ai/upload/video` |

Auth: `Authorization: Bearer {token}`.

Mode B: **`domain` optional** — gateway uses env. You may pass multipart `domain` to override.

## Multipart fields

| Type | Field name | Notes |
|------|------------|-------|
| Image | `file` | Optional `fileName` |
| Video | `video_file` or `file` | Large files supported up to **50 MB** gateway limit |

## Upload image (REST)

```bash
curl -X POST "http://localhost:3001/gateway/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.png"
```

Response includes a URL to use in subsequent job `fields` (exact field name depends on the target model).

## Upload video (REST)

```bash
curl -X POST "http://localhost:3001/gateway/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video_file=@clip.mp4"
```

## Typical workflow

```
Upload asset  →  URL in response
       ↓
List models (video/image type)
       ↓
POST /gateway/jobs/video  with URL + prompt + ratio from catalog
       ↓
wait: true  or  poll job
```

## Mode C / Direct

Proxy and direct calls use Gommo form fields:

```
access_token, domain, project_id=default, file or video_file
```

Direct upstream: `https://v2.api.gommo.net/ai/upload/image`.

## Errors

REST upload failures return structured errors:

```json
{ "success": false, "message": "…", "code": "UPSTREAM_ERROR" }
```

Check file size (50 MB proxy limit) and token validity.

## Full API

→ [Upload reference](../reference/upload.md) · [Media jobs](./media-jobs.md)

## Next

→ [Media jobs](./media-jobs.md) · [Features overview](./)
