---
title: Billing & credits
description: Tổng quan nạp Gommo VietQR và fulfillment credit
---

# Billing & credits

**Nạp credit** end-user qua Gommo (`create_payment` + VietQR) — tách khỏi API generation `/gateway`.

Luồng mặc định proxy Gommo subscriptions. Credit được cộng bởi **Gommo upstream** sau chuyển khoản; client poll `payment_sync`.

## Tổng quan

```
User app ──► POST /billing/payment/create (Bearer user)
                └── VietQR Gommo + mã đơn (SP…)
                        └── poll payment_sync ──► paid: true → Gommo cộng credit
```

PayOS legacy + `sendBalances` (`POST /billing/topup/create`) vẫn giữ khi cấu hình `PAYOS_*`.

## Điều kiện

| Yêu cầu | Env / ghi chú |
|---------|---------------|
| Domain Gommo | `GOMMO_API_DOMAIN` (mặc định `79ai.net`) |
| Session user | Bearer từ `/ai/login` |
| Device fields | `device_id`, `device_name`, `device_info` (portal tự gửi) |
| PayOS legacy (tùy chọn) | `PAYOS_*` + `GOMMO_ACCESS_TOKEN` cho `/billing/topup/create` |

```http
GET /billing/status
```

Trả `billingMode: "gommo"`, `gommoPayment: true`.

## Gói nạp

```http
GET /billing/packages
```

## Tạo thanh toán (Gommo)

```http
POST /billing/payment/create
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "username": "gommo_username_từ_/ai/me",
  "packageId": "basic-member",
  "invoiceBuyer": {
    "type": "consumer",
    "name": "Bán cho người tiêu dùng",
    "email": ""
  },
  "promoCode": "TÙY_CHỌN",
  "referralCode": "TÙY_CHỌN"
}
```

Response gồm QR VietQR, thông tin ngân hàng, VAT và `orderCode`. Gateway lưu đơn local (`TOPUP_ORDERS_FILE`).

## Poll trạng thái

```http
POST /billing/payment/sync
Authorization: Bearer {user_access_token}
Content-Type: application/json

{ "orderCode": "SP..." }
```

Poll ~3.5s cho đến `data.paid === true`.

## Lịch sử nạp

```http
GET /billing/topup/orders?username={}&limit=20
Authorization: Bearer {user_access_token}
```

## So với `/gateway`

| Path | Mục đích |
|------|----------|
| `/gateway/*` | Tiêu credit |
| `/billing/*` | Cộng credit (Gommo hoặc PayOS legacy) |

## Reference đầy đủ

→ [Billing API reference](../reference/billing.md)  
→ [Cookbook: Gommo VietQR](../cookbook/gommo-topup.md)

## Tiếp theo

→ [FAQ](../faq.md) · [Authentication](../authentication.md)
