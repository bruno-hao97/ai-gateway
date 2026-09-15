---
title: Nguyên tắc
description: Nguyên tắc cốt lõi khi tích hợp Gommo public API
---

# Nguyên tắc

Nguyên tắc cốt lõi khi xây dựng trên [Gommo](https://gommo.net) — đọc trước [Quickstart](./quickstart.md) hoặc [Models](./models/).

## Luồng request

```
App của bạn
  │
  ├─ v2.api.gommo.net  ──► models · create/poll jobs · upload image/video
  │
  └─ api.gommo.net     ──► login · /ai/me · chat · audio · job info
```

Tùy chọn: self-host [AI Gateway](./routing/integration-modes.md) (Mode B/C) cho JSON REST, billing portal, BYOK — không bắt buộc khi tích hợp Gommo trực tiếp.

## Hai upstream host

| Host | Dùng cho |
|------|----------|
| **`https://v2.api.gommo.net`** | Models, create/poll media jobs, upload |
| **`https://api.gommo.net`** | Login, profile/credits, chat, platform audio |

Auth: **`Authorization: Bearer <access_token>`** qua HTTPS. Form platform và V2 gồm **`domain`** (cùng domain đăng ký tài khoản).

## Nguyên tắc thiết kế

### 1. Gọi URL public Gommo

Integrator nhắm thẳng upstream host. Bản đồ đầy đủ → [Gommo public API](./reference/gommo-public-api.md).

| Thao tác | URL |
|----------|-----|
| List models | `POST https://v2.api.gommo.net/ai/models?type={type}` |
| Create job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` |
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

### 2. Không đoán tham số model

`ratio`, `mode`, `resolution`, và `duration` **bắt buộc** lấy từ catalog model:

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

Đoán giá trị gây upstream từ chối hoặc chất lượng kém. Xem [Models](./models/).

### 3. Job async, poll rõ ràng

Job media Gommo không push webhook về app mặc định. Client phải poll:

- **3500 ms** interval
- **80** lần tối đa (~5 phút)
- `POST …/ai/jobs/{id}?media=…` đến trạng thái terminal

Gateway self-host có thể poll phía server (`wait: true`) — xem [Integration modes](./routing/integration-modes.md).

### 4. Domain trong mọi form body

Gửi `domain` khớp domain đăng ký (vd. `79ai.net`, `vmedia`). Domain sai → lỗi auth hoặc thanh toán.

Docs portal multi-tenant có thể khóa domain theo dealer — xem [Tenants](./routing/upstream-hosts.md).

### 5. User vs merchant credential

| Credential | Vị trí | Dùng cho |
|------------|--------|----------|
| User `access_token` | Client Bearer / form | Mọi user API call |
| `GOMMO_ACCESS_TOKEN` | Server env only | Merchant ops, catalog translate warm |
| `ADMIN_API_KEY` | Server env only | Self-hosted `/admin/*` |

Không expose merchant hoặc admin secret ra browser/mobile.

### 6. Billing trên platform auth host

Nạp credit dùng Gommo `create_payment` + `payment_sync` trên **`api.gommo.net`**. Site docs có thể wrap billing dưới `/billing/*` khi self-host — xem [Billing & credits](./guides/billing-credits.md).

### 7. Lỗi upstream

Gommo trả JSON với `message`, `success`, `error`. Kiểm tra HTTP status và body — không retry credential không đổi khi auth fail.

## Ưu tiên

- **Tốc độ integrator** — [Quickstart](./quickstart.md) vài phút, [Playground](/vi/app/playground/) với URL public
- **Trung thành catalog** — không bịa enum; list models trước
- **Host rõ ràng** — v2 cho media, api cho auth/chat/audio

## Tiếp theo

→ [Models](./models/) · [Quickstart](./quickstart.md) · [MCP & agents](./mcp/)
