---
title: Principles
description: Core principles for integrating with Gommo public API
---

# Principles

Core principles for building on [Gommo](https://gommo.net) — read this before [Quickstart](./quickstart.md) or [Models](./models/).

## Request flow

```
Your app
  │
  ├─ v2.api.gommo.net  ──► models · create/poll jobs · upload image/video
  │
  └─ api.gommo.net     ──► login · /ai/me · chat · audio · job info
```

Optional: self-host [AI Gateway](./routing/integration-modes.md) (Mode B/C) for JSON REST, billing portal, BYOK — not required for direct Gommo integration.

## Two upstream hosts

| Host | Use for |
|------|---------|
| **`https://v2.api.gommo.net`** | Models, create/poll media jobs, upload |
| **`https://api.gommo.net`** | Login, profile/credits, chat, platform audio |

Auth: **`Authorization: Bearer <access_token>`** on HTTPS. Platform and V2 form bodies include **`domain`** (same as account registration domain).

## Design principles

### 1. Call Gommo public URLs

Integrators target upstream hosts directly. Full map → [Gommo public API](./reference/gommo-public-api.md).

| Operation | URL |
|-----------|-----|
| List models | `POST https://v2.api.gommo.net/ai/models?type={type}` |
| Create job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` |
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

### 2. Never guess model parameters

`ratio`, `mode`, `resolution`, and `duration` **must** come from the model catalog:

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

Guessing values causes upstream rejection or silent quality issues. See [Models](./models/).

### 3. Async jobs, explicit polling

Gommo media jobs do not push webhooks to your app by default. Your client must poll:

- **3500 ms** interval
- **80** max attempts (~5 min)
- `POST …/ai/jobs/{id}?media=…` until terminal status

Optional hosted gateway can poll server-side (`wait: true`) — see [Integration modes](./routing/integration-modes.md).

### 4. Domain in every form body

Send `domain` matching the domain you registered on (e.g. `79ai.net`, `vmedia`). Wrong domain → auth or payment errors.

Multi-tenant docs portal may lock domain per dealer — see [Tenants](./routing/upstream-hosts.md).

### 5. User vs merchant credentials

| Credential | Where | Used for |
|------------|-------|----------|
| User `access_token` | Client Bearer / form | All user API calls |
| `GOMMO_ACCESS_TOKEN` | Server env only | Merchant ops, catalog translate warm |
| `ADMIN_API_KEY` | Server env only | Self-hosted `/admin/*` |

Never expose merchant or admin secrets to browsers or mobile apps.

### 6. Billing on platform auth host

Credit topup uses Gommo `create_payment` + `payment_sync` on **`api.gommo.net`**. This docs site may wrap billing under `/billing/*` when self-hosted — see [Billing & credits](./guides/billing-credits.md).

### 7. Upstream errors

Gommo returns JSON with `message`, `success`, `error`. Check HTTP status and body — do not retry unchanged credentials on auth failures.

## What we optimize for

- **Integrator speed** — [Quickstart](./quickstart.md) in minutes, [Playground](/app/playground/) with public URLs
- **Catalog fidelity** — never invent enums; list models first
- **Clear hosts** — v2 for media, api for auth/chat/audio

## Next

→ [Models](./models/) · [Quickstart](./quickstart.md) · [MCP & agents](./mcp/)
