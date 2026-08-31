---
title: Billing
description: Gommo payment endpoints and legacy PayOS topup
---

# Billing

Separate from `/gateway` — credit topup via Gommo VietQR (default) or legacy PayOS + internal `sendBalances`.

## Env

| Variable | Purpose |
|----------|---------|
| `GOMMO_API_DOMAIN` | Domain sent to Gommo (`create_payment`, default `79ai.net`) |
| `TOPUP_ORDERS_FILE` | JSON order map (default `data/topup-orders.json`) |
| `PAYOS_CLIENT_ID` | Legacy PayOS only |
| `PAYOS_API_KEY` | Legacy PayOS only |
| `PAYOS_CHECKSUM_KEY` | Legacy PayOS + webhook verify |
| `PAYOS_WEBHOOK_URL` | Register on my.payos.vn → `https://api…/billing/webhook/payos` |
| `GOMMO_ACCESS_TOKEN` | Legacy fulfillment via `sendBalances` |

## Endpoints

| Method | Path | Auth | Mode |
|--------|------|------|------|
| GET | `/billing/status` | — | — |
| GET | `/billing/packages` | — | — |
| POST | `/billing/payment/create` | Bearer user | **Gommo** |
| POST | `/billing/payment/sync` | Bearer user | **Gommo** |
| GET | `/billing/topup/orders` | Bearer user | Local history |
| GET | `/billing/topup/orders/:orderCode` | — | Local lookup |
| POST | `/billing/topup/create` | Bearer user | Legacy PayOS |
| GET/POST | `/billing/webhook/payos` | PayOS signature | Legacy |

## Create Gommo payment

```bash
curl.exe -X POST "http://localhost:3001/billing/payment/create" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"gommo_user\",\"packageId\":\"basic-member\",\"invoiceBuyer\":{\"type\":\"consumer\",\"name\":\"Bán cho người tiêu dùng\",\"email\":\"\"}}"
```

Response fields (pass-through from Gommo):

| Field | Description |
|-------|-------------|
| `orderCode` / `content` | Transfer memo (`SP…`) |
| `qrImage` / `qrFallback` | VietQR image URLs |
| `holder`, `acc`, `bank`, `store` | Bank transfer details |
| `amountVnd`, `amountBaseVnd`, `vatAmountVnd` | Charge breakdown |
| `paymentServer` | e.g. `sepay` |

Optional body fields: `promoCode`, `referralCode` (also `invoiceBuyer.referral_code` for personal invoices).

## Sync payment

```bash
curl.exe -X POST "http://localhost:3001/billing/payment/sync" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderCode\":\"SP...\"}"
```

When `data.paid` is `true`, the gateway marks the local order `credited`.

## Legacy PayOS topup

`POST /billing/topup/create` creates a PayOS checkout and stores a numeric `orderCode`. Webhook `PAID` triggers internal `sendCreditsToUser()`.

## Credit packages

See `GET /billing/packages` or `src/services/creditPackages.ts`. Each package maps to a Gommo `gommoIdBase` (`credit-basic`, `credit-vip`, …).
