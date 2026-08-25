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
| PayOS | [Billing](../guides/billing-credits.md) |

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

- **Vercel:** `npm run docs:build` → output `docs/.vitepress/dist`
- **GitHub Pages:** workflow `docs-pages.yml`

Local: `npm run docs:dev` → `:5173`.

## Checklist ops

- [ ] `/health` 200 + flags đúng
- [ ] Secrets trên platform
- [ ] CORS nếu SPA browser
- [ ] Webhook PayOS HTTPS
- [ ] Merchant buffer đủ credit
- [ ] Portal tắt prod (trừ khi cố ý)

## Tiếp theo

→ [Best practices](../best-practices/) · [Privacy](../privacy/) · [Góp ý](../report-feedback.md)
