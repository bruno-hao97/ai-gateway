---
title: Job types
description: Giá trị type= cho Gommo models list và job create
---

# Job types

Truyền `type` vào `POST https://v2.api.gommo.net/ai/models?type=` và dùng cùng giá trị trong `POST …/ai/jobs/{type}/{model_id}`.

## Media & generation

| `type` | Dùng cho |
|--------|----------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech jobs |
| `music` | Tạo nhạc |
| `avatar-lipsync` | Avatar nói |

## Tool jobs

| `type` | Dùng cho |
|--------|----------|
| `image-upscale` | Upscale ảnh |
| `remove-bg` | Xóa nền |
| `video-upscale` | Upscale video |
| `video-vfx` | Hiệu ứng video |
| `video-subtitle` | Phụ đề |
| `video-cut` | Cắt video |

Endpoint map đầy đủ và poll media theo type → [Media & jobs reference](../reference/media.md).

## Poll media

Khi poll job async, query `media` phụ thuộc loại job:

| Poll `media` | Job types |
|--------------|-----------|
| `image` | `image`, tool trên ảnh |
| `video` | `video`, tool video |
| `music` | `music` |

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
```

## Tiếp theo

→ [Parameters](./parameters.md) · [Catalog](./) · [Hướng dẫn](./guide.md)
