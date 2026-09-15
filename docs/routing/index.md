---
title: Models & routing
description: How Gommo models, upstream hosts, and integration modes connect
---

# Models & routing

Gommo exposes models and jobs on **two public hosts**. Most integrations call them **directly (Mode A)**. This repo also ships an optional **AI Gateway** for local dev, billing, and BYOK (Modes B/C).

## The routing stack

```
Client
  │
  ├─ Mode A (recommended) ──► v2.api.gommo.net  (media jobs)
  │                        └─► api.gommo.net    (auth, chat, audio)
  │
  └─ Mode B/C (optional) ──► AI Gateway (:3001)
                               ├─ /gateway/*     REST wrap (Mode B)
                               ├─ /v2/*          ──► v2.api.gommo.net
                               ├─ /ai/*, /api/v2/*  ──► api.gommo.net
                               └─ /api/apps/go-mmo/*  auth proxy
```

## Three integration modes

| | Mode A Direct | Mode B REST | Mode C Proxy |
|---|---------------|-------------|--------------|
| Base URL | Gommo hosts | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | Pass-through |
| Domain in client | Required (form) | **Optional** (server env) | Required (form) |
| Hides upstream URL | No | Yes | Yes |
| Built-in poll | No — client poll | `wait: true` | Raw Gommo envelope |
| Best for | **Production apps** | Local dev, automation | Legacy Gommo FE |

`{gateway}` = `http://localhost:3001` (dev) or your deploy URL.

## Model routing flow

Every media integration follows the same sequence — regardless of mode:

1. **List models** — `type=image|video|music|…`
2. **Pick model slug** and allowed fields (`ratio`, `mode`, `resolution`, …) from the response
3. **Create job** — never guess parameters
4. **Poll** — client loop (`POST v2…/ai/jobs/{id}?media=`) or gateway `wait: true`

See [Models overview](../models/) for catalog details.

## Upstream split

Gommo splits APIs across two hosts:

| Host | Typical APIs |
|------|--------------|
| **`v2.api.gommo.net`** | Models list, media jobs, upload (V2) |
| **`api.gommo.net`** | Login, `/ai/me`, chat, audio, feed |

Details → [Upstream hosts](./upstream-hosts.md).

## Endpoint quick map

| Operation | Mode A (Direct) | Mode B (REST) | Mode C (proxy) |
|-----------|-----------------|---------------|----------------|
| List models | `POST v2…/ai/models?type=` | `GET /gateway/models?type=` | `POST /v2/ai/models?type=` |
| Create job | `POST v2…/ai/jobs/:type/:slug` | `POST /gateway/jobs/:type` | `POST /v2/ai/jobs/:type/:slug` |
| Poll job | `POST v2…/ai/jobs/:id?media=` | `GET /gateway/jobs/:id?media=` | `POST /v2/ai/jobs/:id?media=` |
| Chat | `POST api…/api/v2/chat` | `POST /gateway/chat` | `POST /api/v2/chat` |
| Login | `POST api…/auth/login` | — | `POST /api/apps/go-mmo/auth/login` |

Full tables → [Endpoint map](./endpoint-map.md).

## Choose your mode

→ [Choosing a mode](./choosing-a-mode.md) — decision tree for direct upstream, gateway REST, or proxy.

## In this section

- [Upstream hosts](./upstream-hosts.md) — env vars, host responsibilities
- [Integration modes](./integration-modes.md) — Mode A / B / C in depth
- [Endpoint map](./endpoint-map.md) — cross-mode reference
- [Choosing a mode](./choosing-a-mode.md) — when to use which

## Next

→ [Gommo public API](../reference/gommo-public-api.md) · [Models overview](../models/) · [Quickstart](../quickstart.md)
