---
title: Features
description: Tính năng gateway — media jobs, chat, upload, audio
---

# Features

AI Gateway expose capability Gommo qua **REST** (`/gateway/*`) và **proxy** (Mode C). Section này giải thích *từng tính năng* — chi tiết API đầy đủ ở [API Reference](../reference/media.md).

## Bảng tính năng

| Tính năng | Gateway REST | Upstream | Async? |
|-----------|--------------|----------|--------|
| [Media jobs](./media-jobs.md) | `/gateway/jobs/*`, `/gateway/models` | `v2.api.gommo.net` | Có — poll hoặc `wait: true` |
| [Chat](./chat.md) | `/gateway/chat` | `api.gommo.net/api/v2/chat` | Stream tùy chọn (SSE) |
| [Upload](./upload.md) | `/gateway/upload/*` | `v2.api.gommo.net` | Không — trả URL ngay |
| [Audio / TTS](./audio.md) | `/gateway/audio/*` | `api.gommo.net/ai/audio` | TTS trả file URL |

Cần **user access token** (`Authorization: Bearer`). Xem [Authentication](../authentication.md).

## Mode B vs Mode C

| | Mode B REST | Mode C Proxy |
|---|-------------|--------------|
| Body | JSON (gateway dịch) | Form / multipart Gommo |
| Domain | Tùy chọn — env server | Bắt buộc form |
| Lỗi | `{ success, message, code }` | Envelope Gommo |
| Phù hợp | Tích hợp mới | Client legacy |

→ [Choosing a mode](../routing/choosing-a-mode.md)

## Quy tắc chung

1. **List models trước** — không đoán `ratio`, `mode`, …
2. **Không webhook** — dùng `wait: true` hoặc poll client.
3. **Merchant token chỉ server** — billing và `/admin`.

## Env mặc định

| Env | Dùng cho |
|-----|----------|
| `GOMMO_API_DOMAIN` | Mọi upstream (Mode B inject) |
| `GOMMO_CHAT_SERVER`, `GOMMO_CHAT_MODEL`, `GOMMO_CHAT_AGENT_ID` | Chat |

## Trong section này

- [Media jobs](./media-jobs.md)
- [Chat](./chat.md)
- [Upload](./upload.md)
- [Audio & TTS](./audio.md)

## API reference

→ [Media](../reference/media.md) · [Chat](../reference/chat.md) · [Upload](../reference/upload.md) · [Audio](../reference/audio.md)

## Tiếp theo

→ [Models & routing](../routing/) · [Quickstart](../quickstart.md)
