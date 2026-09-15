---
title: Features
description: Khả năng Gommo — media jobs, chat, upload, audio
---

# Features

Gommo expose khả năng generation trên hai public host. Section này giải thích *từng tính năng làm gì* — chi tiết request/response đầy đủ ở [API Reference](../reference/media.md) và [Gommo public API](../reference/gommo-public-api.md).

## Bảng tính năng

| Tính năng | Public API | Host | Async? |
|-----------|------------|------|--------|
| [Media jobs](./media-jobs.md) | `POST v2…/ai/models`, `…/ai/jobs/*` | `v2.api.gommo.net` | Có — client poll |
| [Chat](./chat.md) | `POST …/api/v2/chat` | `api.gommo.net` | Stream tùy chọn (SSE) |
| [Upload](./upload.md) | `POST …/ai/upload/image\|video` | `v2.api.gommo.net` | Không — URL ngay |
| [Audio / TTS](./audio.md) | `POST …/ai/audio` | `api.gommo.net` | TTS trả file URL |

Mọi tính năng cần **user access token** (`Authorization: Bearer`). Xem [Authentication](../authentication.md).

## Quy tắc chung

1. **List models trước** cho media jobs — không đoán `ratio`, `mode`, `resolution`, `duration`.
2. **Không webhook** — poll media jobs mỗi **3.5s**, tối đa **80** lần.
3. **Gửi `domain`** trong form body — cùng domain đăng ký tài khoản.
4. **Merchant token chỉ server** — không trong browser.

## Tùy chọn: self-host gateway

Repo này có thể wrap cùng upstream call thành JSON REST tại `{gateway}/gateway/*` — xem [Integration modes](../routing/integration-modes.md). Dùng cho portal billing, BYOK, hoặc dev local.

## Trong section này

- [Media jobs](./media-jobs.md) — image, video, music, upscale, …
- [Chat](./chat.md) — agent chat và SSE streaming
- [Upload](./upload.md) — asset ảnh/video cho jobs
- [Audio & TTS](./audio.md) — tìm voice và text-to-speech

## API reference

→ [Media & jobs](../reference/media.md) · [Chat](../reference/chat.md) · [Upload](../reference/upload.md) · [Audio](../reference/audio.md)

## Tiếp theo

→ [Models](../models/) · [Quickstart](../quickstart.md)
