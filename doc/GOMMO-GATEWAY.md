# GOMMO-GATEWAY.md

> **Nguồn:** reverse-engineer từ repo `site-ai` (đọc code 2026-08-20).  
> **Mục đích:** nền móng AI gateway — proxy + wrap REST Gommo.  
> **Billing:** Gommo VietQR tại `/billing/payment/*` (mặc định). PayOS legacy tại `/billing/topup/*` khi cấu hình `PAYOS_*`.

---

## 1. Upstream bases

| Biến env | Default (`server/config.ts`) | Host |
|----------|------------------------------|------|
| `GOMMO_API_BASE_URL` hoặc `GOMMO_BASE_URL` | `https://v2.api.gommo.net` | Jobs media V2 |
| `GOMMO_AUTH_BASE_URL` | `https://api.gommo.net` | Auth, chat, feed, audio |
| `GOMMO_AUTH_PATH` | `/api/apps/go-mmo` | Prefix auth app |
| `GOMMO_API_DOMAIN` | `79ai.net` | Field `domain` mọi request |

**Domain mặc định gateway:** `79ai.net` (`src/config.ts` → `GOMMO_API_DOMAIN`). REST `/gateway/*` tự điền nếu client không gửi `domain`.

---

## 2. Proxy gateway (bắt buộc implement trước)

Tham chiếu: `server/routes/gommoProxy.ts`

| Mount trên gateway | Upstream | Strip prefix |
|--------------------|----------|--------------|
| `/v2` | `GOMMO_API_BASE_URL` | Bỏ `/v2` |
| `/ai` | `GOMMO_AUTH_BASE_URL` | — |
| `/api/v2` | `GOMMO_AUTH_BASE_URL` | — |
| `/api/apps/go-mmo` (hoặc `GOMMO_AUTH_PATH`) | `GOMMO_AUTH_BASE_URL` | — |

**Hành vi:**
- Pass-through: giữ method, raw body, headers (bỏ hop-by-hop).
- Force upstream `accept-encoding: identity`.
- Body limit: `50mb` (`express.raw`).
- **Stream pipe** khi URL chứa `/chat` HOẶC `content-type: text/event-stream`.
- Lỗi proxy: `502 { success: false, message }`.

**Ví dụ map URL:**
- Client `POST /v2/ai/jobs/image/flux-dev` → `POST https://v2.api.gommo.net/ai/jobs/image/flux-dev`
- Client `POST /api/v2/chat` → `POST https://api.gommo.net/api/v2/chat`

---

## 3. Quy ước request/response

### 3.1 Envelope JSON (phổ biến)

```typescript
interface GommoEnvelope<T = Record<string, unknown>> {
  success?: boolean;
  data?: T;
  raw?: Record<string, unknown>;  // imageInfo, videoInfo, musicInfo, audioInfo
  message?: string;
}