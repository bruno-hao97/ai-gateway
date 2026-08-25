---
title: Upstream hosts
description: Gommo v2 and platform hosts — env vars and routing rules
---

# Upstream hosts

Gommo exposes **two HTTP bases**. AI Gateway routes each mount to the correct upstream based on server env — clients using Mode B never need to know the hostnames.

## Host map

| Env variable | Default | Host | Used for |
|--------------|---------|------|----------|
| `GOMMO_API_BASE_URL` or `GOMMO_BASE_URL` | `https://v2.api.gommo.net` | V2 API | Media models, jobs, V2 upload |
| `GOMMO_AUTH_BASE_URL` | `https://api.gommo.net` | Platform API | Auth, chat, audio, feed |
| `GOMMO_AUTH_PATH` | `/api/apps/go-mmo` | — | Prefix for login, `/ai/me` |
| `GOMMO_API_DOMAIN` | `79ai.net` | — | `domain` field on every upstream call |

::: tip Domain is not a hostname
`GOMMO_API_DOMAIN` is the **registration domain** of Gommo accounts (e.g. `79ai.net`), not the API host. Mode B injects it when the client omits `domain`.
:::

## What runs on each host

### `v2.api.gommo.net` (V2 / media)

- `POST /ai/models?type={type}` — model catalog
- `POST /ai/jobs/{type}/{modelSlug}` — create job
- `POST /ai/jobs/{id}?media={media}` — poll status
- `POST /ai/upload/image`, `/ai/upload/video` — asset upload

Auth: `Authorization: Bearer {user_access_token}`  
Body: `application/x-www-form-urlencoded` with `domain`, `project_id`, job fields.

### `api.gommo.net` (platform)

- `POST {GOMMO_AUTH_PATH}/auth/login` — user login
- `POST {GOMMO_AUTH_PATH}/ai/me` — profile + credits
- `POST /api/v2/chat` — chat (supports SSE stream)
- `POST /ai/audio` — voices, TTS lists

Auth: Bearer for `/api/v2/*`; form `access_token` (+ Bearer where required) for platform routes.

## Gateway proxy mounts (Mode C)

| Client path on gateway | Upstream base | Notes |
|------------------------|---------------|-------|
| `/v2/*` | `GOMMO_API_BASE_URL` | Strips `/v2` prefix |
| `/ai/*` | `GOMMO_AUTH_BASE_URL` | |
| `/api/v2/*` | `GOMMO_AUTH_BASE_URL` | Stream when `/chat` or SSE |
| `/api/apps/go-mmo/*` | `GOMMO_AUTH_BASE_URL` | Login, me, user balances |

Examples:

```
POST /v2/ai/jobs/image/flux-dev
  → POST https://v2.api.gommo.net/ai/jobs/image/flux-dev

POST /api/v2/chat
  → POST https://api.gommo.net/api/v2/chat

POST /api/apps/go-mmo/auth/login
  → POST https://api.gommo.net/api/apps/go-mmo/auth/login
```

## Proxy behavior

- **Pass-through** — same method, raw body, headers (hop-by-hop stripped)
- **Body limit** — 50 MB
- **Streaming** — pipe response when URL contains `/chat` or `Content-Type: text/event-stream`
- **Errors** — proxy failures return `502 { success: false, message }`

## Mode B REST mapping

Mode B does not expose raw upstream paths. Instead, `/gateway/*` calls the same upstream hosts internally:

| Gateway REST | Upstream equivalent |
|--------------|---------------------|
| `GET /gateway/models` | `POST /ai/models` on V2 |
| `POST /gateway/jobs/:type` | `POST /ai/jobs/:type/:slug` on V2 |
| `GET /gateway/jobs/:id` | poll on V2 |
| `POST /gateway/chat` | `POST /api/v2/chat` on platform |
| `POST /gateway/upload/image` | `POST /ai/upload/image` on V2 |

See [Endpoint map](./endpoint-map.md) for the full table.

## Next

→ [Integration modes](./integration-modes.md) · [Choosing a mode](./choosing-a-mode.md)
