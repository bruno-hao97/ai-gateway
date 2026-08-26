---
title: Job types
description: Giá trị type= cho GET /gateway/models và POST /gateway/jobs
---

# Job types

Truyền `type` vào `GET /gateway/models?type=` và dùng cùng giá trị cho `POST /gateway/jobs/{type}`.

## Media & generation

| `type` | Dùng cho |
|--------|----------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech |
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

Endpoint map đầy đủ → [Media reference](../reference/media.md).

## Poll media

Khi poll job async, query `media` phụ thuộc loại job:

| `media` poll | Job types |
|--------------|-----------|
| `image` | `image`, tool trên ảnh |
| `video` | `video`, tool video |
| `music` | `music` |

Gateway REST: `GET /gateway/jobs/{id}?media=image|video|music`

## Tiếp theo

→ [Parameters](./parameters.md) · [Catalog](./) · [Hướng dẫn](./guide.md)
