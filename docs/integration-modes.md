# Integration modes

## So sánh nhanh

| | Mode A Direct | Mode B REST | Mode C Proxy |
|---|---------------|-------------|--------------|
| Base URL | `v2.api.gommo.net` / `api.gommo.net` | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | Pass-through headers + body |
| Domain client | Gửi trong form | **Tùy chọn** (env server) | Gửi trong form (proxy) |
| Che URL upstream | Không | Có (REST) | Có (path giữ nguyên) |
| Poll / wrap | Tự implement | `wait: true` built-in | Raw envelope Gommo |
| Phù hợp | Service backend | App, automation | FE drop-in |

Biến `{gateway}` = `http://localhost:3001` (dev) hoặc URL deploy.

---

## Mode A — Direct Gommo

Gọi thẳng upstream.

**V2 jobs:**

```
POST https://v2.api.gommo.net/ai/jobs/image/{modelSlug}
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

domain={GOMMO_API_DOMAIN}&project_id=default&prompt=...&ratio=...
```

**Auth / chat / audio:**

```
POST https://api.gommo.net/api/apps/go-mmo/...
POST https://api.gommo.net/api/v2/chat
POST https://api.gommo.net/ai/audio
```

---

## Mode B — Gateway REST

JSON API — **domain tự điền** từ `GOMMO_API_DOMAIN` nếu client không gửi.

| Endpoint gateway | Upstream tương đương |
|------------------|----------------------|
| `GET /gateway/models` | `POST /ai/models` (v2) |
| `POST /gateway/jobs/:type` | `POST /ai/jobs/:type/:slug` |
| `GET /gateway/jobs/:id` | poll job |
| `POST /gateway/upload/image` | `POST /ai/upload/image` |
| `POST /gateway/chat` | `POST /api/v2/chat` |
| `POST /gateway/audio/voices` | `POST /ai/audio` |

Auth: `Authorization: Bearer {user_access_token}`.

---

## Mode C — Gateway proxy

Transparent pass-through — giữ method, body, headers (bỏ hop-by-hop).

| Mount gateway | Upstream | Ghi chú |
|---------------|----------|---------|
| `/v2/*` | `GOMMO_API_BASE_URL` | Strip prefix `/v2` |
| `/ai/*` | `GOMMO_AUTH_BASE_URL` | |
| `/api/v2/*` | `GOMMO_AUTH_BASE_URL` | Stream khi `/chat` hoặc SSE |
| `/api/apps/go-mmo/*` | `GOMMO_AUTH_BASE_URL` | Login, me, sendBalances user |

Ví dụ map:

```
POST /v2/ai/jobs/image/flux-dev  →  POST https://v2.api.gommo.net/ai/jobs/image/flux-dev
POST /api/v2/chat                →  POST https://api.gommo.net/api/v2/chat
```

Body limit **50MB** (raw). Stream pipe cho chat/SSE.

Form upstream cần `domain` — dùng giá trị **`GOMMO_API_DOMAIN`** trên server.

---

## Chọn mode nào?

- **SPA legacy Gommo client** → Mode C (đổi base URL sang gateway).
- **Backend mới, JSON gọn** → Mode B (không cần gửi domain).
- **Không phụ thuộc gateway** → Mode A.

Cả ba mode dùng **cùng user token** và **cùng catalog models** — không đoán `ratio`.
