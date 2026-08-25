---
title: Endpoint map
description: Cross-mode endpoint reference — Direct, REST, and Proxy
---

# Endpoint map

Side-by-side mapping for common operations. Replace `{gateway}` with your API base (e.g. `http://localhost:3001`).

## Media & jobs

| Operation | Mode A (Direct) | Mode B (REST) | Mode C (Proxy) |
|-----------|-----------------|---------------|----------------|
| List models | `POST https://v2.api.gommo.net/ai/models?type={type}` | `GET {gateway}/gateway/models?type={type}` | `POST {gateway}/v2/ai/models?type={type}` |
| Create job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{slug}` | `POST {gateway}/gateway/jobs/{type}` | `POST {gateway}/v2/ai/jobs/{type}/{slug}` |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `GET {gateway}/gateway/jobs/{id}?media={media}` | `POST {gateway}/v2/ai/jobs/{id}?media={media}` |

**Job types:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

Mode B create body (JSON):

```json
{
  "modelSlug": "flux-dev",
  "wait": false,
  "fields": { "prompt": "…", "ratio": "16:9" }
}
```

Mode A/C create body (form): `domain`, `project_id`, `prompt`, `ratio`, …

## Upload

| Operation | Mode A | Mode B | Mode C |
|-----------|--------|--------|--------|
| Upload image | `POST v2…/ai/upload/image` | `POST {gateway}/gateway/upload/image` | `POST {gateway}/v2/ai/upload/image` |
| Upload video | `POST v2…/ai/upload/video` | `POST {gateway}/gateway/upload/video` | `POST {gateway}/v2/ai/upload/video` |

## Chat

| Operation | Mode A | Mode B | Mode C |
|-----------|--------|--------|--------|
| Chat (JSON) | `POST api…/api/v2/chat` | `POST {gateway}/gateway/chat` | `POST {gateway}/api/v2/chat` |
| Chat (stream) | Same + SSE | Same — gateway pipes stream | Same — proxy pipes stream |

Stream triggers when URL contains `/chat` or `Content-Type: text/event-stream`.

## Audio

| Operation | Mode A | Mode B | Mode C |
|-----------|--------|--------|--------|
| Voices | `POST api…/ai/audio` | `POST {gateway}/gateway/audio/voices` | `POST {gateway}/ai/audio` |
| TTS | `POST api…/ai/audio` | `POST {gateway}/gateway/audio/tts` | `POST {gateway}/ai/audio` |
| Lists | `GET api…/…` | `GET {gateway}/gateway/audio/lists` | via platform paths |

## Auth (always via platform host)

| Operation | Mode A | Mode B/C |
|-----------|--------|----------|
| Login | `POST api…/api/apps/go-mmo/auth/login` | `POST {gateway}/api/apps/go-mmo/auth/login` |
| Profile | `POST api…/api/apps/go-mmo/ai/me` | `POST {gateway}/api/apps/go-mmo/ai/me` |

Login and `/ai/me` are **not** under `/gateway` — use the auth proxy path on the gateway.

## Domain field

| Mode | Who sends `domain` |
|------|-------------------|
| A Direct | Client in every form body |
| B REST | Optional — gateway uses `GOMMO_API_DOMAIN` |
| C Proxy | Client in form (required by upstream) |

## Polling defaults (Mode B `wait: true`)

| Setting | Value |
|---------|-------|
| Interval | 3500 ms |
| Max attempts | 80 (~4.7 min) |
| Webhook | None — Gommo does not push completion |

## Detailed API docs

→ [Media & jobs](../reference/media.md) · [Upload](../reference/upload.md) · [Chat](../reference/chat.md) · [Audio](../reference/audio.md)

## Next

→ [Integration modes](./integration-modes.md) · [Choosing a mode](./choosing-a-mode.md)
