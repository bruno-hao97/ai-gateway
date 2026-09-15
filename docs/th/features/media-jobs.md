---
title: งานมีเดีย
description: สร้างรูป วิดีโอ และเพลงแบบ async บน Gommo V2
---

# งานมีเดีย

สร้าง **รูป** **วิดีโอ** **เพลง** และมีเดียอื่นผ่าน **Gommo V2** (`https://v2.api.gommo.net`) งานเป็น **async** — สร้างแล้ว poll จนเสร็จ

## ประเภทงานที่รองรับ

| `type` | ตัวอย่าง |
|--------|----------|
| `image` | Text-to-image, แก้ไข |
| `video` | Text/image-to-video |
| `music` | สร้างเพลง |
| `tts` | TTS เป็นประเภทงาน |
| `avatar-lipsync` | Talking avatar |
| `image-upscale`, `remove-bg` | เครื่องมือรูป |
| `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut` | เครื่องมือวิดีโอ |

ลิสต์โมเดลที่มีสำหรับแต่ละประเภท:

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

## Flow ทั่วไป

```
1. POST v2…/ai/models?type=image     → เลือก model id + ratio/mode/…
2. POST v2…/ai/jobs/image/{model_id} → สร้างงาน
3. POST v2…/ai/jobs/{id}?media=image → poll จนเสร็จ
4. ใช้ result URL จากงานที่เสร็จ
```

## สร้างงาน

```http
POST https://v2.api.gommo.net/ai/jobs/image/{model_id}
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default&prompt=A product on white background&ratio=16:9&mode=low&resolution=2k
```

::: warning
`ratio`, `mode`, `resolution`, และ `duration` ต้องมาจาก **ลิสต์โมเดลของคุณ** สำหรับ **โมเดลนั้น** — ไม่จาก docs หรือโมเดลอื่น
:::

## Polling

Poll ทุก **3500 ms** สูงสุด **80** ครั้ง:

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default
```

**Poll `media`:** `image` | `video` | `music` (ตรงกับประเภทงาน)

## Pipeline อัปโหลด + งาน

หลาย workflow รูป/วิดีโอต้องมี URL asset ก่อน:

1. [อัปโหลดรูปหรือวิดีโอ](./upload.md) → ได้ URL ไฟล์
2. ส่ง URL ใน job form (ชื่อฟิลด์จากแคตตาล็อกโมเดล)
3. สร้างและ poll งาน

## สถานะงาน (auth host)

endpoint รายละเอียดทางเลือกบน **`api.gommo.net`**:

```
POST https://api.gommo.net/ai/info/image/{id_base}
POST https://api.gommo.net/ai/info/video/{id}
```

## ทางเลือก: self-host gateway

JSON REST พร้อม `wait: true` ที่ `{gateway}/gateway/jobs/*` — ดู [โหมดการเชื่อมต่อ](../routing/integration-modes.md) proxy pass-through: `POST {gateway}/v2/ai/jobs/…` พร้อม form `domain`

## API ฉบับเต็ม

→ [อ้างอิงมีเดีย & งาน](../reference/media.md) · [ภาพรวมโมเดล](../models/) · [Gommo public API](../reference/gommo-public-api.md)

## ถัดไป

→ [อัปโหลด](./upload.md) · [แชท](./chat.md) · [ภาพรวมฟีเจอร์](./)
