---
title: MCP tool reference
description: Các tool gommo_* map sang endpoint AI Gateway
---

# MCP tool reference

Package: **`@ai-gateway/mcp-server`**

## Quy tắc

1. Gọi **`gommo_models_list`** trước khi create
2. **Không đoán** `ratio`, `mode`, `resolution`, `duration`
3. Giữ **`id_base`** sau create — poll bằng status hoặc `gommo_task_stream`

## Tools

| Tool | Gateway |
|------|---------|
| `gommo_models_list` | `GET /gateway/models` |
| `gommo_credit_balance` | `/ai/me` |
| `gommo_account_info` | `/ai/me` |
| `gommo_image_create` | `POST /gateway/jobs/image` |
| `gommo_image_status` | `GET /gateway/jobs/{id}?media=image` |
| `gommo_video_create` | `POST /gateway/jobs/video` |
| `gommo_video_status` | `GET /gateway/jobs/{id}?media=video` |
| `gommo_task_stream` | Poll lặp (mặc định 30s, tối đa 30 phút) |

Chi tiết tham số: xem [bản EN](../../mcp/tools.md).

## Flow ví dụ

```
1. gommo_credit_balance
2. gommo_models_list { type: "image" }
3. gommo_image_create { model, prompt, ratio }
4. gommo_task_stream { type: "image", id_base }
```

## Tiếp theo

→ [Cấu hình Cursor](./setup-cursor.md) · [Media jobs](../features/media-jobs.md)
