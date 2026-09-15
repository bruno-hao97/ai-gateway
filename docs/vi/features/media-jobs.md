---
title: Media jobs
description: Image, video, music async trên Gommo V2
---

# Media jobs

Tạo **ảnh**, **video**, **nhạc** và media khác qua **Gommo V2** (`https://v2.api.gommo.net`). Job **async** — tạo rồi poll đến hoàn thành.

## Job types hỗ trợ

| `type` | Ví dụ |
|--------|-------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `music` | Tạo nhạc |
| `tts` | TTS dạng job |
| `avatar-lipsync` | Avatar nói |
| `image-upscale`, `remove-bg` | Công cụ ảnh |
| `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut` | Công cụ video |

List models cho mỗi type:

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

## Luồng điển hình

```
1. POST v2…/ai/models?type=image     → chọn model id + ratio/mode/…
2. POST v2…/ai/jobs/image/{model_id} → tạo job
3. POST v2…/ai/jobs/{id}?media=image → poll đến hoàn thành
4. Dùng result URL từ job hoàn thành
```

## Tạo job

```http
POST https://v2.api.gommo.net/ai/jobs/image/{model_id}
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default&prompt=A product on white background&ratio=16:9&mode=low&resolution=2k
```

::: warning
`ratio`, `mode`, `resolution`, và `duration` phải lấy từ **models list của bạn** cho **model đó** — không từ docs hoặc model khác.
:::

## Polling

Poll mỗi **3500 ms**, tối đa **80** lần:

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default
```

**Poll `media`:** `image` | `video` | `music` (khớp job type).

## Pipeline upload + job

Nhiều workflow video/ảnh cần URL asset trước:

1. [Upload ảnh hoặc video](./upload.md) → lấy URL file
2. Truyền URL trong job form (tên field từ catalog model)
3. Create và poll job

## Job status (auth host)

Endpoint chi tiết tùy chọn trên **`api.gommo.net`**:

```
POST https://api.gommo.net/ai/info/image/{id_base}
POST https://api.gommo.net/ai/info/video/{id}
```

## Tùy chọn: self-host gateway

JSON REST với `wait: true` tại `{gateway}/gateway/jobs/*` — xem [Integration modes](../routing/integration-modes.md). Proxy pass-through: `POST {gateway}/v2/ai/jobs/…` với form `domain`.

## API đầy đủ

→ [Media & jobs reference](../reference/media.md) · [Models overview](../models/) · [Gommo public API](../reference/gommo-public-api.md)

## Tiếp theo

→ [Upload](./upload.md) · [Chat](./chat.md) · [Features overview](./)
