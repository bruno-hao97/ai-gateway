# AI Gateway

Express TypeScript gateway for **[Gommo](https://gommo.net)** — transparent proxy + REST wrap + server-only merchant admin. Domain mặc định cấu hình qua `GOMMO_API_DOMAIN`.

## Features

- **Mode C — Proxy:** `/v2`, `/ai`, `/api/v2`, `/api/apps/go-mmo`
- **Mode B — REST:** `/gateway/*` (models, jobs, upload, chat, audio)
- **Admin:** `/admin/*` (merchant balance, sendBalances, register) — `x-admin-key`
- **Billing:** `/billing/*` (PayOS topup) — tách khỏi `/gateway`
- **Production:** CORS, rate limit, structured errors, Docker, health checks

## Quick start

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3001  (+ /portal/ in dev)
```

## Kiến trúc dev / prod

| Dev | Port | Prod |
|-----|------|------|
| **API** (+ `/portal` playground) | 3001 | `api.yourdomain.com` |
| **Developer docs** (VitePress) | 5173 | `docs.yourdomain.com` |

Playground (signed-in): **`/app/playground/`** on docs (`:5173`) — embeds `:3001/portal/playground.html`.

`GATEWAY_CORS_ORIGIN` — khi browser client khác origin (docs prod, `apps/web`, v.v.).

## Optional: `apps/web` (React)

React 19 + Tailwind — port **5175**.

```bash
npm run dev      # gateway
npm run web:dev  # :5175 — cần CORS nếu gọi API cross-origin
```

Chi tiết: [`apps/web/README.md`](./apps/web/README.md)

Developer docs: `npm run docs:dev` → port **5173**.

## Docs portal & playground

Gom vào Express — **`http://localhost:3001/portal/`** khi `npm run dev`:

- Landing + link docs / vmedia.ai
- Playground: `GET /gateway/models`, `POST /gateway/jobs/image` (token trong `sessionStorage`)

Docs khi **viết** vẫn tách: `npm run docs:dev` (port 5173, hot reload).

Production: portal tắt mặc định (`NODE_ENV=production`). Docs static deploy riêng.

```bash
npm run portal:dev   # optional fallback :5180 — static serve docs-portal
```

## Deploy

Suggested layout:

| Service | Domain | Repo path |
|---------|--------|-----------|
| **API** | `api.yourdomain.com` | Docker / Railway / Fly |
| **Docs** | `docs.yourdomain.com` | VitePress static → Vercel or GitHub Pages |

**Không commit** `.env`, `GOMMO_ACCESS_TOKEN`, hay `ADMIN_API_KEY` — set trên platform secrets.

### Docker (API)

```bash
docker build -t ai-gateway .
docker run --rm -p 3001:3001 --env-file .env ai-gateway
```

Image chạy `node dist/index.js` sau `npm run build`. Health: `GET /health`.

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

### Railway

1. New project → **Deploy from GitHub** (repo này).
2. Railway detect `Dockerfile` hoặc Nixpacks (`npm run build`, `npm start`).
3. **Variables** (Settings → Variables): copy từ `.env.example` — đặc biệt `GOMMO_API_DOMAIN`, `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`.
4. **Custom domain:** `api.yourdomain.com` → CNAME tới Railway URL.
5. **Health check path:** `/health`.

### Fly.io

```bash
fly launch --no-deploy    # dùng fly.toml có sẵn, đổi app name nếu cần
fly secrets set GOMMO_ACCESS_TOKEN=... ADMIN_API_KEY=... GOMMO_API_DOMAIN=79ai.net
fly secrets set GATEWAY_CORS_ORIGIN=https://your-frontend.example.com
fly deploy
fly certs add api.yourdomain.com
```

`fly.toml` đã cấu hình HTTP check `GET /health`.

### Production env (API)

| Variable | Mục đích |
|----------|----------|
| `PORT` | Platform inject (3001 local) |
| `GOMMO_API_DOMAIN` | Domain Gommo (default `79ai.net`) |
| `GOMMO_ACCESS_TOKEN` | Merchant token — server only |
| `ADMIN_API_KEY` | Bảo vệ `/admin/*` |
| `GATEWAY_CORS_ORIGIN` | Comma-separated browser origins (bật CORS) |
| `GATEWAY_RATE_LIMIT_MAX` | REST `/gateway` — default 120 req/min/IP |
| `ADMIN_RATE_LIMIT_MAX` | `/admin` — default 30 req/min/IP |

### Error format

REST `/gateway` và `/admin` trả lỗi thống nhất:

```json
{ "success": false, "message": "...", "code": "VALIDATION_ERROR" }
```

Codes: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_CONFIGURED`, `UPSTREAM_ERROR`, `RATE_LIMITED`, `INSUFFICIENT_CREDITS`, `INTERNAL_ERROR`.

### Docs — Vercel (`docs.yourdomain.com`)

1. Import repo trên [Vercel](https://vercel.com).
2. `vercel.json` đã set:
   - **Build:** `npm run docs:build`
   - **Output:** `docs/.vitepress/dist`
3. **Env (Production):** `VITE_GATEWAY_URL=https://api.yourdomain.com`
4. Add custom domain `docs.yourdomain.com`.

CLI:

```bash
VITE_GATEWAY_URL=https://api.yourdomain.com npm run docs:build
npx vercel --prod
```

### Docs — GitHub Pages

Workflow [`.github/workflows/docs-pages.yml`](./.github/workflows/docs-pages.yml) build + deploy khi push `main` (path `docs/**`).

1. Repo **Settings → Secrets and variables → Actions → Variables** → `VITE_GATEWAY_URL=https://api.yourdomain.com`
2. **Settings → Pages → Source:** GitHub Actions.
3. Custom domain `docs.yourdomain.com` (CNAME trong DNS).
4. API: `GATEWAY_CORS_ORIGIN` gồm docs origin; `GATEWAY_PORTAL=true` nếu dùng playground embed.

Chi tiết: [docs/deploy/](docs/deploy/index.md).

## Spec

Internal reverse-engineered spec: [`doc/GOMMO-GATEWAY.md`](./doc/GOMMO-GATEWAY.md)

Agent rules: [`AGENTS.md`](./AGENTS.md)

## Test scripts

| Script | Purpose |
|--------|---------|
| `scripts/test-image-job.ps1` | REST image job |
| `scripts/test-gateway.ps1` | Audio + chat |
| `scripts/test-admin.ps1` | Merchant balance |

## Env

See [`.env.example`](./.env.example). Never commit `.env` or expose `GOMMO_ACCESS_TOKEN`.
