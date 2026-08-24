# AI Gateway

**Powered by [Gommo](https://gommo.net)**

AI Gateway là lớp trung gian Express TypeScript: **proxy transparent** tới upstream Gommo + **REST wrap** cho client không muốn gọi URL upstream trực tiếp.

Domain Gommo được cấu hình ngầm qua env **`GOMMO_API_DOMAIN`** trên server (default `79ai.net`). Client REST **không cần** gửi `domain` nếu dùng Mode B.

## Upstream bases

| Host | Mục đích |
|------|----------|
| `https://v2.api.gommo.net` | Jobs media V2 (image, video, …) |
| `https://api.gommo.net` | Auth, chat, audio, feed |

## Ba cách tích hợp

| Mode | Ai dùng | Mô tả ngắn |
|------|---------|------------|
| **[A — Direct Gommo](./integration-modes.md#mode-a-direct-gommo)** | Backend tin cậy, mobile native | Gọi thẳng URL upstream |
| **[B — Gateway REST](./integration-modes.md#mode-b-gateway-rest)** | App/SPA, script | JSON `/gateway/*`, Bearer user token |
| **[C — Gateway proxy](./integration-modes.md#mode-c-gateway-proxy)** | FE drop-in | Pass-through `/v2`, `/ai`, `/api/v2`, `/api/apps/go-mmo` |

```
Client ──► AI Gateway (localhost:3001)
              ├── /gateway/*     REST wrap (Mode B) — domain từ env
              ├── /v2/*          ──► v2.api.gommo.net (Mode C)
              ├── /ai/*          ──► api.gommo.net
              ├── /api/v2/*      ──► api.gommo.net
              └── /api/apps/go-mmo/*  ──► api.gommo.net
```

## Quy tắc Gommo (bắt buộc)

1. **Không đoán** `ratio` / `mode` / `resolution` / `duration` — lấy từ **models list**.
2. Job async: poll **3.5s**, tối đa **80 lần** (~5 phút); Gommo không webhook.
3. Mọi call upstream cần `domain` — **Mode B** gateway tự điền từ `GOMMO_API_DOMAIN`.
4. V2 jobs: header `Authorization: Bearer {access_token}`; platform API thêm form `access_token`.
5. **`GOMMO_ACCESS_TOKEN`** (merchant) chỉ server — route `/admin/*`, không expose browser.

## Bắt đầu nhanh

→ [Quickstart: login → 1 image job](./quickstart.md)

## Chạy gateway local

```bash
cp .env.example .env   # GOMMO_API_DOMAIN=79ai.net
npm install
npm run dev            # http://localhost:3001
npm run docs:dev       # preview docs (port 5173)
```

## Production & deploy

- **API:** `api.yourdomain.com` — Docker / Railway / Fly ([README deploy](../README.md#deploy))
- **Docs:** `docs.yourdomain.com` — `npm run docs:build` → Vercel hoặc GitHub Pages
- **Portal (dev):** `http://localhost:3001/portal/` — landing + playground (gom API)
- **Health:** `GET /health` → `{ ok, merchantConfigured, adminConfigured }`
- **CORS:** `GATEWAY_CORS_ORIGIN` (comma-separated origins)
- **Errors:** `{ success: false, message, code? }`
