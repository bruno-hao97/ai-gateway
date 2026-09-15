---
title: Deploy & ops
description: Docker, Railway, Fly.io, health checks และการตั้งค่า production
---

# Deploy & ops

รัน AI Gateway เป็น API service เดียว Docs (VitePress) และ dev portal deploy แยก

## โครงสร้างที่แนะนำ

| Service | Domain | วิธี |
|---------|--------|------|
| **API** | `api.yourdomain.com` | Docker / Railway / Fly |
| **Docs** | `docs.yourdomain.com` | VitePress static — Vercel หรือ GitHub Pages |
| **Portal** | `/portal/` บน API (dev เท่านั้น) | ปิดใน prod ยกเว้น `GATEWAY_PORTAL=true` |

**ห้าม commit** `.env`, `GOMMO_ACCESS_TOKEN` หรือ `ADMIN_API_KEY` — ใช้ platform secrets

## พัฒนาในเครื่อง

```bash
cp .env.example .env
npm install
npm run dev            # API :3001
npm run docs:dev       # Docs :5173
```

Portal static (ทางเลือก): `npm run portal:dev` → `:5180`

ตรวจสอบ:

```bash
curl http://localhost:3001/health
```

## Health check

```http
GET /health
```

ตัวอย่าง response:

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

ใช้ `/health` สำหรับ Railway, Fly, Kubernetes และ load balancer probes

ตั้งค่า platform:

| Platform | การตั้งค่า |
|----------|-----------|
| Railway | Health check path `/health` |
| Fly.io | HTTP check ใน `fly.toml` → `GET /health` |
| Docker / k8s | Liveness probe บน `/health` |

## Docker

```bash
docker build -t ai-gateway .
docker run --rm -p 3001:3001 --env-file .env ai-gateway
```

Image รัน `node dist/index.js` หลัง `npm run build` Platform inject `PORT` — gateway อ่าน `process.env.PORT`

## Railway

1. New project → **Deploy from GitHub**
2. Railway detect `Dockerfile` หรือ Nixpacks (`npm run build`, `npm start`)
3. **Variables:** คัดลอกจาก `.env.example` — อย่างน้อย `GOMMO_API_DOMAIN`, `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`
4. **Custom domain:** `api.yourdomain.com` → CNAME ไป Railway URL
5. **Health check:** `/health`

## Fly.io

```bash
fly launch --no-deploy
fly secrets set GOMMO_ACCESS_TOKEN=... ADMIN_API_KEY=... GOMMO_API_DOMAIN=79ai.net
fly secrets set GATEWAY_CORS_ORIGIN=https://your-frontend.example.com
fly deploy
fly certs add api.yourdomain.com
```

`fly.toml` มี HTTP check บน `GET /health`

## Production environment

| Variable | วัตถุประสงค์ |
|----------|-------------|
| `PORT` | Inject โดย platform (3001 ในเครื่อง) |
| `NODE_ENV` | `production` — ปิด portal โดย default |
| `GOMMO_API_DOMAIN` | Domain ลงทะเบียน (default `79ai.net`) |
| `GOMMO_ACCESS_TOKEN` | Merchant — server เท่านั้น |
| `ADMIN_API_KEY` | ป้องกัน `/admin/*` |
| `GATEWAY_CORS_ORIGIN` | Browser origins คั่นด้วย comma |
| `GATEWAY_PORTAL` | `true` เปิด `/portal` ใน prod (ใช้ด้วยความระมัดระวัง) |
| `GATEWAY_RATE_LIMIT_MAX` | Default 120/min/IP สำหรับ `/gateway` |
| `ADMIN_RATE_LIMIT_MAX` | Default 30/min/IP สำหรับ `/admin` |
| `BILLING_RATE_LIMIT_MAX` | Default 60/min/IP สำหรับ `/billing` |
| Billing | Gommo VietQR default ไม่ต้อง env เพิ่ม; PayOS legacy ทางเลือก — ดู [Billing](../guides/billing-credits.md) |
| `BYOK_ENCRYPTION_KEY` | **จำเป็น** เมื่อ `BYOK_ENABLED` และ `NODE_ENV=production` — `npm run byok:generate-key` |
| `BYOK_STORE_FILE` | Persistent volume — ดู [BYOK production](../guides/byok-production.md) |

เทมเพลตเต็ม: `.env.example` ที่ root repo

## CORS ใน production

ตั้งเมื่อ browser client เรียกจาก origin อื่น:

```env
GATEWAY_CORS_ORIGIN=https://app.example.com,https://www.example.com
```

