---
title: พารามิเตอร์
description: ratio, mode, resolution, duration — ต้องมาจาก catalog โมเดลเสมอ
---

# พารามิเตอร์

โมเดล Gommo แสดงฟิลด์ที่อนุญาตใน **models list response** AI Gateway ไม่ validate หรือเดาค่า — upstream จะปฏิเสธค่าที่เดา

## รูปแบบ response (ย่อ)

```json
{
  "success": true,
  "data": [
    {
      "model": "imagegen_2_0",
      "name": "…",
      "ratios": [{ "value": "16:9", "label": "16:9" }],
      "modes": [{ "value": "low", "label": "Low" }],
      "resolutions": [{ "value": "2k", "label": "2K" }]
    }
  ]
}
```

ชื่อฟิลด์ต่างกันตามโมเดล — **ต้อง**ใช้ array ที่ response คืนมาสำหรับ slug **นั้น**

## ฟิลด์ job ทั่วไป

| Field | แหล่ง | หมายเหตุ |
|-------|-------|----------|
| `ratio` | `ratios[]` ใน catalog | อัตราส่วนภาพ |
| `mode` | `modes[]` | ระดับคุณภาพ/ความเร็ว |
| `resolution` | `resolutions[]` | ขนาดผลลัพธ์ |
| `duration` | catalog (video/music) | ความยาว — ห้ามเดา |
| `prompt` | แอปของคุณ | ข้อความ prompt |
| `modelSlug` | ฟิลด์ `model` หรือ `slug` | จำเป็นตอน create |

::: warning
ห้ามคัดลอก `ratio` / `mode` / `resolution` / `duration` จาก docs, โมเดลอื่น หรือตัวอย่าง — อ่านจาก models list **ของคุณ** สำหรับ slug **นั้น**
:::

## ชื่อฟิลด์ slug

Upstream อาจใช้ `model`, `slug`, `model_id` หรือ `id` Mode B REST ต้องการ **`modelSlug`** ใน JSON body — แมปจากฟิลด์ catalog ที่ list คืนมา

## Tool jobs

บางโมเดล tool ใช้ key input ต่างกัน (`url`, `image`, …) ตรวจ `GET /gateway/models?type=…` หรือ RESPONSE panel ใน [Playground](/app/playground/)

## ขั้นตอนถัดไป

→ [Job types](./job-types.md) · [Media & jobs reference](../reference/media.md) · [Quickstart](../quickstart.md)
