---
title: OpenAPI
description: Machine-readable API spec for AI Gateway REST endpoints
---

# OpenAPI

Download or browse the **OpenAPI 3.0** spec for Mode B REST, billing, admin, and health endpoints.

## Spec file

| Dev | Production |
|-----|------------|
| [http://localhost:5173/openapi.yaml](http://localhost:5173/openapi.yaml) | `https://docs.yourdomain.com/openapi.yaml` |

When the API is deployed, you can also host a copy at `https://api.yourdomain.com/openapi.yaml` (copy from `docs/public/openapi.yaml`).

## Swagger Editor

Paste your public spec URL into [Swagger Editor](https://editor.swagger.io/):

```
https://editor.swagger.io/?url=https://docs.yourdomain.com/openapi.yaml
```

Or import the local file from `docs/public/openapi.yaml`.

## Path groups

| Prefix | Description |
|--------|-------------|
| `GET /health` | Uptime and config flags |
| `/gateway/auth/*` | Login and register (no Bearer required) |
| `/gateway/*` | Models, jobs, upload, chat, audio (Bearer user token) |
| `/billing/*` | PayOS topup (user Bearer on create) |
| `/admin/*` | Merchant ops (`x-admin-key`) |

Proxy routes (`/v2`, `/api/v2`, `/api/apps/go-mmo`) are **not** in this spec — they pass through upstream unchanged. See [Integration modes](../routing/integration-modes.md).

## Auth in spec

| Security scheme | Used on |
|-----------------|---------|
| `bearerAuth` | `/gateway/*`, `/billing/topup/create` |
| `adminKey` (`x-admin-key`) | `/admin/*` |

## Detailed reference

Human-readable examples with curl/PowerShell:

→ [Media & jobs](./media.md) · [Chat](./chat.md) · [Upload](./upload.md) · [Audio](./audio.md) · [Billing](./billing.md) · [Admin](./admin.md)

## Next

→ [Authentication](../authentication.md) · [Deploy & ops](../deploy/)
