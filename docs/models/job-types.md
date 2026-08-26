---
title: Job types
description: type= query values for GET /gateway/models and POST /gateway/jobs
---

# Job types

Pass `type` to `GET /gateway/models?type=` and use the same value for `POST /gateway/jobs/{type}`.

## Media & generation

| `type` | Typical use |
|--------|-------------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech jobs |
| `music` | Music generation |
| `avatar-lipsync` | Talking avatar |

## Tool jobs

| `type` | Typical use |
|--------|-------------|
| `image-upscale` | Upscale image |
| `remove-bg` | Background removal |
| `video-upscale` | Upscale video |
| `video-vfx` | Video effects |
| `video-subtitle` | Subtitles |
| `video-cut` | Cut/trim |

Full endpoint map and poll media per type → [Media & jobs reference](../reference/media.md).

## Poll media

When polling async jobs, `media` query depends on job type:

| Poll `media` | Job types |
|--------------|-----------|
| `image` | `image`, tool jobs on images |
| `video` | `video`, video tools |
| `music` | `music` |

Gateway REST: `GET /gateway/jobs/{id}?media=image|video|music`

## Next

→ [Parameters](./parameters.md) · [Catalog](./) · [Integration guide](./guide.md)
