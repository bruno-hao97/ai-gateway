---
title: Job types
description: type= query values for Gommo models list and job create
---

# Job types

Pass `type` to `POST https://v2.api.gommo.net/ai/models?type=` and use the same value in `POST …/ai/jobs/{type}/{model_id}`.

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

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
```

## Next

→ [Parameters](./parameters.md) · [Catalog](./) · [Integration guide](./guide.md)
