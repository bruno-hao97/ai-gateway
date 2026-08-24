# Docs Portal

Landing + API playground, served từ Express tại **`/portal`** (dev).

## Chạy local

```bash
# API + portal (1 port)
npm run dev
# → http://localhost:3001/portal/
# → http://localhost:3001/portal/playground.html

# Chỉ khi viết/sửa markdown docs
npm run docs:dev
# → http://localhost:5173
```

Playground mặc định gọi API **cùng origin** — không cần `GATEWAY_CORS_ORIGIN`.

## Production

Portal **tắt mặc định** khi `NODE_ENV=production`. Bật tạm: `GATEWAY_PORTAL=true` (không khuyến nghị public).

Docs deploy riêng: `npm run docs:build` → static host.

## Fallback (tùy chọn)

Nếu không chạy Express, serve folder này riêng:

```bash
npm run portal:dev   # http://localhost:5174 — cần CORS trên API
```
