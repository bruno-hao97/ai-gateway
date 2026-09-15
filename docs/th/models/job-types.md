---
title: ประเภท job
description: ค่า type= สำหรับ GET /gateway/models และ POST /gateway/jobs
---

# ประเภท job

ส่ง `type` ไป `GET /gateway/models?type=` และใช้ค่าเดียวกันกับ `POST /gateway/jobs/{type}`

## Media & generation

| `type` | การใช้ทั่วไป |
|--------|-------------|
| `image` | Text-to-image, แก้ไขภาพ |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech jobs |
| `music` | สร้างเพลง |
| `avatar-lipsync` | Talking avatar |

## Tool jobs

| `type` | การใช้ทั่วไป |
|--------|-------------|
| `image-upscale` | Upscale ภาพ |
| `remove-bg` | ลบพื้นหลัง |
| `video-upscale` | Upscale วิดีโอ |
| `video-vfx` | เอฟเฟกต์วิดีโอ |
| `video-subtitle` | ซับไตเติล |
| `video-cut` | ตัด/trim |

แผนที่ endpoint และ poll media ต่อประเภท → [Media & jobs reference](../reference/media.md)

## Poll media

เมื่อ poll job async ค่า `media` query ขึ้นกับประเภท job:

| Poll `media` | ประเภท job |
|--------------|-----------|
| `image` | `image`, tool jobs บนภาพ |
| `video` | `video`, video tools |
| `music` | `music` |

Gateway REST: `GET /gateway/jobs/{id}?media=image|video|music`

## ขั้นตอนถัดไป

→ [Parameters](./parameters.md) · [Catalog](./) · [Integration guide](./guide.md)
