---
title: OpenAPI
description: Machine-readable Gommo public API + optional AI Gateway dev spec
---

# OpenAPI

Download or browse the **OpenAPI 3.0** spec for **Gommo public API** (v2 + platform hosts) and optional **AI Gateway** dev endpoints (billing, admin, Mode B REST).

## Spec file

| Dev | Production |
|-----|------------|
| [http://localhost:5173/openapi.yaml](http://localhost:5173/openapi.yaml) | `https://docs.yourdomain.com/openapi.yaml` |

## Default servers (Swagger)

| Server | Description |
|--------|-------------|
| `https://v2.api.gommo.net` | Jobs, models, upload, album library |
| `https://api.gommo.net` | Auth, chat, audio, info, library lists |
| `http://localhost:3001` | AI Gateway dev — `/gateway/*`, billing, admin |

Each operation sets `servers` when it only applies to one host. See [Gommo public API](./gommo-public-api.md) for the full map.

## Path groups

| Tag | Host | Examples |
|-----|------|----------|
| **Gommo V2** | v2.api.gommo.net | `/ai/models`, `/ai/jobs/{type}/{model}`, `/ai/library/album-images` |
| **Gommo Platform** | api.gommo.net | `/ai/me`, `/api/v2/chat`, `/ai/info/image/{id}` |
| **Gateway Dev** | localhost:3001 | `/gateway/jobs/{type}`, `/gateway/models` |
| **Billing** | localhost:3001 | `/billing/payment/*` |
| **Admin** | localhost:3001 | `/admin/*` |

## Auth in spec

| Security scheme | Used on |
|-----------------|---------|
| `bearerAuth` | Gommo public paths, `/gateway/*`, billing |
| `adminKey` (`x-admin-key`) | `/admin/*` |

## Human-readable reference

→ [Gommo public API](./gommo-public-api.md) · [Media & jobs](./media.md) · [Authentication](../authentication.md)

## Next

→ [Endpoint map](../routing/endpoint-map.md) · [Integration modes](../routing/integration-modes.md)
