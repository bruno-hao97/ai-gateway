---
title: แชท
description: Agent chat พร้อม SSE streaming ทางเลือกบน Gommo platform API
---

# แชท

แชท AI ผ่าน platform chat API ของ Gommo บน **`https://api.gommo.net`**

## Endpoint (แนะนำ)

```http
POST https://api.gommo.net/api/v2/chat
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

action=chat&domain=79ai.net&query=Hello&messages=[{"role":"user","text":"Hello"}]
```

form อาจใช้ `access_token` แทน Bearer header — token เดียวกัน

## Actions

| `action` | พฤติกรรม |
|----------|----------|
| `chat` | response JSON ครั้งเดียว |
| `stream` | สตรีม **SSE** |
| `set_model` | เปลี่ยน chat model สำหรับ session |
| `agent` | **set_model** (best-effort) แล้ว **chat** — text agent flow |
| `models` | ลิสต์ chat models ที่มี |

## messages ไม่ว่าง

upstream `action=chat` ต้องการ **`messages` อย่างน้อยหนึ่งรายการ** — เช่น `{ "role": "user", "text": "..." }`

## Streaming

ตั้ง `action=stream` สำหรับ SSE token-by-token consume สตรีมบน client — ไม่คาดหวัง JSON body เดียว

## Credits

แชทใช้เครดิต user Gommo ตรวจยอดผ่าน `POST https://api.gommo.net/ai/me`

## Portal chat

[/th/app/chat/](/th/app/chat/) ใช้ upstream API เดียวกัน ประวัติแชทใน portal **เฉพาะ local** — export/import JSON จาก sidebar สำหรับ backup

## ทางเลือก: self-host gateway

JSON wrapper ที่ `POST {gateway}/gateway/chat` — ดู [อ้างอิงแชท](../reference/chat.md) ส่วน Mode B

## API ฉบับเต็ม

→ [อ้างอิงแชท](../reference/chat.md) · [Gommo public API](../reference/gommo-public-api.md)

## ถัดไป

→ [เสียง & TTS](./audio.md) · [งานมีเดีย](./media-jobs.md)
