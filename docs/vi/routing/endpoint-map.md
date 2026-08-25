---
title: Endpoint map
description: Bảng endpoint theo mode — Direct, REST, Proxy
---

# Endpoint map

So sánh thao tác phổ biến. `{gateway}` = base API (vd. `http://localhost:3001`).

## Media & jobs

| Thao tác | Mode A | Mode B | Mode C |
|----------|--------|--------|--------|
| List models | `POST v2…/ai/models?type=` | `GET {gateway}/gateway/models?type=` | `POST {gateway}/v2/ai/models?type=` |
| Create job | `POST v2…/ai/jobs/{type}/{slug}` | `POST {gateway}/gateway/jobs/{type}` | `POST {gateway}/v2/ai/jobs/{type}/{slug}` |
| Poll | `POST v2…/ai/jobs/{id}?media=` | `GET {gateway}/gateway/jobs/{id}?media=` | `POST {gateway}/v2/ai/jobs/{id}?media=` |

**Job types:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, …

**Poll media:** `image` | `video` | `music`

Body Mode B (JSON):

```json
{ "modelSlug": "flux-dev", "wait": false, "fields": { "prompt": "…", "ratio": "16:9" } }
```

Mode A/C: form `domain`, `project_id`, `prompt`, `ratio`, …

## Upload

| Thao tác | Mode A | Mode B | Mode C |
|----------|--------|--------|--------|
| Image | `POST v2…/ai/upload/image` | `POST {gateway}/gateway/upload/image` | `POST {gateway}/v2/ai/upload/image` |
| Video | `POST v2…/ai/upload/video` | `POST {gateway}/gateway/upload/video` | `POST {gateway}/v2/ai/upload/video` |

## Chat

| Thao tác | Mode A | Mode B | Mode C |
|----------|--------|--------|--------|
| Chat | `POST api…/api/v2/chat` | `POST {gateway}/gateway/chat` | `POST {gateway}/api/v2/chat` |
| Stream | SSE upstream | Gateway pipe | Proxy pipe |

## Audio

| Thao tác | Mode B | Mode C |
|----------|--------|--------|
| Voices | `POST {gateway}/gateway/audio/voices` | `POST {gateway}/ai/audio` |
| TTS | `POST {gateway}/gateway/audio/tts` | `POST {gateway}/ai/audio` |

## Auth

| Thao tác | Mode A | Mode B/C |
|----------|--------|----------|
| Login | `POST api…/api/apps/go-mmo/auth/login` | `POST {gateway}/api/apps/go-mmo/auth/login` |
| Profile | `POST api…/…/ai/me` | `POST {gateway}/api/apps/go-mmo/ai/me` |

Login không nằm dưới `/gateway`.

## Field `domain`

| Mode | Ai gửi `domain` |
|------|-----------------|
| A | Client mọi form |
| B | Tùy chọn — gateway dùng env |
| C | Client (bắt buộc) |

## Poll mặc định (`wait: true`)

| | |
|--|--|
| Interval | 3500 ms |
| Max | 80 (~4.7 phút) |
| Webhook | Không |

## API chi tiết

→ [Media](../reference/media.md) · [Upload](../reference/upload.md) · [Chat](../reference/chat.md)

## Tiếp theo

→ [Integration modes](./integration-modes.md) · [Choosing a mode](./choosing-a-mode.md)
