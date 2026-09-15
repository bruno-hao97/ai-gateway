---
title: Features
description: Gommo capabilities — media jobs, chat, upload, and audio
---

# Features

Gommo exposes generation capabilities on two public hosts. This section explains *what each feature does* — full request/response details in [API Reference](../reference/media.md) and [Gommo public API](../reference/gommo-public-api.md).

## Feature map

| Feature | Public API | Host | Async? |
|---------|------------|------|--------|
| [Media jobs](./media-jobs.md) | `POST v2…/ai/models`, `…/ai/jobs/*` | `v2.api.gommo.net` | Yes — client poll |
| [Chat](./chat.md) | `POST …/api/v2/chat` | `api.gommo.net` | Stream optional (SSE) |
| [Upload](./upload.md) | `POST …/ai/upload/image\|video` | `v2.api.gommo.net` | No — immediate URL |
| [Audio / TTS](./audio.md) | `POST …/ai/audio` | `api.gommo.net` | TTS returns file URL |

All features require a **user access token** (`Authorization: Bearer`). See [Authentication](../authentication.md).

## Shared rules

1. **List models first** for media jobs — never guess `ratio`, `mode`, `resolution`, `duration`.
2. **No webhooks** — poll media jobs every **3.5s**, max **80** attempts.
3. **Send `domain`** in form bodies — same as account registration domain.
4. **Merchant token stays on server** — never in browser.

## Optional: self-host gateway

This repo can wrap the same upstream calls as JSON REST at `{gateway}/gateway/*` — see [Integration modes](../routing/integration-modes.md). Use for portal billing, BYOK, or local dev only.

## In this section

- [Media jobs](./media-jobs.md) — image, video, music, upscale, …
- [Chat](./chat.md) — agent chat and SSE streaming
- [Upload](./upload.md) — image and video assets for jobs
- [Audio & TTS](./audio.md) — voice search and text-to-speech

## API reference

→ [Media & jobs](../reference/media.md) · [Chat](../reference/chat.md) · [Upload](../reference/upload.md) · [Audio](../reference/audio.md)

## Next

→ [Models](../models/) · [Quickstart](../quickstart.md)
