# AI Studio (Web)

User-facing app — Vite + React 19 + TypeScript + Tailwind + shadcn-style UI.

Backend: **ai-gateway** tại `VITE_API_BASE_URL`.

## Chạy local

**Terminal 1 — API gateway**

```bash
cd ../..   # repo root ai-gateway
cp .env.example .env   # nếu chưa có
npm run dev            # http://localhost:3001
```

Thêm CORS cho web app (`.env` root):

```env
GATEWAY_CORS_ORIGIN=http://localhost:5173
```

**Terminal 2 — Web app**

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

Hoặc từ repo root: `npm run web:dev`

## Env

| Variable | Default | Mô tả |
|----------|---------|--------|
| `VITE_API_BASE_URL` | `http://localhost:3001` | ai-gateway |
| `VITE_GOMMO_DOMAIN` | `vmedia.ai` | Domain login proxy |

**Không** đặt `GOMMO_ACCESS_TOKEN` hay `ADMIN_API_KEY` trong web app.

## Pages (MVP)

- `/` Landing
- `/login` — proxy login
- `/app` Home (credits)
- `/app/image` Image Studio (`POST /gateway/jobs/image`)
- `/app/video` Video Studio (`POST /gateway/jobs/video`)
- `/app/chat` Chat (stream / non-stream via `/gateway/chat`)
- `/app/audio` TTS (`POST /gateway/audio/tts`)
- `/app/wallet` Nạp credit Gommo VietQR (`POST /billing/payment/create`)

OpenAI-compatible chat: dùng `POST /v1/chat/completions` trực tiếp từ SDK/script (không qua web UI).

## Build

```bash
npm run build
npm run preview
```
