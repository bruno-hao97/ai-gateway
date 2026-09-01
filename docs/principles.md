---
title: Principles
description: Core design principles of AI Gateway
---

# Principles

Core principles for building on AI Gateway — an OpenRouter-style **API platform** over [Gommo](https://gommo.net).

## Why AI Gateway?

Gommo exposes **two upstream hosts** and mixed auth styles (Bearer for V2 jobs, form `access_token` for platform APIs). AI Gateway gives integrators:

- **One deployable API** — hide upstream URLs, centralize env and secrets.
- **Predictable REST** — JSON in/out, structured errors, optional server-side poll (`wait: true`).
- **Safe defaults** — domain and merchant credentials stay on the server.

## Design principles

### 1. Unified interface

Clients target `{gateway}` only:

| Dev | Production |
|-----|------------|
| `http://localhost:3001` | `https://api.yourdomain.com` |

Upstream mapping is documented in [Models & routing](./routing/) — clients should not hard-code `v2.api.gommo.net` in app code when using Mode B/C.

### 2. Never guess model parameters

`ratio`, `mode`, `resolution`, and `duration` **must** come from the model catalog returned by:

```http
GET /gateway/models?type=image
Authorization: Bearer {user_token}
```

Guessing values causes upstream rejection or silent quality issues. See [Models](./models/).

### 3. Async jobs, explicit polling

Gommo media jobs do not push webhooks to your app. The gateway:

- Creates the job upstream.
- Optionally polls when `wait: true` ( **3500ms** interval, **80** max attempts).
- Returns `resultUrl` or a timeout error.

Clients that set `wait: false` must poll `GET /gateway/jobs/:id?media=…` themselves with the same semantics.

### 4. Domain belongs on the server (Mode B)

`GOMMO_API_DOMAIN` in gateway `.env` is injected when the client omits `domain`. This reduces client bugs and keeps registration domain consistent.

Mode C (proxy) and Mode A (direct) still require `domain` in form bodies — use the same value as your Gommo account registration domain.

### 5. Merchant vs user credentials

| Credential | Where | Used for |
|------------|-------|----------|
| User `access_token` | Client Bearer / form | `/gateway/*`, proxy user routes |
| `GOMMO_ACCESS_TOKEN` | Server env only | `/admin/*`, legacy PayOS fulfillment |
| `ADMIN_API_KEY` | Server env only | Protect `/admin/*` |

Never expose merchant or admin secrets to browsers or mobile apps.

### 6. Billing is separate from generation

Credit topup flows live under **`/billing/*`**, not `/gateway`. **Default:** Gommo `create_payment` + client `payment_sync` (VietQR bank transfer). **Optional legacy:** PayOS webhook → internal `sendBalances`. See [Billing & credits](./guides/billing-credits.md).

### 7. Errors you can rely on

REST routes return:

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

Common codes: `UNAUTHORIZED`, `UPSTREAM_ERROR`, `RATE_LIMITED`, `NOT_CONFIGURED`, `INSUFFICIENT_CREDITS`.

## What we optimize for

- **Integrator speed** — quickstart in minutes, playground at `/portal/`.
- **Operational clarity** — health check, structured logs, Docker deploy.
- **Upstream fidelity** — proxy Mode C preserves Gommo envelopes when you need drop-in compatibility.

## Next

→ [Models](./models/) · [Quickstart](./quickstart.md) · [MCP & agents](./mcp/)
