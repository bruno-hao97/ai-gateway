---
title: ประเภทงาน
description: ค่า type= สำหรับ Gommo models list และ job create
---

# ประเภทงาน

ส่ง `type` ไปที่ `POST https://v2.api.gommo.net/ai/models?type=` และใช้ค่าเดียวกันใน `POST …/ai/jobs/{type}/{model_id}`

## มีเดีย & generation

| `type` | การใช้ทั่วไป |
|--------|-------------|
| `image` | Text-to-image, แก้ไข |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech jobs |
| `music` | สร้างเพลง |
| `avatar-lipsync` | Talking avatar |

## Tool jobs

| `type` | การใช้ทั่วไป |
|--------|-------------|
| `image-upscale` | Upscale รูป |
| `remove-bg` | ลบพื้นหลัง |
| `video-upscale` | Upscale วิดีโอ |
| `video-vfx` | เอฟเฟกต์วิดีโอ |
| `video-subtitle` | ซับไตเติ้ล |
| `video-cut` | ตัด/ตัดแต่ง |

แผนที่ endpoint ฉบับเต็มและ poll media ต่อประเภท → [อ้างอิงมีเดีย & งาน](../reference/media.md)

## Poll media

เมื่อ poll งาน async query `media` ขึ้นกับประเภทงาน:

| Poll `media` | ประเภทงาน |
|--------------|-----------|
| `image` | `image`, tool บนรูป |
| `video` | `video`, tool วิดีโอ |
| `music` | `music` |

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
```

## ถัดไป

→ [พารามิเตอร์](./parameters.md) · [แคตตาล็อก](./) · [คู่มือการเชื่อมต่อ](./guide.md)
