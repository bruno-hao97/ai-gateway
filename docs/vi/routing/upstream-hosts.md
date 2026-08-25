---
title: Upstream hosts
description: Host v2 và platform Gommo — env và quy tắc routing
---

# Upstream hosts

Gommo có **hai HTTP base**. Gateway route từng mount tới upstream đúng — client Mode B không cần biết hostname.

## Bảng host

| Biến env | Mặc định | Host | Dùng cho |
|----------|----------|------|----------|
| `GOMMO_API_BASE_URL` hoặc `GOMMO_BASE_URL` | `https://v2.api.gommo.net` | V2 API | Models, jobs, upload V2 |
| `GOMMO_AUTH_BASE_URL` | `https://api.gommo.net` | Platform | Auth, chat, audio |
| `GOMMO_AUTH_PATH` | `/api/apps/go-mmo` | — | Prefix login, `/ai/me` |
| `GOMMO_API_DOMAIN` | `79ai.net` | — | Field `domain` mọi request |

::: tip Domain không phải hostname API
`GOMMO_API_DOMAIN` là **domain đăng ký** tài khoản Gommo (vd. `79ai.net`). Mode B tự inject khi client bỏ qua `domain`.
:::

## API trên từng host

### `v2.api.gommo.net` (V2 / media)

- `POST /ai/models?type={type}` — catalog
- `POST /ai/jobs/{type}/{modelSlug}` — tạo job
- `POST /ai/jobs/{id}?media={media}` — poll
- `POST /ai/upload/image`, `/ai/upload/video`

Auth: `Authorization: Bearer`  
Body: form-urlencoded với `domain`, `project_id`, field job.

### `api.gommo.net` (platform)

- `POST {GOMMO_AUTH_PATH}/auth/login`
- `POST {GOMMO_AUTH_PATH}/ai/me`
- `POST /api/v2/chat` (hỗ trợ SSE)
- `POST /ai/audio`

## Mount proxy gateway (Mode C)

| Path client | Upstream | Ghi chú |
|-------------|----------|---------|
| `/v2/*` | `GOMMO_API_BASE_URL` | Bỏ prefix `/v2` |
| `/ai/*` | `GOMMO_AUTH_BASE_URL` | |
| `/api/v2/*` | `GOMMO_AUTH_BASE_URL` | Stream `/chat` hoặc SSE |
| `/api/apps/go-mmo/*` | `GOMMO_AUTH_BASE_URL` | Login, me |

Ví dụ:

```
POST /v2/ai/jobs/image/flux-dev
  → POST https://v2.api.gommo.net/ai/jobs/image/flux-dev

POST /api/v2/chat
  → POST https://api.gommo.net/api/v2/chat
```

## Hành vi proxy

- Pass-through method, raw body, headers
- Body limit **50 MB**
- Stream khi URL có `/chat` hoặc SSE
- Lỗi proxy: `502 { success: false, message }`

## Mapping Mode B REST

| Gateway REST | Upstream |
|--------------|----------|
| `GET /gateway/models` | `POST /ai/models` (V2) |
| `POST /gateway/jobs/:type` | `POST /ai/jobs/:type/:slug` |
| `GET /gateway/jobs/:id` | poll V2 |
| `POST /gateway/chat` | `POST /api/v2/chat` |

→ [Endpoint map](./endpoint-map.md)

## Tiếp theo

→ [Integration modes](./integration-modes.md) · [Choosing a mode](./choosing-a-mode.md)
