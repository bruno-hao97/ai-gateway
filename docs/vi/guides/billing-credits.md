---
title: Billing & credits
description: Tổng quan nạp PayOS và fulfillment credit
---

# Billing & credits

**Nạp credit** end-user qua PayOS — tách khỏi API generation `/gateway`.

OpenRouter dùng Stripe và shared project; AI Gateway dùng **PayOS** + gửi credit Gommo nội bộ.

## Tổng quan

```
User app ──► POST /billing/topup/create (Bearer user)
                └── PayOS checkout URL / QR
                        └── webhook PAID ──► gateway fulfill credit user Gommo
```

Merchant `GOMMO_ACCESS_TOKEN` ở server — chỉ dùng khi fulfill (cùng nhóm `/admin`).

## Điều kiện

| Yêu cầu | Env / ghi chú |
|---------|---------------|
| Tài khoản PayOS | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` |
| Webhook public | `PAYOS_WEBHOOK_URL` → `https://api…/billing/webhook/payos` |
| Merchant Gommo token | `GOMMO_ACCESS_TOKEN` |
| Buffer merchant | Sau send, merchant balance > 500k credits (quy tắc Gommo) |

Kiểm tra cấu hình:

```http
GET /billing/status
```

Trả `payosConfigured`, `merchantReady`.

## Gói nạp

```http
GET /billing/packages
```

Trả các gói credit (VND, credits, bonus tùy chọn). Định nghĩa server `creditPackages` — không hard-code client.

## Tạo đơn topup

```http
POST /billing/topup/create
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "username": "gommo_username_từ_/ai/me",
  "packageId": "basic-member"
}
```

Response có URL checkout PayOS / QR và `orderCode`.

Poll đơn (tùy chọn):

```http
GET /billing/topup/orders/{orderCode}
```

Status: `pending`, `paid`, `credited`, `failed`.

## Luồng webhook

1. PayOS POST `/billing/webhook/payos` kèm chữ ký.
2. Gateway verify checksum.
3. `PAID` → lookup order → `sendCreditsToUser()` (nội bộ, client không gửi `x-admin-key`).
4. Order đánh dấu `credited`.

## So với `/gateway`

| Path | Mục đích |
|------|----------|
| `/gateway/*` | Tiêu credit (models, jobs, chat, …) |
| `/billing/*` | Cộng credit (PayOS) |

Không gắn logic PayOS dưới `/gateway`.

## Reference đầy đủ

→ [Billing (PayOS) API reference](../reference/billing.md)

## Tiếp theo

→ [FAQ](../faq.md) · [Authentication](../authentication.md)
