---
title: Best practices
description: รูปแบบการเชื่อมต่อ — polling, auth และพารามิเตอร์โมเดลบน Gommo
---

# Best practices

รูปแบบที่แนะนำสำหรับการเชื่อมต่อ **Gommo public API** ที่เชื่อถือได้

## 1. รายการโมเดลก่อน job เสมอ

ห้าม hard-code หรือเดา `ratio`, `mode`, `resolution` หรือ `duration`

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

ใช้ค่าจาก array ใน response ของ **โมเดลนั้น** ค่าผิดทำให้ upstream ปฏิเสธหรือผลลัพธ์ไม่ดี

→ [Models](../models/) · [Media jobs](../features/media-jobs.md)

## 2. Poll อย่างชัดเจน

| กลยุทธ์ | ใช้เมื่อ |
|---------|---------|
| Client poll `POST …/ai/jobs/{id}?media=…` | ทุกการเชื่อมต่อ direct — **3500 ms** × **80** สูงสุด |
| UI มี progress | poll loop เดียวกัน แสดงสถานะจาก response |
| Self-host `wait: true` | gateway JSON ทางเลือก — HTTP round-trip เดียว |

Gommo **ไม่ webhook** เมื่องานเสร็จโดยค่าเริ่มต้น วางแผน timeout และทาง retry ให้ผู้ใช้

## 3. ใช้ public API โดยตรงเป็นหลัก

เรียก **`v2.api.gommo.net`** และ **`api.gommo.net`** จาก backend หรือ client ที่เชื่อถือได้ self-host [AI Gateway](../routing/integration-modes.md) เฉพาะเมื่อต้องการ portal billing, BYOK หรือ JSON REST wrapper

## 4. เก็บ secrets บน server

| ทำ | ห้าม |
|----|------|
| Login จาก backend หรือใช้ user token อายุสั้น | ส่ง `GOMMO_ACCESS_TOKEN` ไป browser |
| เก็บ merchant keys ใน deploy secrets เท่านั้น | Commit `.env` |
| ใช้ user Bearer สำหรับ generation | Expose admin keys ใน frontend |

→ [Privacy & security](../privacy/)

## 5. CORS เมื่อ browser เรียก Gommo cross-origin

browser เรียก `v2.api.gommo.net` โดยตรงต้องการ CORS policy ของ Gommo รูปแบบทั่วไป: **backend ของคุณ** proxy user token ไป Gommo

[Playground](/th/app/playground/) same-origin ใช้ site proxy สำหรับความสะดวกใน dev

## 6. Chat: ส่ง messages เสมอ

upstream ต้องการ `messages` ไม่ว่างสำหรับ chat:

```
POST https://api.gommo.net/api/v2/chat
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action=chat&query=Hello&messages=[…]
```

สำหรับ streaming ใช้ `action=stream` และ consume SSE

→ [Chat](../features/chat.md)

## 7. Upload ก่อน job เมื่อจำเป็น

flow image-to-video และแก้ไข:

1. `POST https://v2.api.gommo.net/ai/upload/image` (หรือ video) → ได้ URL
2. ส่ง URL ใน job form (ชื่อฟิลด์จากแคตตาล็อกโมเดล)
3. สร้างงานและ poll

## 8. จัดการข้อผิดพลาด upstream

ตรวจ `success`, `message` และ HTTP status ไม่ retry credential เดิมเมื่อ auth ล้มเหลว

| อาการ | การดำเนินการทั่วไป |
|-------|-------------------|
| Token / domain errors | Login ใหม่ ตรวจโดเมนลงทะเบียน |
| Validation | แก้ form fields จากแคตตาล็อก |
| Insufficient credits | Top up ผ่าน platform payment |
| Rate limit | Back off |

## 9. แยก billing จาก generation

เติมเครดิตใช้ endpoint payment บน **`api.gommo.net`** site docs อาจ expose `/billing/*` เมื่อ self-host — ดู [Billing & เครดิต](../guides/billing-credits.md)

## 10. ทดสอบด้วย playground ก่อน

[/th/app/playground/](/th/app/playground/) — แท็บ **Endpoints** แสดง URL public ฉบับเต็มต่อการดำเนินการ

จากนั้น integrate จากแอปด้วย token flow เดียวกับ [เริ่มต้นใช้งาน](../quickstart.md)

## ถัดไป

→ [หลักการ](../principles.md) · [Privacy](../privacy/) · [FAQ](../faq.md)
