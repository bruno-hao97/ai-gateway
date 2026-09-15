---
title: Media jobs
description: Async image, video, and music generation on Gommo V2
---

# Media jobs

Generate **images**, **videos**, **music**, and other media through **Gommo V2** (`https://v2.api.gommo.net`). Jobs are **asynchronous** — create, then poll until complete.

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
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

## Typical flow

```
1. POST v2…/ai/models?type=image     → pick model id + ratio/mode/…
2. POST v2…/ai/jobs/image/{model_id} → create job
3. POST v2…/ai/jobs/{id}?media=image → poll until complete
4. Use result URL from completed job
```

## Create job

```http
POST https://v2.api.gommo.net/ai/jobs/image/{model_id}
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default&prompt=A product on white background&ratio=16:9&mode=low&resolution=2k
```

::: warning
`ratio`, `mode`, `resolution`, and `duration` must come from **your** models list for **that** model — not from docs or other models.
:::

## Polling

Poll every **3500 ms**, max **80** attempts:

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default
```

**Poll `media`:** `image` | `video` | `music` (match job type).

## Upload + job pipeline

Many video/image workflows need an asset URL first:

1. [Upload image or video](./upload.md) → get file URL
2. Pass URL in job form (field name from model catalog)
3. Create and poll job

## Job status (auth host)

Optional detail endpoints on **`api.gommo.net`**:

```
POST https://api.gommo.net/ai/info/image/{id_base}
POST https://api.gommo.net/ai/info/video/{id}
```

## Optional: self-host gateway

JSON REST with `wait: true` at `{gateway}/gateway/jobs/*` — see [Integration modes](../routing/integration-modes.md). Proxy pass-through: `POST {gateway}/v2/ai/jobs/…` with form `domain`.

## Full API

→ [Media & jobs reference](../reference/media.md) · [Models overview](../models/) · [Gommo public API](../reference/gommo-public-api.md)

## Next

→ [Upload](./upload.md) · [Chat](./chat.md) · [Features overview](./)
