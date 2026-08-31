---
title: Deploy & ops
description: Docker, Railway, Fly.io, health checks, and production configuration
---

# Deploy & ops

Run AI Gateway as a single API service. Docs (VitePress) and the dev portal deploy separately.

## Suggested layout

| Service | Domain | How |
|---------|--------|-----|
| **API** | `api.yourdomain.com` | Docker / Railway / Fly |
| **Docs** | `docs.yourdomain.com` | VitePress static — Vercel or GitHub Pages |
| **Portal** | `/portal/` on API (dev only) | Off in prod unless `GATEWAY_PORTAL=true` |

**Never commit** `.env`, `GOMMO_ACCESS_TOKEN`, or `ADMIN_API_KEY` — use platform secrets.

## Local development

```bash
cp .env.example .env
npm install
npm run dev            # API :3001
npm run docs:dev       # Docs :5173
```

Optional portal static serve: `npm run portal:dev` → `:5180`.

Verify:

```bash
curl http://localhost:3001/health
```

## Health check

```http
GET /health
```

Example response:

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

Use `/health` for Railway, Fly, Kubernetes, and load balancer probes.

Configure platforms:

| Platform | Setting |
|----------|---------|
| Railway | Health check path `/health` |
| Fly.io | HTTP check in `fly.toml` → `GET /health` |
| Docker / k8s | Liveness probe on `/health` |

## Docker

```bash
docker build -t ai-gateway .
docker run --rm -p 3001:3001 --env-file .env ai-gateway
```

Image runs `node dist/index.js` after `npm run build`. Platform injects `PORT` — gateway reads `process.env.PORT`.

## Railway

1. New project → **Deploy from GitHub**.
2. Railway detects `Dockerfile` or Nixpacks (`npm run build`, `npm start`).
3. **Variables:** copy from `.env.example` — at minimum `GOMMO_API_DOMAIN`, `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`.
4. **Custom domain:** `api.yourdomain.com` → CNAME to Railway URL.
5. **Health check:** `/health`.

## Fly.io

```bash
fly launch --no-deploy
fly secrets set GOMMO_ACCESS_TOKEN=... ADMIN_API_KEY=... GOMMO_API_DOMAIN=79ai.net
fly secrets set GATEWAY_CORS_ORIGIN=https://your-frontend.example.com
fly deploy
fly certs add api.yourdomain.com
```

`fly.toml` includes HTTP check on `GET /health`.

## Production environment

| Variable | Purpose |
|----------|---------|
| `PORT` | Injected by platform (3001 locally) |
| `NODE_ENV` | `production` — disables portal by default |
| `GOMMO_API_DOMAIN` | Registration domain (default `79ai.net`) |
| `GOMMO_ACCESS_TOKEN` | Merchant — server only |
| `ADMIN_API_KEY` | Protects `/admin/*` |
| `GATEWAY_CORS_ORIGIN` | Comma-separated browser origins |
| `GATEWAY_PORTAL` | `true` to enable `/portal` in prod (use with care) |
| `GATEWAY_RATE_LIMIT_MAX` | Default 120/min/IP for `/gateway` |
| `ADMIN_RATE_LIMIT_MAX` | Default 30/min/IP for `/admin` |
| `BILLING_RATE_LIMIT_MAX` | Default 60/min/IP for `/billing` |
| Billing | Default Gommo VietQR needs no extra env; optional PayOS legacy — see [Billing](../guides/billing-credits.md) |

Full template: `.env.example` in repo root.

## CORS in production

Set when browser clients call from a different origin:

```env
GATEWAY_CORS_ORIGIN=https://app.example.com,https://www.example.com
```

Leave unset for API-only (server-side) integrations.

## Portal behavior

| Environment | Default |
|-------------|---------|
| `NODE_ENV !== production` | Portal **on** at `/portal/` |
| Production | Portal **off** |
| `GATEWAY_PORTAL=true` | Force on |
| `GATEWAY_PORTAL=false` | Force off |

## Error monitoring

REST routes return structured errors:

```json
{ "success": false, "message": "…", "code": "UPSTREAM_ERROR" }
```

Log `code` + path for alerts. Upstream 502 from proxy indicates Gommo connectivity issues.

## Docs deploy

Docs are **static** — not served by the API process in production.

In dev, VitePress proxies `/gateway`, `/ai`, and `/billing` to `:3001`. In production there is no proxy — the site must know your API URL at **build time**.

### `VITE_GATEWAY_URL` (required for production docs)

Set this when running `npm run docs:build`. It is embedded into the static bundle (not a runtime secret).

| Feature | Uses `VITE_GATEWAY_URL` |
|---------|-------------------------|
| Models catalog / compare | `GET /gateway/models` |
| Sign in / sign up | `POST /gateway/auth/*` |
| Dashboard `/app/*` | `POST /ai/me`, `/billing/*` |
| Playground embed | `{API}/portal/playground.html?embed=1` (iframe + postMessage) |

**Dev** — leave unset; VitePress proxy handles API calls on `:5173`.

**Production build:**

```bash
VITE_GATEWAY_URL=https://api.yourdomain.com npm run docs:build
npm run docs:preview   # optional — serve dist locally
```

If unset at build time, the bundle falls back to `https://api.yourdomain.com` — replace that placeholder before shipping.

#### GitHub Pages

Workflow [`.github/workflows/docs-pages.yml`](../../.github/workflows/docs-pages.yml) passes `VITE_GATEWAY_URL` from a repository variable:

1. Repo **Settings → Secrets and variables → Actions → Variables**
2. Add **`VITE_GATEWAY_URL`** = `https://api.yourdomain.com` (no trailing slash)
3. **Settings → Pages → Source:** GitHub Actions
4. CNAME `docs.yourdomain.com` in DNS

Push to `main` (paths under `docs/**`) triggers build + deploy.

#### Vercel

1. Import repo on Vercel.
2. Build: `npm run docs:build` · Output: `docs/.vitepress/dist` (see `vercel.json`)
3. **Environment variables:** `VITE_GATEWAY_URL` = `https://api.yourdomain.com` (Production)
4. Custom domain: `docs.yourdomain.com`

#### API side when docs are on another origin

| API variable | Why |
|--------------|-----|
| `GATEWAY_CORS_ORIGIN` | Include `https://docs.yourdomain.com` — browser calls from catalog, login, `/app/` |
| `GATEWAY_PORTAL=true` | Enable `/portal/playground.html` for the embedded playground on `/app/playground/` |

Example:

```env
GATEWAY_CORS_ORIGIN=https://docs.yourdomain.com
GATEWAY_PORTAL=true
```

Local preview (dev server with hot reload): `npm run docs:dev` → `:5173`.

## Ops checklist

- [ ] `GET /health` returns 200 with expected flags
- [ ] Secrets set on platform (not in git)
- [ ] **`VITE_GATEWAY_URL`** set on docs build (GitHub variable or Vercel env)
- [ ] **`GATEWAY_CORS_ORIGIN`** includes docs origin (`https://docs.…`)
- [ ] **`GATEWAY_PORTAL=true`** if using `/app/playground/` embed in prod
- [ ] PayOS webhook URL registered (HTTPS) — **only if** using legacy `/billing/topup/*`
- [ ] Merchant buffer credits sufficient for topup fulfillment
- [ ] Rate limits appropriate for traffic

## Next

→ [Best practices](../best-practices/) · [Privacy](../privacy/) · [Report feedback](../report-feedback.md)
