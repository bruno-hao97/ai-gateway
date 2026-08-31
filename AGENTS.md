# AGENTS.md — ai-gateway

## Stack
- BE: Express TypeScript — AI gateway proxy + REST wrap (OpenRouter-style API platform)
- Upstream: Gommo (`v2.api.gommo.net` + `api.gommo.net`)
- Spec: `doc/GOMMO-GATEWAY.md` — đọc trước khi thêm endpoint
- Dev UI: `/portal` (docs-portal), developer docs VitePress `:5173`

## Dev
- `npm run dev` — API :3001 (+ `/portal/` khi dev)
- `npm run docs:dev` — VitePress :5173
- `GATEWAY_CORS_ORIGIN` — chỉ khi browser client khác origin (optional cho API-only)

## Proxy (implement trước)
Mount `/v2`, `/ai`, `/api/v2`, `/api/apps/go-mmo` — chi tiết §2 trong spec.
Raw body 50MB. Stream pipe khi URL có `/chat` hoặc `text/event-stream`.

## Thứ tự build
1. Proxy + `GET /health`
2. Login + `/ai/me` (test qua proxy)
3. Models + create job + poll
4. Upload, chat, audio
5. Merchant sendBalances (server-only, nếu cần)

## Rule Gommo
1. Không đoán `ratio` / `mode` / `resolution` / `duration` — lấy từ models list
2. Job async: poll 3.5s, max 80 lần — Gommo không webhook
3. V2 jobs: header `Authorization: Bearer`; platform: form `access_token` (+ Bearer cho `/api/v2`)
4. Mọi call upstream cần `domain` — gateway REST tự điền từ `GOMMO_API_DOMAIN` (default `79ai.net`); merchant token chỉ server
5. Sau `sendBalances`, merchant phải còn > 500.000 credits

## Env
Xem `.env.example`. Không commit `.env` / `GOMMO_ACCESS_TOKEN`.

## Catalog EN (`?lang=en`)
- Cache file: `cache/catalog-descriptions.en.json` — docs + portal + `GET /gateway/models?lang=en`
- Warm offline: `npm run catalog:translate` (dùng **Gommo chat** + `GOMMO_ACCESS_TOKEN`, không cần OpenRouter)
- Runtime mặc định **chỉ đọc cache** (`CATALOG_TRANSLATE_ON_REQUEST` không set hoặc `false`)

## Không làm
- Copy FE site-ai (studio, workflow)
- Nhầm Cursor MCP `gommo_*` với HTTP gateway runtime
- Expose merchant token ra browser
- Gắn PayOS billing vào `/gateway` — dùng `/billing/*` (Gommo: `/billing/payment/*`)
