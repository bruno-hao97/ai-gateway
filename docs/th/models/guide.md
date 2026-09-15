---
title: คู่มือการเชื่อมต่อ
description: แคตตาล็อกโมเดล Gommo — เชื่อมต่อผ่าน public API
---

# คู่มือการเชื่อมต่อโมเดล

เชื่อมต่อผ่าน [Gommo public API](../reference/gommo-public-api.md) บน **`https://v2.api.gommo.net`** Auth: `Authorization: Bearer <access_token>` form body ต้องมี **`domain`** (โดเมนลงทะเบียน เช่น `79ai.net`)

Gommo โฮสต์แคตตาล็อกโมเดล ทุกการเชื่อมต่อมีเดียทำตาม flow เดียวกัน:

1. **ลิสต์โมเดล** ตาม [ประเภทงาน](./job-types.md)
2. **เลือก `model` / slug** และ [พารามิเตอร์](./parameters.md) ที่อนุญาตจาก response
3. **สร้างงาน** — ห้ามเดาฟิลด์
4. **Poll** — client poll ทุก **3.5s** สูงสุด **80** ครั้ง (~5 นาที)

ดูแคตตาล็อกสดที่ [แท็บ Models](/th/models/)

## ลิสต์โมเดล (แนะนำ)

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

ตัวอย่างคำขอฉบับเต็ม → [อ้างอิงมีเดีย & งาน](../reference/media.md)

## สร้างงาน

ใช้ model id จากแคตตาล็อก (ชื่อฟิลด์อาจเป็น `model`, `slug`, หรือ `id_base` ใน response):

```http
POST https://v2.api.gommo.net/ai/jobs/image/{model_id}
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default&prompt=A product photo on white background&ratio=16:9&mode=low&resolution=2k
```

ค่าฟิลด์ต้องมาจาก **ลิสต์โมเดลของคุณ** สำหรับ **โมเดลนั้น** — ดู [พารามิเตอร์](./parameters.md)

## Polling

Gommo ไม่ webhook เมื่องานเสร็จ Poll จนได้สถานะสุดท้าย:

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default
```

| การตั้งค่า | ค่า |
|-----------|-----|
| Interval | **3500 ms** |
| Max attempts | **80** |
| Poll `media` | `image` \| `video` \| `music` (ตรงกับประเภทงาน) |

## ทางเลือก: self-host gateway (dev)

repo นี้ยังมี JSON REST ที่ `{gateway}/gateway/*` (`wait: true`, เติม `domain` อัตโนมัติทางเลือก) ใช้เมื่อ self-host เท่านั้น — ดู [โหมดการเชื่อมต่อ](../routing/integration-modes.md#mode-b-gateway-rest)

## ถัดไป

→ [ประเภทงาน](./job-types.md) · [พารามิเตอร์](./parameters.md) · [เริ่มต้นใช้งาน](../quickstart.md)
