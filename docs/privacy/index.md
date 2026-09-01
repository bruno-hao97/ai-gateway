---
title: Privacy & security
description: Credentials, secrets, logging, and billing security
---

# Privacy & security

AI Gateway is an **API platform** — your users authenticate with Gommo user tokens; your server holds merchant and admin secrets. This page covers what must stay private and how the gateway handles sensitive data.

## Trust boundaries

```
Browser / mobile app          Your server (gateway)           Gommo upstream
─────────────────────         ─────────────────────           ──────────────
User email/password    →      (proxy login only)       →      api.gommo.net
User access_token      →      Bearer on /gateway/*   →      v2 + platform
                               GOMMO_ACCESS_TOKEN     →      /admin, billing fulfill
                               ADMIN_API_KEY          →      protects /admin/*
                               PayOS keys (legacy)    →      webhook verify only
```

**Rule:** anything in the right column of server-only secrets must **never** ship to browsers, mobile apps, or public repos.

## Credential types

| Credential | Where it lives | Exposed to clients? | Used for |
|------------|----------------|---------------------|----------|
| User `access_token` | Client storage (after login) | Yes — Bearer header | `/gateway/*`, proxy user routes |
| User password | Login form only | Never store long-term | One-time login via proxy |
| `GOMMO_ACCESS_TOKEN` | Server `.env` / secrets | **Never** | `/admin/*`, Gommo billing fulfill, `credit_plans` sync |
| `ADMIN_API_KEY` | Server `.env` / secrets | **Never** | Header `x-admin-key` on `/admin/*` |
| PayOS keys (legacy) | Server `.env` | **Never** | Legacy PayOS topup only |

See [Authentication](../authentication.md) for login flow.

## What `/gateway` does not expose

Mode B REST **does not** return or accept:

- Merchant `GOMMO_ACCESS_TOKEN`
- `ADMIN_API_KEY`
- PayOS `checksumKey` or API secrets

Billing uses **user Bearer** + `username` — fulfillment calls merchant APIs **inside** the gateway process.

## `/admin` is server-only

All `/admin/*` routes require `x-admin-key: {ADMIN_API_KEY}` when configured. Intended for:

- Merchant balance checks
- Manual credit send
- User registration (merchant)

If `ADMIN_API_KEY` is unset, admin routes return `503 NOT_CONFIGURED`.

::: danger Never in frontend code
Do not embed `ADMIN_API_KEY` or `GOMMO_ACCESS_TOKEN` in SPAs, React Native bundles, or public GitHub repos.
:::

## Gommo billing (default)

Credit topup flow (VietQR via Gommo):

1. Client creates order via `POST /billing/payment/create` (user Bearer).
2. User pays by bank transfer / VietQR using transfer content from the response.
3. Client polls `POST /billing/payment/sync` (or gateway background sync) until paid.
4. On success, internal `sendCreditsToUser()` — no client involvement in merchant APIs.

**Requirements:**

- `GOMMO_ACCESS_TOKEN` configured for fulfillment and live package sync (`GET /billing/packages`).
- Transfer content (`orderCode`) must match exactly — users should not edit it.

See [Billing & credits](../guides/billing-credits.md).

## PayOS webhook security (legacy)

Legacy PayOS topup (`POST /billing/topup/create`) is still supported when PayOS env is set:

1. Client creates order via `POST /billing/topup/create` (user Bearer).
2. User pays on PayOS.
3. PayOS POST `/billing/webhook/payos` with signed payload.
4. Gateway verifies **checksum** using `PAYOS_CHECKSUM_KEY`.
5. On `PAID`, internal credit fulfillment.

**Requirements:**

- `PAYOS_WEBHOOK_URL` must be a **public HTTPS** URL pointing to your API.
- Register the same URL on [PayOS dashboard](https://my.payos.vn).
- Reject or ignore webhooks that fail checksum validation.

## Logging and data handling

**Do log (operations):**

- HTTP method, path, status code
- Structured error `code` (not raw upstream secrets)
- `GET /health` for uptime checks

**Do not log:**

- `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`, PayOS keys
- User passwords or full `Authorization` headers in production
- PayOS checksum secrets

User prompts and media URLs may appear in upstream logs on Gommo's side — treat per your privacy policy and Gommo terms.

## CORS and browser exposure

CORS is **off by default** (`GATEWAY_CORS_ORIGIN` empty). When enabled:

- Only listed origins can call the API from JavaScript.
- `credentials: true` — use explicit origins, not `*` in production unless you understand the risk.

User tokens in browser localStorage/sessionStorage are **your app's responsibility** — use HTTPS, short TTL, and secure logout.

## Portal in production

Dev playground at `/portal/` is **disabled in production** unless `GATEWAY_PORTAL=true`.

The portal can run authenticated API tests — exposing it publicly increases attack surface. Prefer internal VPN or dev-only deploys.

## Environment hygiene

| Practice | Why |
|----------|-----|
| Copy from `.env.example`, never commit `.env` | Prevents secret leaks |
| Use platform secrets (Railway/Fly) in prod | Rotation without git history |
| Rotate tokens if accidentally shared | Merchant + admin keys |
| Separate dev/prod merchant tokens if possible | Blast radius |

## Merchant credit buffer

After `sendBalances`, Gommo requires merchant balance **> 500,000 credits**. Gateway env `TOPUP_MERCHANT_BUFFER_CREDITS` (default 300k) guards fulfillment — configure so automated topup cannot drain merchant to zero.

## Reporting security issues

→ [Report feedback](../report-feedback.md) — mark as **security**; do not paste live tokens in public issues.

## Next

→ [Best practices](../best-practices/) · [Deploy & ops](../deploy/) · [Authentication](../authentication.md)
