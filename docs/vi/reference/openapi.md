---
title: OpenAPI
description: Spec Gommo public API + AI Gateway dev (machine-readable)
---

# OpenAPI

Tải hoặc xem **OpenAPI 3.0** cho **Gommo public API** (host v2 + platform) và **AI Gateway** dev tùy chọn (billing, admin, Mode B REST).

## File spec

| Dev | Production |
|-----|------------|
| [http://localhost:5173/openapi.yaml](http://localhost:5173/openapi.yaml) | `https://docs.yourdomain.com/openapi.yaml` |

## Server mặc định (Swagger)

| Server | Mô tả |
|--------|--------|
| `https://v2.api.gommo.net` | Jobs, models, upload, album library |
| `https://api.gommo.net` | Auth, chat, audio, info, library list |
| `http://localhost:3001` | AI Gateway dev — `/gateway/*`, billing, admin |

Mỗi operation có `servers` khi chỉ áp dụng một host. Xem [Gommo public API](./gommo-public-api.md).

## Nhóm path

| Tag | Host | Ví dụ |
|-----|------|-------|
| **Gommo V2** | v2.api.gommo.net | `/ai/models`, `/ai/jobs/{type}/{model}`, `/ai/library/album-images` |
| **Gommo Platform** | api.gommo.net | `/ai/me`, `/api/v2/chat`, `/ai/info/image/{id}` |
| **Gateway Dev** | localhost:3001 | `/gateway/jobs/{type}`, `/gateway/models` |
| **Billing** | localhost:3001 | `/billing/payment/*` |
| **Admin** | localhost:3001 | `/admin/*` |

## Auth trong spec

| Scheme | Dùng cho |
|--------|----------|
| `bearerAuth` | Path Gommo public, `/gateway/*`, billing |
| `adminKey` (`x-admin-key`) | `/admin/*` |

## Tài liệu đọc thêm

→ [Gommo public API](./gommo-public-api.md) · [Media & jobs](./media.md) · [Authentication](../authentication.md)

## Tiếp theo

→ [Endpoint map](../routing/endpoint-map.md) · [Integration modes](../routing/integration-modes.md)
