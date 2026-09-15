---
title: Integration modes
description: Mode A Direct, Mode B REST, and Mode C Proxy — auth, domain, and routing
---

# Integration modes

Three ways to reach Gommo. **Mode A (Direct)** is recommended for production — call `v2.api.gommo.net` and `api.gommo.net` from your backend. Modes B/C are optional when you self-host this gateway.

All modes use the **same user token** and **same model catalog** — only the URL shape and ergonomics differ.

## Quick comparison

| | Mode A Direct | Mode B REST | Mode C Proxy |
|---|---------------|-------------|--------------|
| Base URL | `v2.api.gommo.net` / `api.gommo.net` | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | Pass-through headers + body |
| Domain in client | Required in form | **Optional** (server `GOMMO_API_DOMAIN`) | Required in form |
| Hides upstream URL | No | Yes | Yes |
| Poll / wrap | Implement yourself | `wait: true` built-in | Raw Gommo envelope |
| Response shape | Gommo native | `{ success, data, message, code }` | Gommo native |
| Best for | **Production apps** | Self-host dev, billing, BYOK | Legacy Gommo FE drop-in |

`{gateway}` = `http://localhost:3001` (dev) or production API URL.

---

## Mode A — Direct Gommo {#mode-a-direct-gommo}

**Recommended.** Call upstream hosts directly from your trusted backend. No gateway in the path.

**V2 media jobs:**

```http
POST https://v2.api.gommo.net/ai/jobs/image/{modelSlug}
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

domain={GOMMO_API_DOMAIN}&project_id=default&prompt=...&ratio=...
```

**Auth, chat, audio:**

```http
POST https://api.gommo.net/api/apps/go-mmo/auth/login
POST https://api.gommo.net/ai/me
POST https://api.gommo.net/api/v2/chat
POST https://api.gommo.net/ai/audio
```

Use for mobile apps, SaaS backends, agents, and any integration that does not need self-hosted billing or BYOK.

::: warning You own polling
Gommo does not webhook job completion. Poll every **3.5s**, max **80** attempts — or use Mode B `wait: true` on a self-hosted gateway.
:::

→ [Gommo public API](../reference/gommo-public-api.md) · [Quickstart](../quickstart.md)

---

## Mode B — Gateway REST {#mode-b-gateway-rest}

**Optional.** JSON API on `/gateway/*` when you run this repo. The gateway translates REST bodies to upstream form calls and optionally polls.

**Domain auto-fill:** if the client omits `domain`, the gateway injects `GOMMO_API_DOMAIN` from server env.

| Gateway endpoint | Upstream equivalent |
|------------------|---------------------|
| `GET /gateway/models?type=` | `POST /ai/models` (v2) |
| `POST /gateway/jobs/:type` | `POST /ai/jobs/:type/:slug` |
| `GET /gateway/jobs/:id?media=` | poll job |
| `POST /gateway/upload/image` | `POST /ai/upload/image` |
| `POST /gateway/upload/video` | `POST /ai/upload/video` |
| `POST /gateway/chat` | `POST /api/v2/chat` |
| `POST /gateway/audio/voices` | `POST /ai/audio` |
| `POST /gateway/audio/tts` | TTS via platform |
| `GET /gateway/audio/lists` | audio lists |

Auth: `Authorization: Bearer {user_access_token}`.

Example create job:

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "flux-dev",
  "wait": true,
  "fields": {
    "prompt": "A sunset",
    "ratio": "16:9"
  }
}
```

Errors:

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

Use for local dev, Gommo VietQR billing, BYOK, and automation that prefers JSON + `wait: true`.

---

## Mode C — Gateway proxy {#mode-c-gateway-proxy}

**Optional.** Transparent pass-through — same paths as Gommo, but base URL is your gateway.

| Mount on gateway | Upstream | Notes |
|------------------|----------|-------|
| `/v2/*` | `GOMMO_API_BASE_URL` | Strips `/v2` |
| `/ai/*` | `GOMMO_AUTH_BASE_URL` | |
| `/api/v2/*` | `GOMMO_AUTH_BASE_URL` | Stream for `/chat` or SSE |
| `/api/apps/go-mmo/*` | `GOMMO_AUTH_BASE_URL` | Login, me, balances |

URL mapping examples:

```
POST /v2/ai/jobs/image/flux-dev  →  POST https://v2.api.gommo.net/ai/jobs/image/flux-dev
POST /api/v2/chat                →  POST https://api.gommo.net/api/v2/chat
POST /api/apps/go-mmo/auth/login →  POST https://api.gommo.net/api/apps/go-mmo/auth/login
```

- Body limit **50 MB** (raw)
- Stream pipe for chat / SSE
- Form body must include `domain` — use **`GOMMO_API_DOMAIN`** (same as user's registration domain)

Use when migrating an existing Gommo frontend: change base URL to gateway, keep paths and form bodies.

---

## Auth across modes

| Route family | Token style |
|--------------|-------------|
| V2 jobs (`/v2`, `/gateway/jobs`) | `Authorization: Bearer` |
| Platform form routes | `access_token` in form (+ Bearer on `/api/v2` where required) |
| Login | No token — returns `access_token` |

See [Authentication](../authentication.md).

---

## Same catalog, same rules

All three modes:

1. List models before creating jobs — never guess `ratio` / `mode` / `resolution` / `duration`
2. Use the user's Gommo `access_token`
3. Respect async job semantics (poll or `wait: true`)

## Next

→ [Choosing a mode](./choosing-a-mode.md) · [Endpoint map](./endpoint-map.md) · [Gommo public API](../reference/gommo-public-api.md)