ไม่ตั้งสำหรับ integration แบบ API-only (server-side)

## พฤติกรรม Portal

| Environment | Default |
|-------------|---------|
| `NODE_ENV !== production` | Portal **เปิด** ที่ `/portal/` |
| Production | Portal **ปิด** |
| `GATEWAY_PORTAL=true` | บังคับเปิด |
| `GATEWAY_PORTAL=false` | บังคับปิด |

## Error monitoring

REST routes คืน structured errors:

```json
{ "success": false, "message": "…", "code": "UPSTREAM_ERROR" }
```

Log `code` + path สำหรับ alerts Upstream 502 จาก proxy บ่งชี้ปัญหา connectivity Gommo

## Deploy docs

Docs เป็น **static** — ไม่ serve โดย API process ใน production

ใน dev VitePress proxy `/gateway`, `/ai` และ `/billing` ไป `:3001` ใน production ไม่มี proxy — site ต้องรู้ API URL ตอน **build**

### `VITE_GATEWAY_URL` (จำเป็นสำหรับ production docs)

ตั้งเมื่อรัน `npm run docs:build` ฝังใน static bundle (ไม่ใช่ runtime secret)

| Feature | ใช้ `VITE_GATEWAY_URL` |
|---------|------------------------|
| Models catalog / compare | `GET /gateway/models` |
| Sign in / sign up | `POST /gateway/auth/*` |
| Dashboard `/app/*` | `POST /ai/me`, `/billing/*` |
| Playground embed | `{API}/portal/playground.html?embed=1` (iframe + postMessage) |

**Dev** — ไม่ตั้ง; VitePress proxy จัดการ API บน `:5173`

**Production build:**

```bash
VITE_GATEWAY_URL=https://api.yourdomain.com npm run docs:build
npm run docs:preview   # optional — serve dist ในเครื่อง
```

ถ้าไม่ตั้งตอน build bundle fallback เป็น `https://api.yourdomain.com` — แทนที่ placeholder ก่อน ship

#### GitHub Pages

Workflow [`.github/workflows/docs-pages.yml`](../../.github/workflows/docs-pages.yml) ส่ง `VITE_GATEWAY_URL` จาก repository variable:

1. Repo **Settings → Secrets and variables → Actions → Variables**
2. เพิ่ม **`VITE_GATEWAY_URL`** = `https://api.yourdomain.com` (ไม่มี slash ท้าย)
3. **Settings → Pages → Source:** GitHub Actions
4. CNAME `docs.yourdomain.com` ใน DNS

Push ไป `main` (paths ใต้ `docs/**`) trigger build + deploy

#### Vercel

1. Import repo บน Vercel
2. Build: `npm run docs:build` · Output: `docs/.vitepress/dist` (ดู `vercel.json`)
3. **Environment variables:** `VITE_GATEWAY_URL` = `https://api.yourdomain.com` (Production)
4. Custom domain: `docs.yourdomain.com`

#### ฝั่ง API เมื่อ docs อยู่ origin อื่น

| API variable | เหตุผล |
|--------------|--------|
| `GATEWAY_CORS_ORIGIN` | รวม `https://docs.yourdomain.com` — browser เรียกจาก catalog, login, `/app/` |
| `GATEWAY_PORTAL=true` | เปิด `/portal/playground.html` สำหรับ embedded playground บน `/app/playground/` |

ตัวอย่าง:

```env
GATEWAY_CORS_ORIGIN=https://docs.yourdomain.com
GATEWAY_PORTAL=true
```

Preview ในเครื่อง (dev server hot reload): `npm run docs:dev` → `:5173`

## Ops checklist

- [ ] `GET /health` คืน 200 พร้อม flags ที่คาดหวัง
- [ ] Secrets ตั้งบน platform (ไม่ใน git)
- [ ] **`VITE_GATEWAY_URL`** ตั้งตอน build docs (GitHub variable หรือ Vercel env)
- [ ] **`GATEWAY_CORS_ORIGIN`** รวม docs origin (`https://docs.…`)
- [ ] **`GATEWAY_PORTAL=true`** ถ้าใช้ embed `/app/playground/` ใน prod
- [ ] PayOS webhook URL ลงทะเบียน (HTTPS) — **เฉพาะ** legacy `/billing/topup/*`
- [ ] Merchant buffer credits พอสำหรับ fulfillment topup
- [ ] Rate limits เหมาะกับ traffic

## ขั้นตอนถัดไป

→ [Best practices](../best-practices/) · [Privacy](../privacy/) · [Report feedback](../report-feedback.md)
