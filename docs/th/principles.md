---
title: หลักการ
description: หลักการหลักสำหรับเชื่อมต่อ Gommo public API
---

# หลักการ

หลักการหลักเมื่อสร้างบน [Gommo](https://gommo.net) — อ่านก่อน [เริ่มต้นใช้งาน](./quickstart.md) หรือ [โมเดล](./models/)

## ลำดับคำขอ

```
แอปของคุณ
  │
  ├─ v2.api.gommo.net  ──► models · create/poll jobs · upload image/video
  │
  └─ api.gommo.net     ──► login · /ai/me · chat · audio · job info
```

ทางเลือก: self-host [AI Gateway](./routing/integration-modes.md) (Mode B/C) สำหรับ JSON REST, billing portal, BYOK — ไม่จำเป็นสำหรับการเชื่อมต่อ Gommo โดยตรง

## สอง upstream host

| Host | ใช้สำหรับ |
|------|----------|
| **`https://v2.api.gommo.net`** | Models, create/poll media jobs, upload |
| **`https://api.gommo.net`** | Login, profile/credits, chat, platform audio |

Auth: **`Authorization: Bearer <access_token>`** ผ่าน HTTPS form platform และ V2 ต้องมี **`domain`** (โดเมนลงทะเบียนบัญชีเดียวกัน)

## หลักการออกแบบ

### 1. เรียก URL public ของ Gommo

ผู้ integrate เรียก upstream host โดยตรง แผนที่ฉบับเต็ม → [Gommo public API](./reference/gommo-public-api.md)

| การดำเนินการ | URL |
|-------------|-----|
| ลิสต์โมเดล | `POST https://v2.api.gommo.net/ai/models?type={type}` |
| สร้างงาน | `POST https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` |
| Poll งาน | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` |
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

### 2. ห้ามเดาพารามิเตอร์โมเดล

`ratio`, `mode`, `resolution`, และ `duration` **ต้อง** มาจากแคตตาล็อกโมเดล:

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

การเดาค่าทำให้ upstream ปฏิเสธหรือคุณภาพผิดพลาด ดู [โมเดล](./models/)

### 3. งาน async, poll ชัดเจน

งานมีเดีย Gommo ไม่ push webhook ไปแอปโดยค่าเริ่มต้น client ต้อง poll:

- ช่วง **3500 ms**
- สูงสุด **80** ครั้ง (~5 นาที)
- `POST …/ai/jobs/{id}?media=…` จนสถานะสุดท้าย

gateway self-host สามารถ poll ฝั่งเซิร์ฟเวอร์ (`wait: true`) — ดู [โหมดการเชื่อมต่อ](./routing/integration-modes.md)

### 4. Domain ในทุก form body

ส่ง `domain` ตรงกับโดเมนลงทะเบียน (เช่น `79ai.net`, `vmedia`) โดเมนผิด → auth หรือ payment error

docs portal multi-tenant อาจล็อก domain ต่อ dealer — ดู [Tenants](./routing/upstream-hosts.md)

### 5. User vs merchant credentials

| Credential | ที่อยู่ | ใช้สำหรับ |
|------------|--------|-----------|
| User `access_token` | Client Bearer / form | ทุก user API call |
| `GOMMO_ACCESS_TOKEN` | Server env เท่านั้น | Merchant ops, catalog translate warm |
| `ADMIN_API_KEY` | Server env เท่านั้น | Self-hosted `/admin/*` |

ห้ามเปิดเผย merchant หรือ admin secret ให้เบราว์เซอร์หรือแอปมือถือ

### 6. Billing บน platform auth host

เติมเครดิตใช้ Gommo `create_payment` + `payment_sync` บน **`api.gommo.net`** site docs อาจ wrap billing ใต้ `/billing/*` เมื่อ self-host — ดู [Billing & เครดิต](./guides/billing-credits.md)

### 7. ข้อผิดพลาด upstream

Gommo คืน JSON พร้อม `message`, `success`, `error` ตรวจ HTTP status และ body — ไม่ retry credential เดิมเมื่อ auth ล้มเหลว

## สิ่งที่เรา optimize

- **ความเร็ว integrator** — [เริ่มต้นใช้งาน](./quickstart.md) ในไม่กี่นาที [Playground](/th/app/playground/) พร้อม URL public
- **ความตรงกับแคตตาล็อก** — ไม่สร้าง enum เอง ลิสต์โมเดลก่อน
- **host ชัดเจน** — v2 สำหรับมีเดีย api สำหรับ auth/chat/audio

## ถัดไป

→ [โมเดล](./models/) · [เริ่มต้นใช้งาน](./quickstart.md) · [MCP & agents](./mcp/)
