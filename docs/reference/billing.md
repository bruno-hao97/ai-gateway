---
title: Billing (PayOS)
description: PayOS topup endpoints and webhook flow
---

# Billing (PayOS)

Separate from `/gateway` — credit topup via PayOS; webhook `PAID` → internal Gommo credit send.

## Env

| Variable | Purpose |
|----------|---------|
| `PAYOS_CLIENT_ID` | PayOS |
| `PAYOS_API_KEY` | PayOS |
| `PAYOS_CHECKSUM_KEY` | PayOS + webhook verify |
| `PAYOS_WEBHOOK_URL` | Register on my.payos.vn → `https://api…/billing/webhook/payos` |
| `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` | After payment redirect |
| `TOPUP_ORDERS_FILE` | JSON order map (default `data/topup-orders.json`) |

Merchant: `GOMMO_ACCESS_TOKEN` (same as `/admin`).

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

Response: PayOS checkout URL + `orderCode`. Order stores `username` + credits for webhook mapping.

## Webhook flow

1. PayOS POST `/billing/webhook/payos` — verify signature
2. `status=PAID` → lookup order by `orderCode`
3. Internal `sendCreditsToUser()` (no client `x-admin-key`)
4. Order marked `credited`

## Credit packages

See `GET /billing/packages` or `src/services/creditPackages.ts`.
