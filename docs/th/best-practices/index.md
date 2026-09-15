---
title: Best practices
description: รูปแบบ integration — polling, CORS, rate limits และพารามิเตอร์โมเดล
---

# Best practices

รูปแบบที่แนะนำสำหรับ integration AI Gateway ที่เชื่อถือได้ — สรุปจากพฤติกรรม upstream Gommo และการออกแบบ gateway

## 1. รายการโมเดลก่อน job เสมอ

ห้าม hard-code หรือเดา `ratio`, `mode`, `resolution` หรือ `duration`

```http
GET /gateway/models?type=image
Authorization: Bearer {token}
```

ใช้ค่าจาก array ใน response ของ **โมเดลนั้น** ค่าผิดทำให้ upstream ปฏิเสธหรือผลลัพธ์ไม่ดี

→ [Models](../models/) · [Media jobs](../features/media-jobs.md)

## 2. เลือกกลยุทธ์ polling อย่างชัดเจน

| กลยุทธ์ | ใช้เมื่อ |
|---------|---------|
| `wait: true` ตอน create | Scripts, backend ง่าย, agents — HTTP round-trip เดียว |
| Client poll `GET /gateway/jobs/:id` | Job ยาว, UI มี progress bar, รองรับ cancel |
| Mode C / Direct | คุณ implement 3.5s × 80 ครั้ง (~5 นาทีสูงสุด) |

Gommo **ไม่ webhook** เมื่อ job เสร็จ วางแผน timeout และแสดงทาง retry ให้ผู้ใช้

Gateway poll default: interval **3500 ms**, สูงสุด **80** ครั้ง

## 3. ใช้ Mode B สำหรับ client ใหม่

เลือก `/gateway/*` JSON ยกเว้นมี Gommo FE legacy:

- Structured errors (`code`, `message`)
- `domain` inject จาก server (optional)
- Auth สม่ำเสมอ (`Authorization: Bearer`)

→ [Choosing a mode](../routing/choosing-a-mode.md)

## 4. เก็บ secrets บน server

| ทำ | ห้าม |
|----|------|
| Login จาก backend หรือใช้ user token อายุสั้น | ส่ง `GOMMO_ACCESS_TOKEN` ไป browser |
| เรียก `/admin` จาก cron/internal tools เท่านั้น | Expose `x-admin-key` ใน frontend |
| เก็บ PayOS keys ใน deploy secrets | Commit `.env` |

→ [Privacy & security](../privacy/)

## 5. CORS เฉพาะเมื่อจำเป็น

**ไม่ต้อง CORS สำหรับ:**

- Server-side clients (Node, Python, curl)
- Same-origin `/portal` playground (`localhost:3001/portal`)

**ตั้ง `GATEWAY_CORS_ORIGIN` เมื่อ:**

- Browser SPA บน origin อื่น (เช่น `https://app.example.com`)
- หลาย origin คั่นด้วย comma: `https://a.com,https://b.com`

`GATEWAY_CORS_ORIGIN` ว่าง = ไม่ mount CORS middleware — browser cross-origin จะล้มเหลว (ตาม design)

## 6. เคารพ rate limits

Default ต่อ IP (ตั้งผ่าน env):

| Scope | Default | Env |
|-------|---------|-----|
| `/gateway/*` | 120 req / min | `GATEWAY_RATE_LIMIT_MAX` |
| `/admin/*` | 30 req / min | `ADMIN_RATE_LIMIT_MAX` |
| `/billing/*` | 60 req / min | `BILLING_RATE_LIMIT_MAX` |
| Window | 60 s | `GATEWAY_RATE_LIMIT_WINDOW_MS` |

เมื่อ `429` response:

```json
{ "success": false, "message": "Too many requests", "code": "RATE_LIMITED" }
```

ใช้ exponential backoff ใน client; batch admin operations

## 7. Chat: ส่ง messages เสมอ

Upstream ต้องการ `messages` ไม่ว่างสำหรับ `action=chat`:

```json
{
  "action": "chat",
  "query": "Hello",
  "messages": [{ "role": "user", "text": "Hello" }]
}
```

สำหรับ streaming ใช้ `action=stream` และ consume SSE — ไม่ buffer response เต็มใน client ที่หันไป gateway

→ [Chat](../features/chat.md)

## 8. Upload ก่อน job เมื่อจำเป็น

Flow image-to-video และแก้ไข:

1. Upload → ได้ URL
2. ส่ง URL ใน `fields` ของ job (ชื่อฟิลด์จาก model catalog)
3. Create job พร้อม `wait` หรือ poll

เคารพขีด body **50 MB** บน proxy/upload routes

## 9. จัดการ errors สม่ำเสมอ

ตรวจ `success` และ `code` บน Mode B:

| Code | การดำเนินการทั่วไป |
|------|-------------------|
| `UNAUTHORIZED` | Refresh หรือ login ใหม่ |
| `VALIDATION_ERROR` | แก้ request body |
| `INSUFFICIENT_CREDITS` | แนะนำ topup หรือ admin send |
| `UPSTREAM_ERROR` | Retry พร้อม backoff; ตรวจสถานะ Gommo |
| `RATE_LIMITED` | Back off |
| `NOT_CONFIGURED` | แก้ server env (admin, merchant; PayOS เฉพาะ legacy topup) |

## 10. Health check ก่อน deploy

```bash
curl https://api.yourdomain.com/health
```

ตรวจ `merchantConfigured` และ `adminConfigured` ตรงความคาดหวังก่อนเปิด billing หรือ admin tools

## 11. แยก billing จาก generation

ใช้ `/billing/*` สำหรับเติม credits — **Gommo VietQR เป็น default** (`/billing/payment/*`) ไม่ใช่ `/gateway` PayOS legacy (`/billing/topup/*`) เป็นทางเลือก แยก payment flow จาก media/chat APIs

## 12. ทดสอบด้วย playground ก่อน

Dev same-origin หลีกเลี่ยงตั้ง CORS:

[/app/playground/](/app/playground/) — login บน docs site

จากนั้น integrate จากแอปด้วย token flow เดียวกับ [Quickstart](../quickstart.md)

## ขั้นตอนถัดไป

→ [Deploy & ops](../deploy/) · [Privacy](../privacy/) · [FAQ](../faq.md)
