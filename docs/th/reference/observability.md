---
title: Observability (beta)
description: Usage hub, local mirror และ outbound job webhooks — ขอบเขตและข้อจำกัดปัจจุบัน
---

# Observability (beta)

::: warning Beta
Observability **ยังไม่พร้อม production เต็มรูปแบบ** ใช้สำหรับ dev, staging หรือ self-hosted gateway ที่ยอมรับข้อจำกัดด้านล่าง พฤติกรรมอาจเปลี่ยนโดยไม่ bump major version
:::

หน้าแอป **Observability** (`/app/observability/`) เป็นศูนย์กลางสำหรับ:

| พื้นที่ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| Gommo usage stats & logs | **Stable** | ข้อมูลเดียวกับ Profile → Usage / Logs ผ่าน `/gateway/usage/*` |
| Local session mirror | **Beta** | Browser `localStorage` เท่านั้น (Playground / Chat) |
| Outbound webhooks | **Beta** | Gateway → HTTPS URL ของคุณเมื่อเกิด job events ที่เลือก |
| Langfuse, OTEL, Datadog, Sentry | **ยังไม่มี** | แสดง "Coming soon" ใน UI |

Gommo upstream **ยังไม่** push job completion Gateway webhooks เป็น **ส่วนเสริมทางเลือก** บน gateway REST — **ไม่**แทน `wait: true` หรือ client polling สำหรับ media jobs แบบ async

## สิ่งที่ใช้ได้วันนี้

### Usage & logs (stable)

สถิติรวมและแถวต่อ job จาก Gommo `usage-history` wrap ที่:

- `GET` / `POST` `/gateway/usage/stats`
- `GET` / `POST` `/gateway/usage/logs`

ดู [Usage history](./usage.md)

### Local session mirror (beta)

เมื่อเปิดในหน้า Observability Playground และ Chat จะ append แถว job เบาๆ ไป **localStorage ของ browser นี้** ไม่ส่งไป webhook endpoints หรือ server-side log store

### Outbound webhooks (beta)

ลงทะเบียนได้สูงสุด **5** HTTPS endpoints ต่อบัญชี (default) gateway POST JSON เมื่อ:

| Trigger | Event | เมื่อ |
|---------|-------|------|
| `POST /gateway/jobs/{type}` พร้อม **`wait: true`** | `job.completed` หรือ `job.failed` | หลัง gateway poll เสร็จ (~3.5s × สูงสุด 80 ครั้ง) |
| `POST /gateway/jobs/{type}` พร้อม **`wait: false`** | `job.completed` หรือ `job.failed` | **ทันที** เมื่อ create response มี result URL; **background poll** (~3.5s × สูงสุด 80) เมื่อ async และบัญชีมี job webhooks (`background: true` ใน payload) |
| `POST /gateway/observability/webhooks/{id}/test` | `webhook.test` | ทดสอบจาก UI หรือ API |

ค่า `{type}` ที่รองรับตรงกับ [Media & jobs](./media.md) (`image`, `video`, `tts`, `music`, `avatar-lipsync`, tool types ฯลฯ)

**ยังไม่ครอบคลุม (ไม่มี webhook วันนี้):**

- `wait: false` async jobs เมื่อบัญชี **ไม่มี** job webhooks (ไม่มี background poll)
- Chat (`/gateway/chat/*`, BYOK chat)
- Audio routes, upload-only, raw `/v2` หรือ `/ai` proxy traffic
- Billing, credits, login events

**Delivery semantics:**

- **Retry** เมื่อ network error และ non-2xx — default **3 ครั้ง** (`OBSERVABILITY_DELIVERY_RETRY_COUNT=2` retry หลังครั้งแรก, linear backoff ผ่าน `OBSERVABILITY_DELIVERY_RETRY_DELAY_MS`)
- Timeout 10s ต่อครั้ง (ตั้งผ่าน `OBSERVABILITY_DELIVERY_TIMEOUT_MS`)
- Webhook config เก็บใน **local JSON file** บน gateway host (`data/observability-webhooks.json`) — ไม่ replicate หลาย gateway instance ยกเว้นแชร์ไฟล์
- Background poll queue สำหรับ `wait=false` async jobs persist ที่ `data/observability-background-polls.json` (encrypt user token at rest — key material เดียวกับ BYOK); resume หลัง restart gateway
- ต้อง HTTPS; `http://` อนุญาตเฉพาะ `localhost` / `127.0.0.1` (dev)

## Webhook management API

Route ทั้งหมดต้อง `Authorization: Bearer` (token ผู้ใช้เดียวกับ `/gateway/*`)

| Method | Path | Body |
|--------|------|------|
| GET | `/gateway/observability/webhooks` | — |
| POST | `/gateway/observability/webhooks` | `{ "url", "label?", "secret?" }` |
| PATCH | `/gateway/observability/webhooks/{id}` | `{ "enabled?", "label?" }` |
| DELETE | `/gateway/observability/webhooks/{id}` | — |
| POST | `/gateway/observability/webhooks/{id}/test` | — |

