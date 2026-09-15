---
title: หลักการ
description: หลักการออกแบบหลักของ AI Gateway
---

# หลักการ

หลักการหลักเมื่อสร้างบน AI Gateway — แพลตฟอร์ม **API** แบบ OpenRouter บน [Gommo](https://gommo.net) อ่านก่อนเลือก [โหมดการเชื่อมต่อ](./routing/integration-modes.md)

## ลำดับคำขอ

```
แอปของคุณ
  │
  ├─ Mode A (direct) ──► v2.api.gommo.net  (jobs · models · upload)
  │                   └─► api.gommo.net    (login · chat · audio)
  │
  └─ Mode B/C ──► AI Gateway (ทางเลือก)
                    ├─► v2.api.gommo.net
                    └─► api.gommo.net
```

## ทำไมต้อง AI Gateway?

Gommo มี **สอง upstream host** และหลายรูปแบบ auth (Bearer สำหรับ V2 jobs, form `access_token` สำหรับ platform API) AI Gateway ช่วยผู้ integrate:

- **API deploy ได้ชุดเดียว** — ซ่อน URL upstream รวม env และ secret
- **REST คาดเดาได้** — JSON in/out ข้อผิดพลาดมีโครงสร้าง poll ฝั่งเซิร์ฟเวอร์ทางเลือก (`wait: true`)
- **ค่าเริ่มต้นปลอดภัย** — domain และ merchant credential อยู่บนเซิร์ฟเวอร์

## หลักการออกแบบ

### 1. อินเทอร์เฟซรวม

Client เรียกแค่ `{gateway}`:

| Dev | Production |
|-----|------------|
| `http://localhost:3001` | `https://api.yourdomain.com` |

การ map upstream อยู่ใน [โมเดล & routing](./routing/) — client Mode B/C ไม่ควร hard-code `v2.api.gommo.net` ในแอป

### 2. ห้ามเดาพารามิเตอร์โมเดล

`ratio`, `mode`, `resolution`, และ `duration` **ต้อง** มาจาก catalog โมเดล:

```http
GET /gateway/models?type=image
Authorization: Bearer {user_token}
```

การเดาค่าทำให้ upstream ปฏิเสธหรือคุณภาพผิดพลาด ดู [โมเดล](./models/)

### 3. งาน async, poll ชัดเจน

งานมีเดีย Gommo ไม่ push webhook ไปแอป gateway:

- สร้างงาน upstream
- Poll ทางเลือกเมื่อ `wait: true` (ช่วง **3500ms**, สูงสุด **80** ครั้ง)
- คืน `resultUrl` หรือ timeout error

Client ที่ตั้ง `wait: false` ต้อง poll `GET /gateway/jobs/:id?media=…` เองด้วยกฎเดียวกัน

### 4. Domain อยู่บนเซิร์ฟเวอร์ (Mode B)

`GOMMO_API_DOMAIN` ใน gateway `.env` ถูก inject เมื่อ client ไม่ส่ง `domain` ลด bug ฝั่ง client และ domain ลงทะเบียนสอดคล้อง

Mode C (proxy) และ Mode A (direct) ยังต้องมี `domain` ใน form body — ใช้ค่าเดียวกับ domain ลงทะเบียนบัญชี Gommo

### 5. Merchant vs user credentials

| Credential | ที่อยู่ | ใช้สำหรับ |
|------------|--------|-----------|
| User `access_token` | Client Bearer / form | `/gateway/*`, proxy user routes |
| `GOMMO_ACCESS_TOKEN` | Server env เท่านั้น | `/admin/*`, legacy PayOS fulfillment |
| `ADMIN_API_KEY` | Server env เท่านั้น | ป้องกัน `/admin/*` |

ห้ามเปิดเผย merchant หรือ admin secret ให้เบราว์เซอร์หรือแอปมือถือ

### 6. Billing แยกจาก generation

flow เติมเครดิตอยู่ที่ **`/billing/*`** ไม่ใช่ `/gateway` **ค่าเริ่มต้น:** Gommo `create_payment` + client `payment_sync` (โอน VietQR) **ทางเลือก legacy:** PayOS webhook → `sendBalances` ภายใน ดู [Billing & เครดิต](./guides/billing-credits.md)

### 7. ข้อผิดพลาดที่พึ่งพาได้

REST routes คืน:

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

Code ทั่วไป: `UNAUTHORIZED`, `UPSTREAM_ERROR`, `RATE_LIMITED`, `NOT_CONFIGURED`, `INSUFFICIENT_CREDITS`

## สิ่งที่เรา optimize

- **ความเร็ว integrator** — quickstart ในไม่กี่นาที playground ที่ [/th/app/playground/](/th/app/playground/)
- **ความชัดเจนในการดำเนินงาน** — health check, structured logs, Docker deploy
- **ความตรงกับ upstream** — proxy Mode C คง envelope Gommo เมื่อต้องการความเข้ากันได้แบบ drop-in

## ถัดไป

→ [โมเดล](./models/) · [เริ่มต้นใช้งาน](./quickstart.md) · [MCP & agents](./mcp/)
