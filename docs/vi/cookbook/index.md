---
title: Cookbook
description: Công thức theo từng task — copy, chạy, ship
---

# Cookbook

Các công thức từng bước cho **Mode B** (`/gateway/*`). Mỗi trang là một task hoàn chỉnh với curl + PowerShell.

::: tip Thử trên trình duyệt trước
[Playground](/vi/app/playground/) — nhúng trên docs; cần đăng nhập để chạy job.
:::

## Chuẩn bị (mọi recipe)

| Mục | Giá trị |
|-----|---------|
| Gateway | `npm run dev` → `http://localhost:3001` |
| Token | Gommo user `access_token` — [Authentication](../authentication.md) |
| Catalog | Không đoán `ratio` / `mode` / `resolution` / `duration` — [Models](../models/) |

```powershell
$env:TOKEN = "<access_token>"
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
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
