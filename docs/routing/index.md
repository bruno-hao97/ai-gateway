---
title: Models & routing
description: How Gommo models, upstream hosts, and integration modes connect through AI Gateway
---

# Models & routing

AI Gateway sits between your client and **two Gommo upstream hosts**. Models are not hosted by the gateway — you **route** requests to the right host and integration mode (Direct, REST, or Proxy).

## The routing stack

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

## Three integration modes

| | Mode A Direct | Mode B REST | Mode C Proxy |
|---|---------------|-------------|--------------|
| Base URL | Gommo hosts | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | Pass-through |
| Domain in client | Required (form) | **Optional** (server env) | Required (form) |
| Hides upstream URL | No | Yes | Yes |
| Built-in poll | No | `wait: true` | Raw Gommo envelope |
| Best for | Trusted backend | New apps, automation | Legacy Gommo FE |

`{gateway}` = `http://localhost:3001` (dev) or your deploy URL.

## Model routing flow

Every media integration follows the same sequence — regardless of mode:

1. **List models** — `type=image|video|music|…`
2. **Pick `modelSlug`** and allowed fields (`ratio`, `mode`, `resolution`, …) from the response
3. **Create job** — never guess parameters
4. **Poll** — gateway (`wait: true`) or client (`GET /gateway/jobs/:id`)

See [Models overview](../models/) for catalog details.

## Upstream split

Gommo splits APIs across two hosts:

| Host | Typical APIs |
|------|--------------|
| **`v2.api.gommo.net`** | Models list, media jobs, upload (V2) |
| **`api.gommo.net`** | Login, `/ai/me`, chat, audio, feed |

The gateway maps env vars to these hosts. Details → [Upstream hosts](./upstream-hosts.md).

## Endpoint quick map

| Operation | Mode B (REST) | Mode C (proxy) | Mode A (direct) |
|-----------|---------------|----------------|-----------------|
| List models | `GET /gateway/models?type=` | `POST /v2/ai/models?type=` | `POST v2…/ai/models?type=` |
| Create job | `POST /gateway/jobs/:type` | `POST /v2/ai/jobs/:type/:slug` | Same as upstream |
| Poll job | `GET /gateway/jobs/:id?media=` | `POST /v2/ai/jobs/:id?media=` | Same as upstream |
| Chat | `POST /gateway/chat` | `POST /api/v2/chat` | `POST api…/api/v2/chat` |
| Login | — | `POST /api/apps/go-mmo/auth/login` | Same as upstream |

Full tables → [Endpoint map](./endpoint-map.md).

## Choose your mode

→ [Choosing a mode](./choosing-a-mode.md) — decision tree for SPA legacy, new backend, or direct upstream.

## In this section

- [Upstream hosts](./upstream-hosts.md) — env vars, host responsibilities
- [Integration modes](./integration-modes.md) — Mode A / B / C in depth
- [Endpoint map](./endpoint-map.md) — cross-mode reference
- [Choosing a mode](./choosing-a-mode.md) — when to use which

## Next

→ [Models overview](../models/) · [Media reference](../reference/media.md) · [Quickstart](../quickstart.md)