### ตัวอย่าง create

```bash
curl.exe -X POST "http://localhost:3001/gateway/observability/webhooks" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://example.com/hooks/gateway\",\"label\":\"staging\",\"secret\":\"whsec_...\"}"
```

Secrets encrypt at rest บน gateway (crypto เดียวกับ BYOK) API ไม่คืน secret ดิบ — เฉพาะ hint เช่น `whsec_…ab12`

## Event payload

`POST` ไป URL ของคุณพร้อม JSON body:

```json
{
  "type": "job.completed",
  "timestamp": "2026-09-12T02:00:00.000Z",
  "data": {
    "jobType": "image",
    "modelSlug": "flux-schnell",
    "jobId": "abc123",
    "resultUrl": "https://…",
    "coverUrl": "https://…",
    "status": "success",
    "background": false
  }
}
```

`job.failed` มี `status: "failed"` และ optional `error` Background delivery สำหรับ async `wait: false` ตั้ง `background: true`

Headers:

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `User-Agent` | `ai-gateway-observability/1.0` |
| `X-Gateway-Event` | Event type (`job.completed`, `job.failed`, `webhook.test`) |
| `X-Gateway-Timestamp` | ISO timestamp เดียวกับ body |
| `X-Gateway-Signature` | HMAC-SHA256 hex ของ `{timestamp}.{rawBody}` เมื่อตั้ง signing secret |

Verify ที่ receiver:

```text
expected = HMAC_SHA256(secret, timestamp + "." + rawRequestBody)
```

เทียบกับ `X-Gateway-Signature` ด้วย constant-time compare

## Environment

| Variable | Default |
|----------|---------|
| `OBSERVABILITY_STORE_FILE` | `data/observability-webhooks.json` |
| `OBSERVABILITY_MAX_WEBHOOKS` | `5` |
| `OBSERVABILITY_DELIVERY_TIMEOUT_MS` | `10000` |
| `OBSERVABILITY_BACKGROUND_POLL` | `true` — server poll สำหรับ `wait: false` async jobs เมื่อ owner มี webhooks |

## รูปแบบ integration ที่แนะนำ

สำหรับการแจ้ง job ที่เชื่อถือได้ใน production **วันนี้**:

1. ใช้ **`wait: true`** บน `POST /gateway/jobs/{type}` และจัดการ HTTP response **หรือ**
2. Poll job status ที่ client (interval 3.5s, ~80 ครั้ง) ตาม [integration modes](../routing/integration-modes.md) **และทางเลือก**
3. เพิ่ม beta webhook เป็น **สัญญาณรอง** — รวม background delivery สำหรับ `wait: false` เมื่อตั้ง webhooks

Background delivery retry webhook POST (ตั้งค่าได้) และ persist async poll jobs ลง disk (single-instance file store) สำหรับ flow สำคัญใน production ใช้ `wait: true` หรือ client poll

## UI

จัดการ webhooks ที่ [Observability](/app/observability/) (sidebar **Developer → Observability**, badge **beta**) callout ในหน้าสรุปข้อจำกัดเดียวกัน

### Automated background verify (live)

ต้อง gateway ทำงาน, Bearer token ผู้ใช้ และ credits สำหรับ image job เล็กหนึ่งครั้ง:

```bash
# .env: OBSERVABILITY_VERIFY_TOKEN=<access_token from /ai/login>
# (หรือ GATEWAY_VERIFY_TOKEN / BILLING_VERIFY_TOKEN)
npm run observability:verify-background
```

Script:

1. เริ่ม local HTTP receiver บน `127.0.0.1`
2. ลงทะเบียน webhook ชี้ไปที่นั้น
3. สร้าง `POST /gateway/jobs/image` พร้อม `wait: false`
4. รอ `job.completed` หรือ `job.failed` พร้อม `data.background: true`
5. ลบ webhook

Exit **SKIP** ถ้าโมเดลคืนผลทันที (sync path) เลือก `ratio` / `resolution` / `mode` จาก catalog (ไม่เดา) Optional env: `OBSERVABILITY_VERIFY_GATEWAY_URL`, `OBSERVABILITY_VERIFY_MODEL_SLUG`, `OBSERVABILITY_VERIFY_TIMEOUT_MS` (default 6 นาที)

### Smoke test checklist

Manual (login, `npm run docs:stack`):

- [ ] Stat cards ลิงก์ไป Activity Trends, Explore และ Credits
- [ ] Add webhook → ข้อความสำเร็จ; count แสดง `n/5`
- [ ] **Test** → ข้อความสำเร็จ; delivery badge อัปเดต OK หรือ Error
- [ ] **Delete** → confirm dialog; webhook ถูกลบ
- [ ] ขยาย **Example payload** → **Copy JSON** ทำงาน
- [ ] ที่ 5 webhooks → form ปิดพร้อม hint ขีดจำกัด
- [ ] Optional live: `npm run observability:verify-background` (ด้านบน)

ดู [Usage history](./usage.md) และ [Media & jobs](./media.md)
