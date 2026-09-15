---
title: คู่มือการเชื่อมต่อ
description: แคตตาล็อกโมเดล Gommo ผ่าน AI Gateway
---

# คู่มือการเชื่อมต่อโมเดล

::: tip Public API ก่อน
เชื่อมต่อด้วย [Gommo public API](../reference/gommo-public-api.md) — `GET https://v2.api.gommo.net/ai/models?type=…` Gateway `/gateway/models` เป็นทางเลือกสำหรับ dev local
:::

Gommo โฮสต์แคตตาล็อกโมเดล ทุกการเชื่อมต่อมีเดียทำตาม flow เดียวกัน:

1. **ลิสต์โมเดล** ตาม [ประเภทงาน](./job-types.md)
2. **เลือก `modelSlug`** และ [พารามิเตอร์](./parameters.md) ที่อนุญาตจาก response
3. **สร้างงาน** — ห้ามเดาฟิลด์
4. **Poll** — `wait: true` บน REST หรือ poll ฝั่ง client

ดูแคตตาล็อกสดที่ [แท็บ Models](/th/models/) (หน้าแคตตาล็อก)

## ลิสต์โมเดล (โหมด B — แนะนำ)

**Bearer ทางเลือก** — เรียกดูแคตตาล็อกสาธารณะ (สไตล์ OpenRouter) สร้างงานยังต้อง auth

```http
GET /gateway/models?type=image
Authorization: Bearer {access_token}   ← ทางเลือก
```

ตัวอย่างคำขอฉบับเต็ม → [อ้างอิงมีเดีย & งาน](../reference/media.md)

## สร้างงาน

ใช้ `modelSlug` จากแคตตาล็อก:

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "imagegen_2_0",
  "wait": true,
  "fields": {
    "prompt": "A product photo on white background",
    "ratio": "16:9",
    "mode": "low",
    "resolution": "2k"
  }
}
```

ค่าฟิลด์ต้องมาจาก **ลิสต์โมเดลของคุณ** สำหรับ slug นั้น → [พารามิเตอร์](./parameters.md)

## Polling

| `wait` | พฤติกรรม |
|--------|----------|
| `true` | Gateway poll upstream (3.5s × 80) แล้วคืน `resultUrl` หรือ timeout |
| `false` | คืน job id — client เรียก `GET /gateway/jobs/:id?media=image` |

## โหมดอื่น

| โหมด | ลิสต์โมเดล |
|------|------------|
| **A Direct** | `POST https://v2.api.gommo.net/ai/models?type=…` |
| **C Proxy** | `POST http://localhost:3001/v2/ai/models?type=…` + form `domain` |

→ [โหมดการเชื่อมต่อ](../routing/integration-modes.md)

## ถัดไป

→ [ประเภทงาน](./job-types.md) · [พารามิเตอร์](./parameters.md) · [เริ่มต้นใช้งาน](../quickstart.md)
