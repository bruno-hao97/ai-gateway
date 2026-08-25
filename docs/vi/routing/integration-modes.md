---
title: Integration modes
description: Mode A Direct, Mode B REST, Mode C Proxy
---

# Integration modes

Ba cách gọi Gommo qua gateway. Cùng user token và catalog — khác URL và ergonomics.

## So sánh nhanh

| | Mode A Direct | Mode B REST | Mode C Proxy |
|---|---------------|-------------|--------------|
| Base URL | Host Gommo | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | Pass-through |
| Domain client | Form bắt buộc | **Tùy chọn** (`GOMMO_API_DOMAIN`) | Form bắt buộc |
| Ẩn upstream | Không | Có | Có |
| Poll / wrap | Tự implement | `wait: true` | Envelope Gommo |
| Response | Gommo native | `{ success, data, message, code }` | Gommo native |
| Phù hợp | Backend không gateway | Tích hợp mới | FE Gommo drop-in |

---

## Mode A — Direct Gommo {#mode-a-direct-gommo}

Gọi thẳng upstream từ backend tin cậy.

**V2 jobs:**

```http
POST https://v2.api.gommo.net/ai/jobs/image/{modelSlug}
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

domain={GOMMO_API_DOMAIN}&project_id=default&prompt=...&ratio=...
```

**Auth, chat, audio:**

```http
POST https://api.gommo.net/api/apps/go-mmo/auth/login
POST https://api.gommo.net/api/v2/chat
POST https://api.gommo.net/ai/audio
```

::: warning Tự poll
Gommo không webhook. Poll 3.5s × ~80 lần hoặc dùng Mode B `wait: true`.
:::

---

## Mode B — Gateway REST {#mode-b-gateway-rest}

JSON API `/gateway/*`. Gateway dịch sang form upstream và poll tùy chọn.

Domain tự điền từ `GOMMO_API_DOMAIN` nếu client không gửi.

| Gateway | Upstream |
|---------|----------|
| `GET /gateway/models?type=` | `POST /ai/models` (v2) |
| `POST /gateway/jobs/:type` | `POST /ai/jobs/:type/:slug` |
| `GET /gateway/jobs/:id?media=` | poll |
| `POST /gateway/upload/image` | upload V2 |
| `POST /gateway/chat` | `POST /api/v2/chat` |
| `POST /gateway/audio/*` | platform audio |

Auth: `Authorization: Bearer {user_access_token}`.

Khuyến nghị cho script, SPA, automation mới.

---

## Mode C — Gateway proxy {#mode-c-gateway-proxy}

Pass-through — giữ path Gommo, đổi base URL sang gateway.

| Mount | Upstream |
|-------|----------|
| `/v2/*` | `GOMMO_API_BASE_URL` (bỏ `/v2`) |
| `/ai/*`, `/api/v2/*` | `GOMMO_AUTH_BASE_URL` |
| `/api/apps/go-mmo/*` | auth proxy |

```
POST /v2/ai/jobs/image/flux-dev  →  v2.api.gommo.net/…
POST /api/v2/chat                →  api.gommo.net/…
```

Body limit 50MB. Stream chat/SSE. Form cần `domain`.

Dùng khi migrate FE Gommo sẵn có — chỉ đổi base URL.

---

## Auth theo mode

| Route | Token |
|-------|-------|
| V2 jobs | `Authorization: Bearer` |
| Platform form | `access_token` trong form |
| Login | Không token — trả `access_token` |

→ [Authentication](../authentication.md)

## Cùng catalog, cùng quy tắc

1. List models trước — không đoán `ratio` / `mode` / …
2. Cùng user `access_token`
3. Job async — poll hoặc `wait: true`

## Tiếp theo

→ [Choosing a mode](./choosing-a-mode.md) · [Endpoint map](./endpoint-map.md)
