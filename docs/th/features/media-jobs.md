---
title: งานมีเดีย
description: สร้างรูป วิดีโอ และเพลงแบบ async พร้อม poll ฝั่งเซิร์ฟเวอร์ทางเลือก
---

# งานมีเดีย

สร้าง **รูป** **วิดีโอ** **เพลง** และมีเดียอื่นผ่านงาน Gommo V2 งานเป็น **async** — สร้างแล้ว poll จนเสร็จ

## ประเภทงานที่รองรับ

| `type` | ตัวอย่าง |
|--------|----------|
| `image` | Text-to-image, แก้ไข |
| `video` | Text/image-to-video |
| `music` | สร้างเพลง |
| `tts` | TTS เป็นงาน |
| `avatar-lipsync` | Avatar พูด |
| `image-upscale`, `remove-bg` | เครื่องมือรูป |
| `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut` | เครื่องมือวิดีโอ |

ลิสต์โมเดลแต่ละประเภท:

```http
GET /gateway/models?type=image
Authorization: Bearer {token}
```

## Flow ทั่วไป

```
1. GET  /gateway/models?type=image     → เลือก modelSlug + ratio/mode/…
2. POST /gateway/jobs/image            → สร้างงาน (wait: true ทางเลือก)
3. GET  /gateway/jobs/:id?media=image  → poll ถ้า wait: false
4. ใช้ resultUrl จากงานที่เสร็จ
```

## สร้างงาน (โหมด B)

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "flux-dev",
  "wait": true,
  "fields": {
    "prompt": "A product on white background",
    "ratio": "16:9",
    "mode": "low",
    "resolution": "2k"
  }
}
```

::: warning
`ratio`, `mode`, `resolution`, และ `duration` ต้องมาจาก **ลิสต์โมเดลของคุณ** สำหรับ slug นั้น — ไม่ใช่จาก docs หรือโมเดลอื่น
:::

## Poll ฝั่งเซิร์ฟเวอร์ (`wait: true`)

เมื่อ `wait: true` gateway poll upstream ให้:

| การตั้งค่า | ค่า |
|-----------|-----|
| ช่วง | 3500 ms |
| ครั้งสูงสุด | 80 (~4.7 นาที) |
| สำเร็จ | คืน `resultUrl` ใน response |
| Timeout | ข้อผิดพลาดมีโครงสร้างพร้อม job id ถ้ามี |

เมื่อ `wait: false` response มี job id — client ต้อง poll:

```http
GET /gateway/jobs/{jobId}?media=image
Authorization: Bearer {token}
```

**Poll media** ขึ้นกับประเภทงาน: `image` | `video` | `music`

## Pipeline อัปโหลด + งาน

workflow วิดีโอ/รูปหลายแบบต้องมี URL asset ก่อน:

1. [อัปโหลดรูปหรือวิดีโอ](./upload.md) → ได้ URL ไฟล์
2. ส่ง URL ใน `fields` ของงาน (ชื่อฟิลด์จากแคตตาล็อกโมเดล)
3. สร้างและ poll งาน

## โหมด C (proxy)

flow เดียวกับ path native ของ Gommo:

```
POST /v2/ai/models?type=image
POST /v2/ai/jobs/image/{modelSlug}
POST /v2/ai/jobs/{id}?media=image
```

Form body ต้องมี `domain` และ `project_id=default`

## Response envelope

โหมด B ห่อ upstream:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "SUCCESS",
    "resultUrl": "https://..."
  }
}
```

โหมด C คืนรูปแบบ native ของ Gommo (`raw.imageInfo` ฯลฯ)

## API ฉบับเต็ม

→ [อ้างอิงมีเดีย & งาน](../reference/media.md) · [ภาพรวมโมเดล](../models/) · [แผนที่ endpoint](../routing/endpoint-map.md)

## ถัดไป

→ [อัปโหลด](./upload.md) · [แชท](./chat.md) · [ภาพรวมฟีเจอร์](./)
