---
title: อ้างอิง MCP tools
description: 10 tools gommo_* บน 79ai remote MCP
---

# อ้างอิง MCP tools

**Host:** [79ai remote MCP](./other-hosts.md) — `https://api.gommo.net/api/v2/gommo-mcp`  
**Tools เมื่อเชื่อมต่อ:** 10

[Self-hosted](./self-hosted.md) `@ai-gateway/mcp-server` แบบทางเลือกมี subset (v0.1 ไม่มี `gommo_tasks_list` / `gommo_notify_send`)

## ภาพรวม tools

| Tool | วัตถุประสงค์ | ใช้ credits |
|------|-------------|-------------|
| `gommo_account_info` | โปรไฟล์, partner, ยอดคงเหลือ | ไม่ |
| `gommo_credit_balance` | ตรวจ `credits_ai` เร็ว | ไม่ |
| `gommo_models_list` | Catalog — enum ratio/mode/duration | ไม่ |
| `gommo_image_create` | เริ่ม job ภาพ async → `id_base` | **ใช่** |
| `gommo_image_status` | สถานะ job ภาพครั้งเดียว | ไม่ |
| `gommo_video_create` | เริ่ม job วิดีโอ async → `id_base` | **ใช่** |
| `gommo_video_status` | สถานะ job วิดีโอครั้งเดียว | ไม่ |
| `gommo_tasks_list` | งานภาพ/วิดีโอล่าสุด | ไม่ |
| `gommo_task_stream` | Poll จนเสร็จ / ล้มเหลว / timeout | ไม่ |
| `gommo_notify_send` | Inbox + push + แจ้ง Telegram | ไม่ |

## กฎ (media tools ทั้งหมด)

1. เรียก **`gommo_models_list`** ก่อน create
2. **ห้ามเดา** `ratio`, `mode`, `resolution`, `duration`
3. หลัง create เก็บ **`id_base`** — poll ด้วย status, stream หรือ tasks list
4. Image/video create **ใช้ credits** — ตรวจ `gommo_credit_balance` ก่อน

ตัวอย่าง prompt: [Use cases & prompts](./use-cases.md)

---

## `gommo_account_info`

โปรไฟล์บัญชีและ payload ยอดคงเหลือจาก `/ai/me`

**ใช้เมื่อ:** ผู้ใช้ถามตัวตน, subscription, รายละเอียดยอดเต็ม

---

## `gommo_credit_balance`

**`credits_ai`** ล่าสุดของผู้ใช้ที่ auth (เร็วกว่า account info เต็ม)

**ใช้เมื่อ:** ก่อน generation ที่เสียเงิน

---

## `gommo_models_list`

รายการโมเดลและ enum ที่ถูกต้องตามประเภท media

| Param | Type | จำเป็น |
|-------|------|--------|
| `type` | `image` \| `video` \| `audio` | ใช่ |

`audio` แมปไป catalog เพลง

**ใช้เมื่อ:** ก่อน `gommo_image_create` หรือ `gommo_video_create` เสมอ

---

## `gommo_image_create`

สร้าง job ภาพ async คืน **`id_base`**

| Param | จำเป็น | หมายเหตุ |
|-------|--------|----------|
| `model` | ใช่ | จาก models list |
| `prompt` | ใช่ | |
| `ratio`, `resolution`, `mode` | catalog | จาก models list เท่านั้น |
| `images`, `references`, `subjects` | optional | `{ url }[]` |

**ใช้เมื่อ:** ผู้ใช้ต้องการภาพใหม่ ตามด้วย `gommo_task_stream` หรือ `gommo_image_status`

---

## `gommo_image_status`

สถานะและ URL ผลลัพธ์ล่าสุดของ job ภาพหนึ่งรายการ

| Param | จำเป็น |
|-------|--------|
| `id_base` | ใช่ |

**ใช้เมื่อ:** ตรวจสถานะครั้งเดียว แนะนำ `gommo_task_stream` สำหรับรออัตโนมัติ

---

## `gommo_video_create`

สร้าง job วิดีโอ async คืน **`id_base`**

รองรับ start/end frame, references, motion, extend, multi-shot (ดู schema ใน client)

| Param | จำเป็น |
|-------|--------|
| `model` | ใช่ |
| `prompt` | มักใช้ |
| `ratio`, `resolution`, `duration`, `mode` | จาก catalog |

---

## `gommo_video_status`

สถานะครั้งเดียวของ job วิดีโอตาม `id_base`

---

## `gommo_tasks_list`

รายการงานภาพและ/หรือวิดีโอล่าสุด

| Param | Type | Default |
|-------|------|---------|
| `type` | `all` \| `image` \| `video` | `all` |
| `limit` | 1–100 | — |
| `project_id` | string | optional |
| `after_id` | string | pagination |

**ใช้เมื่อ:** หางานเก่า, fallback ถ้า status ตาม id ล้มเหลว, audit ประวัติ

---

## `gommo_task_stream`

Poll จนสำเร็จ ล้มเหลว หรือ timeout

| Param | Default | คำอธิบาย |
|-------|---------|----------|
| `type` | — | `image` หรือ `video` |
| `id_base` | — | จาก create response |
| `interval_seconds` | 30 | 5–60 |
| `max_wait_seconds` | 1800 | สูงสุด 30 นาที |

**ใช้เมื่อ:** รอ generation เสร็จ (แนะนำหลัง create)

---

## `gommo_notify_send`

ส่งการแจ้งเตือนให้ผู้ใช้ที่ auth: inbox + OneSignal push (optional) + Telegram ที่เชื่อม

| Param | คำอธิบาย |
|-------|----------|
| `title` | หัวข้อ |
| `message` | เนื้อหา / ข้อความ Telegram |
| `url` | Deep link (optional, default `/chat`) |
| `send_push` | Default `true` |
| `send_telegram` | Default `true` |
| `images` | URL ภาพสำหรับ Telegram (optional) |

**ใช้เมื่อ:** ผู้ใช้ขอแจ้งหลังงานยาว Agent ต้องเรียก **อย่างตั้งใจ** — ไม่ automatic

---

## ตัวอย่าง flow

**ภาพ:**

```
gommo_credit_balance → gommo_models_list → gommo_image_create → gommo_task_stream
```

**วิดีโอ + แจ้งเตือน:**

```
gommo_models_list (video) → gommo_video_create → gommo_task_stream → gommo_notify_send
```

**Debug:**

```
gommo_tasks_list → gommo_image_status (id_base)
```

## เทียบ HTTP

สร้างแอปแทน IDE? แมป tools ไป [`/gateway/*`](../routing/endpoint-map.md) — ดู [OpenAPI](/openapi.yaml)

## ขั้นตอนถัดไป

→ [Use cases](./use-cases.md) · [Other hosts](./other-hosts.md)
