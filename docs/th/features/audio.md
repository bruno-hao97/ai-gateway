---
title: เสียง & TTS
description: ค้นหาเสียงและ text-to-speech บน Gommo platform API
---

# เสียง & TTS

text-to-speech และค้นหาเสียงผ่าน platform audio API ของ Gommo บน **`https://api.gommo.net/ai/audio`**

## Endpoint

ทุกการดำเนินการใช้ **`POST https://api.gommo.net/ai/audio`** พร้อม form fields (`access_token` หรือ Bearer, `domain`, `action_type`, …)

Auth: `Authorization: Bearer {access_token}`

## Voice providers

ค่า `server` ทั่วไป:

| Server | หมายเหตุ |
|--------|----------|
| `elevenlabs_cheap` | ElevenLabs voices |
| `minimaxai_cheap` | MiniMax |
| `omnivoice_local` | Local Omnivoice |

ค้นหาเสียงก่อน TTS เพื่อได้ `voice_id` ที่ถูกต้อง

## ค้นหาเสียง

```http
POST https://api.gommo.net/ai/audio
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action_type=search_voices&server=elevenlabs_cheap&page=0
```

เลือก `voice_id` จากรายการ voices ใน response

## Text-to-speech

```http
POST https://api.gommo.net/ai/audio
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action_type=tts&text=Hello world&voice_id=…&server=elevenlabs_cheap
```

response สำเร็จมี **`fileUrl`** — ลิงก์ตรงไปยัง audio ที่สร้าง

## vs media `tts` job type

Gommo ยังมี `type=tts` ภายใต้ **งานมีเดีย V2** (`POST v2…/ai/jobs/tts/{model_id}`) ใช้:

- **`/ai/audio`** — platform TTS พร้อมค้นหาเสียง (หน้านี้)
- **V2 tts jobs** — job pipeline พร้อมแคตตาล็อกโมเดลและ semantics poll

## API ฉบับเต็ม

→ [อ้างอิงเสียง](../reference/audio.md) · [Gommo public API](../reference/gommo-public-api.md)

## ถัดไป

→ [แชท](./chat.md) · [ภาพรวมฟีเจอร์](./)
