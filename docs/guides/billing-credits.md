---
title: Billing & credits
description: Gommo VietQR topup and credit fulfillment overview
---

# Billing & credits

End-user **credit topup** via Gommo (`create_payment` + VietQR) — separate from `/gateway` generation APIs.

The default path proxies Gommo subscriptions APIs. Credits are fulfilled by **Gommo upstream** after bank transfer; the gateway polls `payment_sync` from the client.

## Overview

```
User app ──► POST /billing/payment/create (Bearer user)
                └── Gommo VietQR + order code (SP…)
                        └── poll payment_sync ──► paid: true → Gommo credits user
```

Legacy PayOS + `sendBalances` (`POST /billing/topup/create`) remains for merchant-controlled fulfillment when `PAYOS_*` is configured.

## Prerequisites

| Requirement | Env / note |
|-------------|------------|
| Gommo domain | `GOMMO_API_DOMAIN` (default `79ai.net`) |
| User session | Bearer from `/ai/login` — same as generation APIs |
| Device fields | `device_id`, `device_name`, `device_info` (portal sends automatically) |
| Legacy PayOS (optional) | `PAYOS_*` + `GOMMO_ACCESS_TOKEN` for `/billing/topup/create` |

Check config:

```http
GET /billing/status
```

Returns `billingMode: "gommo"`, `gommoPayment: true`, and optional `payosConfigured`.

## Packages

```http
GET /billing/packages
```

Returns credit packages (`id`, `amountVnd`, `credits`, `gommoIdBase`). Defined in server `creditPackages.ts`.

## Create payment (Gommo)

```http
POST /billing/payment/create
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "username": "gommo_username_from_/ai/me",
  "packageId": "basic-member",
  "invoiceBuyer": {
    "type": "consumer",
    "name": "Bán cho người tiêu dùng",
    "email": ""
  },
  "promoCode": "OPTIONAL",
  "referralCode": "OPTIONAL"
}
```

Response includes VietQR image URL, bank transfer fields (`holder`, `acc`, `bank`, `content`), VAT breakdown, and `orderCode`.

The gateway stores the order locally (`TOPUP_ORDERS_FILE`) for history.

## Poll payment status

```http
POST /billing/payment/sync
Authorization: Bearer {user_access_token}
Content-Type: application/json

{ "orderCode": "SP..." }
```

Poll every ~3.5s until `data.paid === true`. Gommo credits the user automatically.

## Order history

```http
GET /billing/topup/orders?username={}&limit=20
Authorization: Bearer {user_access_token}
```

Returns local orders for Gommo and legacy PayOS flows. Statuses: `pending`, `paid`, `credited`, `failed`.

## vs `/gateway`

| Path | Purpose |
|------|---------|
| `/gateway/*` | Consume credits (models, jobs, chat, …) |
| `/billing/*` | Add credits (Gommo VietQR or legacy PayOS) |

Do not mount billing logic under `/gateway`.

## Full reference

→ [Billing API reference](./../reference/billing.md)  
→ [Recipe: Gommo VietQR topup](./../cookbook/gommo-topup.md)

## Next

→ [FAQ](./../faq.md) · [Authentication](./../authentication.md)
