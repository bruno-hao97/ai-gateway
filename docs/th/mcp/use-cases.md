---
title: MCP use cases
description: ตัวอย่าง prompt สำหรับ gommo_* tools ใน Cursor
---

# MCP use cases & prompts

ตัวอย่าง prompt สำหรับ **79ai remote MCP** ใน Cursor (หรือ client อื่น) — ดู [tool reference](./tools.md) สำหรับพารามิเตอร์

## กฎสำคัญ

1. Agent ควรเรียก **`gommo_models_list`** ก่อนสร้าง media
2. **ห้ามเดา** `ratio`, `mode`, `resolution`, `duration`
3. หลัง create เก็บ **`id_base`** แล้ว poll ด้วย `gommo_task_stream` หรือ status tool
4. Image/video create **ใช้ credits** — ตรวจ `gommo_credit_balance` ก่อน

## ตรวจยอด & catalog

| คุณพูด | Agent ควรใช้ |
|--------|-------------|
| "ยอด AI credits เหลือเท่าไหร่?" | `gommo_credit_balance` |
| "โมเดลภาพอะไรใช้ได้?" | `gommo_models_list` + `type: "image"` |
| "ratio วิดีโอที่รองรับ?" | `gommo_models_list` + `type: "video"` |

## สร้างภาพ

```
สร้างภาพแมวบนจาน ใช้โมเดลจาก catalog แล้วรอจนเสร็จ
```

Flow ที่คาดหวัง:

```
gommo_credit_balance → gommo_models_list (image) → gommo_image_create → gommo_task_stream
```

## สร้างวิดีโอ

```
สร้างคลิปวิดีโอสั้น ทิวทัศน์เมืองตอนกลางคืน ใช้ enum จาก catalog
```

```
gommo_models_list (video) → gommo_video_create → gommo_task_stream
```

## แจ้งเตือนหลังงานยาว

```
สร้างวิดีโอแล้วแจ้ง Telegram เมื่อเสร็จ
```

Agent ควรเรียก **`gommo_notify_send`** อย่างตั้งใจหลัง `gommo_task_stream` สำเร็จ — Cursor **ไม่** เรียกอัตโนมัติ

## ดูงานเก่า

```
แสดงงานภาพ/วิดีโอล่าสุด 10 รายการ
```

→ `gommo_tasks_list`

## แมปไป HTTP API

สร้างแอปแทน IDE? ดู [endpoint map](../routing/endpoint-map.md) และ [OpenAPI](/openapi.yaml)

## ขั้นตอนถัดไป

→ [MCP tools](./tools.md) · [Other hosts](./other-hosts.md)
