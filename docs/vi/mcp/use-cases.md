---
title: Use cases & prompt MCP
description: Prompt mẫu và workflow cho 10 tool 79ai gommo_*
---

# Use cases & prompt MCP

Copy vào **Cursor**, **Claude Desktop** hoặc IDE có **79ai MCP**. Nói *"dùng 79ai MCP"* nếu có nhiều server.

## Đọc nhanh (không tốn credit)

| Mục tiêu | Prompt mẫu |
|----------|------------|
| Credit | *Dùng 79ai MCP: kiểm tra số dư credit.* |
| Hồ sơ | *Show account info qua 79ai MCP.* |
| Model ảnh | *List image models với ratio và mode.* |
| Model video | *List video models và duration hợp lệ.* |
| Job gần đây | *gommo_tasks_list — job ảnh/video gần nhất.* |

---

## Tạo ảnh (tốn credit)

```
Dùng 79ai MCP:
1. Kiểm tra credit
2. List image models
3. Tạo ảnh model [từ list], prompt "[mô tả]", ratio từ catalog
4. gommo_task_stream chờ URL kết quả
```

---

## Tạo video (tốn credit)

```
79ai MCP: list video models → create video với ratio/duration từ catalog → task_stream chờ xong
```

---

## Poll thủ công

> gommo_image_status id_base `[id_base]`

Hoặc:

> gommo_tasks_list type=all limit=20

---

## Thông báo khi xong

> Khi video xong, gommo_notify_send title "Xong" kèm URL output.

Gửi inbox + push/Telegram (nếu đã liên kết 79ai). Agent **không** tự gọi — bạn phải yêu cầu.

---

## Full tour

```
79ai MCP full tour:
1. Account + credit
2. List image và video models
3. Tạo 1 ảnh test nhỏ
4. task_stream chờ URL
5. tasks_list xem lịch sử
6. (Tùy chọn) notify_send "Hoàn tất"
```

---

## Quy tắc nhắc agent

- `gommo_models_list` trước create
- Không đoán ratio/mode/duration
- Poll bằng `id_base`, không `task_id`
- `gommo_credit_balance` trước create

---

## Workflow

```
credit → models_list → create → task_stream → (notify) → tasks_list
```

---

## Tiếp theo

→ [Tools](./tools.md) · [Host khác](./other-hosts.md)
