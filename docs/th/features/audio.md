---
title: เสียง & TTS
description: ค้นหาเสียงและ text-to-speech ผ่าน /gateway/audio
---

# เสียง & TTS

Text-to-speech และค้นหาเสียงผ่าน platform audio API ของ Gommo ต่างจากงานมีเดีย V2 — route เสียงไป **`api.gommo.net`**

## Endpoints (โหมด B)

| การดำเนินการ | Method | Path |
|-------------|--------|------|
| ค้นหาเสียง | `POST` | `/gateway/audio/voices` |
| Text-to-speech | `POST` | `/gateway/audio/tts` |
| ลิสต์ประวัติ | `GET` | `/gateway/audio/lists` |

Auth: `Authorization: Bearer {user_access_token}`

เทียบเท่า proxy: `POST /ai/audio` ด้วยฟิลด์ form `action_type`

## ผู้ให้บริการเสียง

ค่า `server` ทั่วไป:

| Server | หมายเหตุ |
|--------|----------|
| `elevenlabs_cheap` | เสียง ElevenLabs |
| `minimaxai_cheap` | MiniMax |
| `omnivoice_local` | Omnivoice local |

ค้นหาเสียงก่อน TTS เพื่อได้ `voice_id` ที่ถูกต้อง

## ค้นหาเสียง

```http
POST /gateway/audio/voices
Authorization: Bearer {token}
Content-Type: application/json

{
  "server": "elevenlabs_cheap",
  "page": 0
}
```

เลือก `voice_id` จาก `data.voices[]`

## Text-to-speech

```http
POST /gateway/audio/tts
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "Hello world",
  "voice_id": "VOICE_ID_FROM_SEARCH",
  "server": "elevenlabs_cheap",
  "model": "eleven_multilingual_v2"
}
```

Response สำเร็จมี **`data.fileUrl`** — ลิงก์ตรงไปไฟล์เสียงที่สร้าง

## ประวัติเสียง

```http
GET /gateway/audio/lists
Authorization: Bearer {token}
```

คืนการสร้าง TTS ก่อนหน้าของผู้ใช้

## เทียบกับงานมีเดีย `type=tts`

Gommo ยังมี `type=tts` ภายใต้ **งานมีเดีย V2** (`/gateway/jobs/tts`) ใช้:

- **`/gateway/audio/*`** — platform TTS พร้อมค้นหาเสียง (หน้านี้)
- **`/gateway/jobs/tts`** — pipeline งาน V2 พร้อมแคตตาล็อกโมเดลและ semantics poll

ดู [งานมีเดีย](./media-jobs.md) สำหรับ flow งาน async

## API ฉบับเต็ม

→ [อ้างอิงเสียง](../reference/audio.md) · [แผนที่ endpoint](../routing/endpoint-map.md)

## ถัดไป

→ [แชท](./chat.md) · [ภาพรวมฟีเจอร์](./)
