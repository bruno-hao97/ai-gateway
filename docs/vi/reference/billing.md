---
title: Billing
description: Endpoint Gommo payment và PayOS legacy
---

# Billing

Tách khỏi `/gateway` — nạp credit qua Gommo VietQR (mặc định) hoặc PayOS legacy + `sendBalances`.

## Env

| Biến | Mục đích |
|------|----------|
| `GOMMO_API_DOMAIN` | Domain gửi lên Gommo |
| `TOPUP_ORDERS_FILE` | File JSON lưu đơn local |
| `PAYOS_*` | Chỉ cho legacy `/billing/topup/create` |
| `GOMMO_ACCESS_TOKEN` | Fulfill legacy qua `sendBalances` |

## Endpoints

| Method | Path | Auth | Mode |
|--------|------|------|------|
| GET | `/billing/status` | — | — |
| GET | `/billing/packages` | — | — |
| POST | `/billing/payment/create` | Bearer user | **Gommo** |
| POST | `/billing/payment/sync` | Bearer user | **Gommo** |
| GET | `/billing/topup/orders` | Bearer user | Lịch sử local |
| POST | `/billing/topup/create` | Bearer user | PayOS legacy |
| GET/POST | `/billing/webhook/payos` | PayOS signature | Legacy |

## Tạo payment Gommo

```bash
curl.exe -X POST "http://localhost:3001/billing/payment/create" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"gommo_user\",\"packageId\":\"basic-member\"}"
```

Body tùy chọn: `promoCode`, `referralCode`, `invoiceBuyer`.

## Sync payment

```bash
curl.exe -X POST "http://localhost:3001/billing/payment/sync" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderCode\":\"SP...\"}"
```

Khi `data.paid` là `true`, gateway đánh dấu đơn local `credited`.

## Gói credit

Xem `GET /billing/packages` hoặc `src/services/creditPackages.ts`.
