---
title: Billing & credits
description: PayOS topup and credit fulfillment overview
---

# Billing & credits

End-user **credit topup** via PayOS — separate from `/gateway` generation APIs.

OpenRouter uses Stripe and shared projects; AI Gateway uses **PayOS** + internal Gommo credit send.

## Overview

```
User app ──► POST /billing/topup/create (Bearer user)
                └── PayOS checkout URL / QR
                        └── webhook PAID ──► gateway fulfills credits on Gommo user
```

Merchant `GOMMO_ACCESS_TOKEN` stays on the server — used only during fulfillment (same family as `/admin`).

## Prerequisites

| Requirement | Env / note |
|-------------|------------|
| PayOS account | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` |
| Public webhook URL | `PAYOS_WEBHOOK_URL` → `https://api…/billing/webhook/payos` |
| Merchant Gommo token | `GOMMO_ACCESS_TOKEN` |
| Merchant buffer | After send, merchant balance > 500k credits (Gommo rule) |

Check config:

```http
GET /billing/status
```

Returns `payosConfigured`, `merchantReady`.

## Packages

```http
GET /billing/packages
```

Returns credit packages (amount VND, credits, optional bonus). Defined in server `creditPackages` — not hard-coded in clients.

## Create topup order

```http
POST /billing/topup/create
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "username": "gommo_username_from_/ai/me",
  "packageId": "basic-member"
}
```

Response includes PayOS checkout URL / QR data and `orderCode`.

Poll order (optional):

```http
GET /billing/topup/orders/{orderCode}
```

Statuses include `pending`, `paid`, `credited`, `failed`.

## Webhook flow

1. PayOS POST `/billing/webhook/payos` with signature.
2. Gateway verifies checksum.
3. On `PAID` → lookup order → `sendCreditsToUser()` (internal, no `x-admin-key` from client).
4. Order marked `credited`.

## vs `/gateway`

| Path | Purpose |
|------|---------|
| `/gateway/*` | Consume credits (models, jobs, chat, …) |
| `/billing/*` | Add credits (PayOS) |

Do not mount PayOS logic under `/gateway`.

## Full reference

→ [Billing (PayOS) API reference](./../reference/billing.md)

## Next

→ [FAQ](./../faq.md) · [Authentication](./../authentication.md)
