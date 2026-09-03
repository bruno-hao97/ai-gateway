---
title: MCP tool reference
description: Đủ 10 tool gommo_* trên 79ai remote MCP
---

# MCP tool reference

**Host:** [79ai remote MCP](./other-hosts.md) — `https://api.gommo.net/api/v2/gommo-mcp`  
**Khi connected:** 10 tools

[Self-hosted](./self-hosted.md) `@ai-gateway/mcp-server` v0.1 chỉ có tập con (chưa có `gommo_tasks_list`, `gommo_notify_send`).

## Tổng quan

| Tool | Mục đích | Tốn credit |
|------|----------|------------|
| `gommo_account_info` | Hồ sơ, partner, balances | Không |
| `gommo_credit_balance` | `credits_ai` nhanh | Không |
| `gommo_models_list` | Catalog — ratio/mode/duration | Không |
| `gommo_image_create` | Job ảnh async → `id_base` | **Có** |
| `gommo_image_status` | Trạng thái ảnh 1 lần | Không |
| `gommo_video_create` | Job video async → `id_base` | **Có** |
| `gommo_video_status` | Trạng thái video 1 lần | Không |
| `gommo_tasks_list` | Job ảnh/video gần đây | Không |
| `gommo_task_stream` | Poll đến xong / lỗi / timeout | Không |
| `gommo_notify_send` | Inbox + push + Telegram | Không |

## Quy tắc

1. `gommo_models_list` trước create  
2. Không đoán ratio/mode/resolution/duration  
3. Giữ `id_base` sau create  
4. `gommo_credit_balance` trước create ảnh/video

Prompt mẫu: [Use cases](./use-cases.md)

---

## `gommo_account_info`

Hồ sơ đầy đủ từ `/ai/me`.

---

## `gommo_credit_balance`

Số `credits_ai` hiện tại — gọi trước khi gen.

---

## `gommo_models_list`

| Param | Giá trị |
|-------|---------|
| `type` | `image` \| `video` \| `audio` |

`audio` = catalog music.

---

## `gommo_image_create`

Tạo job ảnh → `id_base`. Tham số: `model`, `prompt`, `ratio`/`resolution`/`mode` từ catalog.

---

## `gommo_image_status`

Trạng thái + URL theo `id_base`. Hoặc dùng `gommo_task_stream`.

---

## `gommo_video_create`

Tạo video — hỗ trợ frame, motion, extend, multi-shot (xem schema trong client).

---

## `gommo_video_status`

Trạng thái video theo `id_base`.

---

## `gommo_tasks_list`

| Param | Mô tả |
|-------|--------|
| `type` | `all` \| `image` \| `video` |
| `limit` | 1–100 |
| `project_id`, `after_id` | Tùy chọn |

Xem lịch sử job, fallback khi status theo id lỗi.

---

## `gommo_task_stream`

Poll lặp (mặc định 30s, tối đa 30 phút) cho đến khi xong.

| Param | Mặc định |
|-------|----------|
| `interval_seconds` | 30 |
| `max_wait_seconds` | 1800 |

---

## `gommo_notify_send`

Thông báo inbox + push + Telegram (nếu đã liên kết).

| Param | Mô tả |
|-------|--------|
| `title`, `message` | Nội dung |
| `url` | Deep link (mặc định `/chat`) |
| `send_push`, `send_telegram` | Mặc định `true` |

Agent phải **chủ động gọi** — không tự động sau create.

---

## Flow ví dụ

**Ảnh:** `credit → models_list → image_create → task_stream`

**Video + notify:** `models_list → video_create → task_stream → notify_send`

**Debug:** `tasks_list → image_status`

## HTTP

Build app? Xem [`/gateway/*`](/vi/routing/endpoint-map.md) và [OpenAPI](/openapi.yaml).

## Tiếp theo

→ [Use cases](./use-cases.md) · [Host khác](./other-hosts.md)
