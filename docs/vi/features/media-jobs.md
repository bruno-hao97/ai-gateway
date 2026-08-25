---
title: Media jobs
description: Image, video, music async — poll hoặc wait true
---

# Media jobs

Tạo **ảnh**, **video**, **nhạc** và media khác qua Gommo V2 jobs. Job **async** — tạo rồi poll tới xong.

## Job types

| `type` | Ví dụ |
|--------|-------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `music` | Tạo nhạc |
| `tts` | TTS dạng job |
| `avatar-lipsync` | Avatar nói |
| `image-upscale`, `remove-bg` | Công cụ ảnh |
| `video-upscale`, `video-vfx`, … | Công cụ video |

List models:

```http
GET /gateway/models?type=image
Authorization: Bearer {token}
```

## Luồng điển hình

```
1. GET  /gateway/models?type=image     → chọn modelSlug + ratio/…
2. POST /gateway/jobs/image            → tạo job (wait: true tùy chọn)
3. GET  /gateway/jobs/:id?media=image  → poll nếu wait: false
4. Dùng resultUrl
```

## Tạo job (Mode B)

```json
{
  "modelSlug": "flux-dev",
  "wait": true,
  "fields": {
    "prompt": "Sản phẩm nền trắng",
    "ratio": "16:9"
  }
}
```

::: warning
`ratio`, `mode`, `resolution`, `duration` phải lấy từ **models list** của slug đó.
:::

## Poll phía server (`wait: true`)

| | |
|--|--|
| Interval | 3500 ms |
| Max | 80 (~4.7 phút) |
| Thành công | Trả `resultUrl` |
| Timeout | Lỗi có cấu trúc + job id nếu có |

`wait: false` → client poll `GET /gateway/jobs/{id}?media=image|video|music`.

## Upload + job

1. [Upload](./upload.md) → URL file
2. Truyền URL vào `fields` job
3. Create + poll

## Mode C

```
POST /v2/ai/models?type=image
POST /v2/ai/jobs/image/{slug}
POST /v2/ai/jobs/{id}?media=image
```

Form cần `domain`, `project_id=default`.

## API đầy đủ

→ [Media reference](../reference/media.md) · [Models](../models.md)

## Tiếp theo

→ [Upload](./upload.md) · [Chat](./chat.md)
