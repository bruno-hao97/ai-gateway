---
title: ฟีเจอร์
description: ความสามารถของเกตเวย์ — งานมีเดีย แชท อัปโหลด และเสียง
---

# ฟีเจอร์

AI Gateway เปิดความสามารถ Gommo ผ่าน **REST** (`/gateway/*`) และ **proxy โปร่งใส** (โหมด C) ส่วนนี้อธิบาย *แต่ละฟีเจอร์ทำอะไร* และ *ใช้อย่างไร* — รายละเอียด request/response ฉบับเต็มอยู่ใน [อ้างอิง API](../reference/media.md)

## แผนที่ฟีเจอร์

| ฟีเจอร์ | Gateway REST | Upstream ทั่วไป | Async? |
|---------|--------------|-----------------|--------|
| [งานมีเดีย](./media-jobs.md) | `/gateway/jobs/*`, `/gateway/models` | `v2.api.gommo.net` | ใช่ — poll หรือ `wait: true` |
| [แชท](./chat.md) | `/gateway/chat` | `api.gommo.net/api/v2/chat` | สตรีมทางเลือก (SSE) |
| [อัปโหลด](./upload.md) | `/gateway/upload/*` | `v2.api.gommo.net` | ไม่ — ได้ URL ทันที |
| [เสียง / TTS](./audio.md) | `/gateway/audio/*` | `api.gommo.net/ai/audio` | TTS คืน URL ไฟล์ |

ทุกฟีเจอร์ต้องมี **user access token** (`Authorization: Bearer`) ดู [การยืนยันตัวตน](../authentication.md)

## โหมด B vs โหมด C

| | โหมด B REST | โหมด C Proxy |
|---|-------------|--------------|
| รูปแบบ body | JSON (gateway แปลง) | Form / multipart (Gommo native) |
| Domain | ทางเลือก — env เซิร์ฟเวอร์ | ต้องมีใน form |
| ข้อผิดพลาด | `{ success, message, code }` | Gommo envelope |
| เหมาะสำหรับ | การเชื่อมต่อใหม่ | ไคลเอนต์ legacy |

ดู [เลือกโหมด](../routing/choosing-a-mode.md)

## กฎร่วม

1. **ลิสต์โมเดลก่อน** สำหรับงานมีเดีย — ห้ามเดา `ratio`, `mode`, `resolution`, `duration`
2. **ไม่มี webhook** — Gommo ไม่ push เมื่องานเสร็จ ใช้ `wait: true` หรือ poll ฝั่ง client
3. **Merchant token อยู่เซิร์ฟเวอร์เท่านั้น** — billing และ `/admin` เท่านั้น

## ค่าเริ่มต้น env

บางฟีเจอร์ใช้ค่าเริ่มต้นจาก env ของ gateway เพื่อลด config ฝั่ง client:

| Env | ใช้โดย |
|-----|---------|
| `GOMMO_API_DOMAIN` | ทุก call upstream (inject ในโหมด B) |
| `GOMMO_CHAT_SERVER`, `GOMMO_CHAT_MODEL`, `GOMMO_CHAT_AGENT_ID` | ค่าเริ่มต้นแชท |

## ในส่วนนี้

- [งานมีเดีย](./media-jobs.md) — รูป วิดีโอ เพลง upscale …
- [แชท](./chat.md) — agent chat และสตรีม SSE
- [อัปโหลด](./upload.md) — asset รูป/วิดีโอสำหรับงาน
- [เสียง & TTS](./audio.md) — ค้นหาเสียงและ text-to-speech

## อ้างอิง API

→ [มีเดีย & งาน](../reference/media.md) · [แชท](../reference/chat.md) · [อัปโหลด](../reference/upload.md) · [เสียง](../reference/audio.md)

## ถัดไป

→ [โมเดล & routing](../routing/) · [เริ่มต้นใช้งาน](../quickstart.md)
