---
title: พารามิเตอร์
description: ratio, mode, resolution, duration — ต้องมาจากแคตตาล็อกโมเดลเสมอ
---

# พารามิเตอร์

โมเดล Gommo เปิดเผยฟิลด์ที่อนุญาตใน **response ลิสต์โมเดล** upstream ปฏิเสธค่าที่เดา

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

ชื่อฟิลด์ต่างกันตามโมเดล — **ต้อง** ใช้ array ที่ response คืนให้สำหรับ **model id นั้น**

## ฟิลด์งานทั่วไป

| ฟิลด์ | แหล่ง | หมายเหตุ |
|-------|-------|----------|
| `ratio` | `ratios[]` ในแคตตาล็อก | อัตราส่วนภาพ |
| `mode` | `modes[]` | ระดับคุณภาพ/ความเร็ว |
| `resolution` | `resolutions[]` | ขนาดเอาต์พุต |
| `duration` | แคตตาล็อก (วิดีโอ/เพลง) | ความยาว — ห้ามเดา |
| `prompt` | แอปของคุณ | ข้อความ prompt |
| model id | `model`, `slug`, หรือ `id_base` | path URL ตอน create |

::: warning
ห้ามคัดลอก `ratio` / `mode` / `resolution` / `duration` จาก docs โมเดลอื่น หรือตัวอย่าง — อ่านจาก **ลิสต์โมเดลของคุณ** สำหรับ **โมเดลนั้น**
:::

## ชื่อฟิลด์ slug

upstream อาจใช้ `model`, `slug`, `model_id`, หรือ `id_base` ใช้ id จากแคตตาล็อกใน URL create: `POST …/ai/jobs/{type}/{model_id}`

## Tool jobs

บางโมเดล tool ต้องการ key อินพุตต่างกัน (`url`, `image`, …) ตรวจ `POST …/ai/models?type=…` หรือ RESPONSE ใน [Playground](/th/app/playground/)

## ถัดไป

→ [ประเภทงาน](./job-types.md) · [อ้างอิงมีเดีย & งาน](../reference/media.md) · [เริ่มต้นใช้งาน](../quickstart.md)
