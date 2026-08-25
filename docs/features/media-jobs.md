---
title: Media jobs
description: Async image, video, and music generation with optional server-side polling
---

# Media jobs

Generate **images**, **videos**, **music**, and other media through Gommo V2 jobs. Jobs are **asynchronous** — create, then poll until complete.

## Supported job types

| `type` | Examples |
|--------|----------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `music` | Music generation |
| `tts` | TTS as a job type |
| `avatar-lipsync` | Talking avatar |
| `image-upscale`, `remove-bg` | Image tools |
| `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut` | Video tools |

List available models for each type:

```http
GET /gateway/models?type=image
Authorization: Bearer {token}
```

## Typical flow

```
1. GET  /gateway/models?type=image     → pick modelSlug + ratio/mode/…
2. POST /gateway/jobs/image            → create job (optional wait: true)
3. GET  /gateway/jobs/:id?media=image  → poll if wait: false
4. Use resultUrl from completed job
```

## Create job (Mode B)

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "flux-dev",
  "wait": true,
  "fields": {
    "prompt": "A product on white background",
    "ratio": "16:9",
    "mode": "low",
    "resolution": "2k"
  }
}
```

::: warning
`ratio`, `mode`, `resolution`, and `duration` must come from **your** models list for **that** slug — not from docs or other models.
:::

## Server-side polling (`wait: true`)

When `wait: true`, the gateway polls upstream for you:

| Setting | Value |
|---------|-------|
| Interval | 3500 ms |
| Max attempts | 80 (~4.7 min) |
| Success | Returns `resultUrl` in response |
| Timeout | Structured error with job id if available |

When `wait: false`, the response includes a job id — your client must poll:

```http
GET /gateway/jobs/{jobId}?media=image
Authorization: Bearer {token}
```

**Poll media** depends on job type: `image` | `video` | `music`.

## Upload + job pipeline

Many video/image workflows need an asset URL first:

1. [Upload image or video](./upload.md) → get file URL
2. Pass URL in job `fields` (field name from model catalog)
3. Create and poll job

## Mode C (proxy)

Same flow with Gommo-native paths:

```
POST /v2/ai/models?type=image
POST /v2/ai/jobs/image/{modelSlug}
POST /v2/ai/jobs/{id}?media=image
```

Form body must include `domain` and `project_id=default`.

## Response envelope

Mode B wraps upstream:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "SUCCESS",
    "resultUrl": "https://..."
  }
}
```

Mode C returns Gommo native shape (`raw.imageInfo`, etc.).

## Full API

→ [Media & jobs reference](../reference/media.md) · [Models overview](../models.md) · [Endpoint map](../routing/endpoint-map.md)

## Next

→ [Upload](./upload.md) · [Chat](./chat.md) · [Features overview](./)
