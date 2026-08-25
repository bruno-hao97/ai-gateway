---
title: Features
description: Gateway capabilities — media jobs, chat, upload, and audio
---

# Features

AI Gateway exposes Gommo capabilities through **REST** (`/gateway/*`) and **transparent proxy** (Mode C). This section explains *what each feature does* and *how to use it* — full request/response details live in [API Reference](../reference/media.md).

## Feature map

| Feature | Gateway REST | Typical upstream | Async? |
|---------|--------------|------------------|--------|
| [Media jobs](./media-jobs.md) | `/gateway/jobs/*`, `/gateway/models` | `v2.api.gommo.net` | Yes — poll or `wait: true` |
| [Chat](./chat.md) | `/gateway/chat` | `api.gommo.net/api/v2/chat` | Stream optional (SSE) |
| [Upload](./upload.md) | `/gateway/upload/*` | `v2.api.gommo.net` | No — immediate URL |
| [Audio / TTS](./audio.md) | `/gateway/audio/*` | `api.gommo.net/ai/audio` | TTS returns file URL |

All features require a **user access token** (`Authorization: Bearer`). See [Authentication](../authentication.md).

## Mode B vs Mode C

| | Mode B REST | Mode C Proxy |
|---|-------------|--------------|
| Body format | JSON (gateway translates) | Form / multipart (Gommo native) |
| Domain | Optional — server env | Required in form |
| Errors | `{ success, message, code }` | Gommo envelope |
| Best for | New integrations | Legacy clients |

See [Choosing a mode](../routing/choosing-a-mode.md).

## Shared rules

1. **List models first** for media jobs — never guess `ratio`, `mode`, `resolution`, `duration`.
2. **No webhooks** — Gommo does not push job completion; use `wait: true` or client poll.
3. **Merchant token stays on server** — billing and `/admin` only.

## Environment defaults

Some features use gateway env defaults so clients send less config:

| Env | Used by |
|-----|---------|
| `GOMMO_API_DOMAIN` | All upstream calls (injected in Mode B) |
| `GOMMO_CHAT_SERVER`, `GOMMO_CHAT_MODEL`, `GOMMO_CHAT_AGENT_ID` | Chat defaults |

## In this section

- [Media jobs](./media-jobs.md) — image, video, music, upscale, …
- [Chat](./chat.md) — agent chat and SSE streaming
- [Upload](./upload.md) — image and video assets for jobs
- [Audio & TTS](./audio.md) — voice search and text-to-speech

## API reference

→ [Media & jobs](../reference/media.md) · [Chat](../reference/chat.md) · [Upload](../reference/upload.md) · [Audio](../reference/audio.md)

## Next

→ [Models & routing](../routing/) · [Quickstart](../quickstart.md)
