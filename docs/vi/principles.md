---
title: Nguyên tắc
description: Nguyên tắc thiết kế cốt lõi của AI Gateway
---

# Nguyên tắc

Nguyên tắc cốt lõi khi xây dựng trên AI Gateway — nền tảng **API** kiểu OpenRouter trên [Gommo](https://gommo.net).

## Vì sao AI Gateway?

Gommo có **hai upstream host** và nhiều kiểu auth (Bearer cho V2 jobs, form `access_token` cho platform API). AI Gateway giúp integrator:

- **Một API deploy được** — ẩn URL upstream, tập trung env và secret.
- **REST dự đoán được** — JSON in/out, lỗi có cấu trúc, poll phía server tùy chọn (`wait: true`).
- **Mặc định an toàn** — domain và merchant credential ở server.

## Nguyên tắc thiết kế

### 1. Giao diện thống nhất

Client chỉ gọi `{gateway}`:

| Dev | Production |
|-----|------------|
| `http://localhost:3001` | `https://api.yourdomain.com` |

Mapping upstream ghi trong [Models & routing](./routing/) — client Mode B/C không nên hard-code `v2.api.gommo.net` trong app.

### 2. Không đoán tham số model

`ratio`, `mode`, `resolution`, `duration` **bắt buộc** lấy từ catalog:

```http
GET /gateway/models?type=image
Authorization: Bearer {user_token}
```

Đoán giá trị sẽ bị upstream từ chối hoặc chất lượng kém. Xem [Models](./models/).

### 3. Job async, poll rõ ràng

Job media Gommo không webhook về app. Gateway:

- Tạo job upstream.
- Poll khi `wait: true` (**3500ms** interval, tối đa **80** lần).
- Trả `resultUrl` hoặc lỗi timeout.

Client `wait: false` phải tự poll `GET /gateway/jobs/:id?media=…` với cùng quy tắc.

### 4. Domain thuộc server (Mode B)

`GOMMO_API_DOMAIN` trong `.env` gateway được inject khi client bỏ qua `domain`.

Mode C (proxy) và Mode A (direct) vẫn cần `domain` trong form — dùng domain đăng ký tài khoản Gommo.

### 5. Merchant vs user credential

| Credential | Vị trí | Dùng cho |
|------------|--------|----------|
| User `access_token` | Client Bearer / form | `/gateway/*`, proxy user routes |
| `GOMMO_ACCESS_TOKEN` | Server env only | `/admin/*`, fulfillment PayOS legacy |
| `ADMIN_API_KEY` | Server env only | Bảo vệ `/admin/*` |

Không expose merchant hoặc admin secret ra browser/mobile.

### 6. Billing tách khỏi generation

Nạp credit ở **`/billing/*`**, không phải `/gateway`. **Mặc định:** Gommo `create_payment` + client `payment_sync` (chuyển khoản VietQR). **Legacy tùy chọn:** webhook PayOS → `sendBalances` nội bộ. Xem [Billing & credits](./guides/billing-credits.md).

### 7. Lỗi đáng tin cậy

REST trả:

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

Code thường gặp: `UNAUTHORIZED`, `UPSTREAM_ERROR`, `RATE_LIMITED`, `NOT_CONFIGURED`, `INSUFFICIENT_CREDITS`.

## Ưu tiên

- **Tốc độ integrator** — quickstart vài phút, playground tại `/portal/`.
- **Vận hành rõ ràng** — health check, log có cấu trúc, Docker deploy.
- **Trung thành upstream** — proxy Mode C giữ envelope Gommo khi cần drop-in.

## Tiếp theo

→ [Models](./models/) · [Quickstart](./quickstart.md) · [MCP & agents](./mcp/)
