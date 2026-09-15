---
title: Models & routing
description: Model Gommo, upstream host và integration mode qua AI Gateway
---

# Models & routing

Tích hợp **khuyến nghị:** gọi thẳng **hai upstream host Gommo**. Tùy chọn: self-host AI Gateway (Mode B/C) cho JSON REST, portal billing, hoặc BYOK.

## Stack routing

```
Client
  │
  ├─ Mode A ──► v2.api.gommo.net  (media jobs)
  │          └─► api.gommo.net    (auth, chat, audio)
  │
  └─ Mode B/C ──► AI Gateway (:3001)
                    ├─ /gateway/*     REST wrap (Mode B)
                    ├─ /v2/*          ──► v2.api.gommo.net
                    ├─ /ai/*, /api/v2/*  ──► api.gommo.net
                    └─ /api/apps/go-mmo/*  auth proxy
```

## Ba integration mode

| | Mode A Direct | Mode B REST | Mode C Proxy |
|---|---------------|-------------|--------------|
| Base URL | Host Gommo | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | Pass-through |
| Domain client | Bắt buộc (form) | **Tùy chọn** (env server) | Bắt buộc (form) |
| Ẩn URL upstream | Không | Có | Có |
| Poll built-in | Không | `wait: true` | Envelope Gommo raw |
| Phù hợp | Backend tin cậy | App mới, automation | FE Gommo legacy |

`{gateway}` = `http://localhost:3001` (dev) hoặc URL deploy.

## Luồng routing model

Mọi tích hợp media đều theo thứ tự:

1. **List models** — `type=image|video|music|…`
2. **Chọn `modelSlug`** và field cho phép (`ratio`, `mode`, …) từ response
3. **Create job** — không đoán tham số
4. **Poll** — client (`POST v2…/ai/jobs/{id}?media=…`) hoặc gateway tùy chọn (`wait: true`)

Chi tiết catalog → [Models overview](../models/).

## Tách upstream

| Host | API điển hình |
|------|---------------|
| **`v2.api.gommo.net`** | Models, media jobs, upload V2 |
| **`api.gommo.net`** | Login, `/ai/me`, chat, audio |

→ [Upstream hosts](./upstream-hosts.md)

## Map endpoint nhanh

| Thao tác | Mode A (Direct) | Mode B (REST) | Mode C (Proxy) |
|----------|-----------------|---------------|----------------|
| List models | `POST v2…/ai/models?type=` | `GET /gateway/models?type=` | `POST /v2/ai/models?type=` |
| Create job | `POST v2…/ai/jobs/:type/:slug` | `POST /gateway/jobs/:type` | `POST /v2/ai/jobs/:type/:slug` |
| Poll | `POST v2…/ai/jobs/:id?media=` | `GET /gateway/jobs/:id?media=` | `POST /v2/ai/jobs/:id?media=` |
| Chat | `POST api…/api/v2/chat` | `POST /gateway/chat` | `POST /api/v2/chat` |

Bảng đầy đủ → [Endpoint map](./endpoint-map.md).

## Chọn mode

→ [Choosing a mode](./choosing-a-mode.md)

## Trong section này

- [Upstream hosts](./upstream-hosts.md)
- [Integration modes](./integration-modes.md)
- [Endpoint map](./endpoint-map.md)
- [Choosing a mode](./choosing-a-mode.md)

## Tiếp theo

→ [Models](../models/) · [Media reference](../reference/media.md) · [Quickstart](../quickstart.md)
