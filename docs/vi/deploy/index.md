---
title: Deploy & ops
description: Docker, Railway, Fly, health check, cấu hình production
---

# Deploy & ops

Chạy AI Gateway như một API service. Docs và portal deploy riêng.

## Layout đề xuất

| Service | Domain | Cách |
|---------|--------|------|
| **API** | `api.yourdomain.com` | Docker / Railway / Fly |
| **Docs** | `docs.yourdomain.com` | VitePress — Vercel / GitHub Pages |
| **Portal** | `/portal/` trên API | Dev only; prod tắt trừ `GATEWAY_PORTAL=true` |

**Không commit** `.env`, merchant token, admin key.

## Dev local

```bash
cp .env.example .env
npm install
npm run dev            # :3001
npm run docs:dev       # :5173
```

```bash
curl http://localhost:3001/health
```

## Health check

```http
GET /health
```

```json
{
  "success": true,
  "data": {
    "ok": true,
    "merchantConfigured": true,
    "adminConfigured": true
  }
}
```

Railway / Fly / k8s: probe `GET /health`.

## Docker

```bash
docker build -t ai-gateway .
docker run --rm -p 3001:3001 --env-file .env ai-gateway
```

Platform inject `PORT`.

## Railway

1. Deploy from GitHub.
2. Variables từ `.env.example`.
3. Domain `api.yourdomain.com`.
4. Health path `/health`.

## Fly.io

```bash
fly launch --no-deploy
fly secrets set GOMMO_ACCESS_TOKEN=... ADMIN_API_KEY=... GOMMO_API_DOMAIN=79ai.net
fly secrets set GATEWAY_CORS_ORIGIN=https://your-frontend.example.com
fly deploy
fly certs add api.yourdomain.com
```

## Env production

| Biến | Mục đích |
|------|----------|
| `PORT` | Platform inject |
| `NODE_ENV` | `production` — portal tắt mặc định |
| `GOMMO_API_DOMAIN` | Domain đăng ký |
| `GOMMO_ACCESS_TOKEN` | Merchant — server only |
| `ADMIN_API_KEY` | `/admin/*` |
| `GATEWAY_CORS_ORIGIN` | Origin browser, phân cách dấu phẩy |
| `GATEWAY_PORTAL` | `true` bật portal prod (cẩn thận) |
| Rate limit vars | Xem [Best practices](../best-practices/) |
| Billing | Gommo VietQR mặc định không cần env thêm; PayOS legacy tùy chọn — xem [Billing](../guides/billing-credits.md) |

Template: `.env.example` ở root repo.

## CORS production

```env
GATEWAY_CORS_ORIGIN=https://app.example.com
```

Bỏ trống nếu chỉ server-side.

## Portal

| Môi trường | Mặc định |
|------------|----------|
| Dev | Bật `/portal/` |
| Production | Tắt |
| `GATEWAY_PORTAL=true` | Ép bật |

## Deploy docs

Static — không chạy trong process API.

Dev: VitePress proxy `/gateway`, `/ai`, `/billing` → `:3001`. Prod: **không có proxy** — cần biết URL API lúc **build**.

### `VITE_GATEWAY_URL` (bắt buộc cho docs production)

Set khi chạy `npm run docs:build`. Giá trị được bake vào bundle static.

| Tính năng | Dùng `VITE_GATEWAY_URL` |
|-----------|-------------------------|
| Catalog / compare | `GET /gateway/models` |
| Đăng nhập / đăng ký | `POST /gateway/auth/*` |
| Dashboard `/app/*` | `POST /ai/me`, `/billing/*` |
| Playground embed | `{API}/portal/playground.html?embed=1` |

**Dev** — không cần set; proxy VitePress trên `:5173`.

**Build production:**

```bash
VITE_GATEWAY_URL=https://api.yourdomain.com npm run docs:build
npm run docs:preview
```

Nếu không set, bundle fallback `https://api.yourdomain.com` — đổi trước khi ship.

#### GitHub Pages

Workflow `docs-pages.yml` đọc biến repo:

1. **Settings → Secrets and variables → Actions → Variables**
2. Thêm **`VITE_GATEWAY_URL`** = `https://api.yourdomain.com`
3. **Settings → Pages → Source:** GitHub Actions
4. CNAME `docs.yourdomain.com`

#### Vercel

1. Build `npm run docs:build` · output `docs/.vitepress/dist`
2. Env **Production:** `VITE_GATEWAY_URL=https://api.yourdomain.com`
3. Domain `docs.yourdomain.com`

#### API khi docs khác origin

| Biến API | Lý do |
|----------|-------|
| `GATEWAY_CORS_ORIGIN` | Thêm `https://docs.yourdomain.com` |
| `GATEWAY_PORTAL=true` | Bật playground embed trên `/app/playground/` |

```env
GATEWAY_CORS_ORIGIN=https://docs.yourdomain.com
GATEWAY_PORTAL=true
```

Local dev: `npm run docs:dev` → `:5173`.

## Checklist ops

- [ ] `/health` 200 + flags đúng
- [ ] Secrets trên platform
- [ ] **`VITE_GATEWAY_URL`** trên docs build (GitHub variable / Vercel env)
- [ ] **`GATEWAY_CORS_ORIGIN`** gồm origin docs
- [ ] **`GATEWAY_PORTAL=true`** nếu dùng playground embed prod
- [ ] Webhook PayOS HTTPS — **chỉ khi** dùng legacy `/billing/topup/*`
- [ ] Merchant buffer đủ credit

## Tiếp theo

→ [Best practices](../best-practices/) · [Privacy](../privacy/) · [Góp ý](../report-feedback.md)
