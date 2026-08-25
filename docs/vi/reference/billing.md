---
title: Billing (PayOS)
description: Endpoint nạp credits PayOS và luồng webhook
---

# Billing (PayOS)

Tách khỏi `/gateway` — nạp credits qua PayOS; webhook `PAID` → gửi credits Gommo nội bộ.

## Env

| Biến | Mục đích |
|----------|---------|
| `PAYOS_CLIENT_ID` | PayOS |
| `PAYOS_API_KEY` | PayOS |
| `PAYOS_CHECKSUM_KEY` | PayOS + xác minh webhook |
| `PAYOS_WEBHOOK_URL` | Đăng ký trên my.payos.vn → `https://api…/billing/webhook/payos` |
| `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` | Redirect sau thanh toán |
| `TOPUP_ORDERS_FILE` | JSON map đơn hàng (mặc định `data/topup-orders.json`) |

Merchant: `GOMMO_ACCESS_TOKEN` (giống `/admin`).

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/billing/status` | — |
| GET | `/billing/packages` | — |
| POST | `/billing/topup/create` | `Authorization: Bearer` user |
| GET | `/billing/topup/orders/:orderCode` | — |
| GET/POST | `/billing/webhook/payos` | PayOS signature |

## Create topup order

```bash
curl.exe -X POST "http://localhost:3001/billing/topup/create" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"gommo_user\",\"packageId\":\"basic-member\"}"
```

Response: URL checkout PayOS + `orderCode`. Order lưu `username` + credits để map webhook.

## Luồng webhook

1. PayOS POST `/billing/webhook/payos` — xác minh chữ ký
2. `status=PAID` → tra order theo `orderCode`
3. `sendCreditsToUser()` nội bộ (không cần client `x-admin-key`)
4. Order đánh dấu `credited`

## Credit packages

Xem `GET /billing/packages` hoặc `src/services/creditPackages.ts`.
