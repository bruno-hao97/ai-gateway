---
title: ฟีเจอร์
description: ความสามารถ Gommo — งานมีเดีย แชท อัปโหลด และเสียง
---

# ฟีเจอร์

Gommo เปิดความสามารถ generation บนสอง public host ส่วนนี้อธิบาย *แต่ละฟีเจอร์ทำอะไร* — รายละเอียด request/response ฉบับเต็มอยู่ใน [อ้างอิง API](../reference/media.md) และ [Gommo public API](../reference/gommo-public-api.md)

## แผนที่ฟีเจอร์

| ฟีเจอร์ | Public API | Host | Async? |
|---------|------------|------|--------|
| [งานมีเดีย](./media-jobs.md) | `POST v2…/ai/models`, `…/ai/jobs/*` | `v2.api.gommo.net` | ใช่ — client poll |
| [แชท](./chat.md) | `POST …/api/v2/chat` | `api.gommo.net` | สตรีมทางเลือก (SSE) |
| [อัปโหลด](./upload.md) | `POST …/ai/upload/image\|video` | `v2.api.gommo.net` | ไม่ — ได้ URL ทันที |
| [เสียง / TTS](./audio.md) | `POST …/ai/audio` | `api.gommo.net` | TTS คืน URL ไฟล์ |

ทุกฟีเจอร์ต้องมี **user access token** (`Authorization: Bearer`) ดู [การยืนยันตัวตน](../authentication.md)

## กฎร่วม

1. **ลิสต์โมเดลก่อน** สำหรับงานมีเดีย — ห้ามเดา `ratio`, `mode`, `resolution`, `duration`
2. **ไม่มี webhook** — poll งานมีเดียทุก **3.5s** สูงสุด **80** ครั้ง
3. **ส่ง `domain`** ใน form body — โดเมนลงทะเบียนบัญชีเดียวกัน
4. **Merchant token อยู่เซิร์ฟเวอร์เท่านั้น** — ไม่ใน browser

## ทางเลือก: self-host gateway

repo นี้สามารถ wrap upstream call เดียวกันเป็น JSON REST ที่ `{gateway}/gateway/*` — ดู [โหมดการเชื่อมต่อ](../routing/integration-modes.md) ใช้สำหรับ portal billing, BYOK หรือ dev local

## ในส่วนนี้

- [งานมีเดีย](./media-jobs.md) — รูป วิดีโอ เพลง upscale …
- [แชท](./chat.md) — agent chat และสตรีม SSE
- [อัปโหลด](./upload.md) — asset รูป/วิดีโอสำหรับงาน
- [เสียง & TTS](./audio.md) — ค้นหาเสียงและ text-to-speech

## อ้างอิง API

→ [มีเดีย & งาน](../reference/media.md) · [แชท](../reference/chat.md) · [อัปโหลด](../reference/upload.md) · [เสียง](../reference/audio.md)

## ถัดไป

→ [โมเดล](../models/) · [เริ่มต้นใช้งาน](../quickstart.md)
