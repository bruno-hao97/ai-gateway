---
title: Cookbook
description: Công thức theo từng task — copy, chạy, ship
---

# Cookbook

Các công thức từng bước cho **[Gommo public API](../reference/gommo-public-api.md)** (`v2.api.gommo.net` + `api.gommo.net`).

::: tip Gateway tùy chọn (dev)
Recipe có thể dùng **AI Gateway** (`/gateway/*`, JSON) khi dev local. Production nên gọi thẳng Gommo — [Gommo public API](../reference/gommo-public-api.md).
:::

::: tip Thử trên trình duyệt trước
[Playground](/vi/app/playground/) — tab **Request** hiện URL public; **Try/Send** có thể proxy qua gateway local.
:::

## Chuẩn bị (mọi recipe)

| Mục | Giá trị |
|-----|---------|
| Public API | `https://v2.api.gommo.net` (jobs) · `https://api.gommo.net` (auth/chat) |
| Token | Gommo user `access_token` — [Authentication](../authentication.md) |
| Catalog | Không đoán `ratio` / `mode` / `resolution` / `duration` — [Models](../models/) |

```powershell
$env:TOKEN = "<access_token>"
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/x-www-form-urlencoded' }
```

## Recipes

### Bắt đầu

| Recipe | Mục tiêu |
|--------|----------|
| [Image job đầu tiên (wait)](./image-job-wait.md) | Login → models → image, server poll |
| [Job async + poll loop](./job-poll-async.md) | `wait: false` → poll thủ công / loop |

### Media

| Recipe | Mục tiêu |
|--------|----------|
| [Video hoặc music job](./video-music-job.md) | Cùng pattern, khác `type` |
| [Tool jobs (upscale, remove-bg)](./tool-jobs.md) | Upload → upscale / xóa nền |
| [Upload ảnh](./upload-image.md) | Multipart upload → URL công khai |

### Platform

| Recipe | Mục tiêu |
|--------|----------|
| [Chat + stream](./chat-stream.md) | Agent chat và SSE |
| [Audio TTS](./audio-tts.md) | Tìm voice → tổng hợp giọng |
| [Gommo VietQR nạp credit](./gommo-topup.md) | Gói credit → VietQR → poll sync |
| [PayOS nạp credit (legacy)](./payos-topup.md) | Merchant PayOS + sendBalances |
| [Agent HTTP flow](./agent-http-flow.md) | Vòng lặp tối thiểu cho agent / script |

## Tiếp theo

- [Quickstart](../quickstart.md) — một lộ trình tuyến tính
- [API Reference](../reference/media.md) — spec endpoint đầy đủ
- [OpenAPI](../reference/openapi.md)
