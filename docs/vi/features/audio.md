---
title: Audio & TTS
description: Tìm voice và text-to-speech qua /gateway/audio
---

# Audio & TTS

Text-to-speech và tìm voice qua platform audio Gommo (`api.gommo.net`), khác pipeline V2 jobs.

## Endpoint (Mode B)

| Thao tác | Path |
|----------|------|
| Tìm voice | `POST /gateway/audio/voices` |
| TTS | `POST /gateway/audio/tts` |
| Lịch sử | `GET /gateway/audio/lists` |

Auth: `Authorization: Bearer {token}`.

Proxy: `POST /ai/audio` + `action_type`.

## Voice providers

| `server` | Ghi chú |
|----------|---------|
| `elevenlabs_cheap` | ElevenLabs |
| `minimaxai_cheap` | MiniMax |
| `omnivoice_local` | Omnivoice local |

Search voice trước để lấy `voice_id`.

## TTS

```json
{
  "text": "Xin chào",
  "voice_id": "VOICE_ID",
  "server": "elevenlabs_cheap",
  "model": "eleven_multilingual_v2"
}
```

Thành công → **`data.fileUrl`**.

## vs job `tts` (V2)

- **`/gateway/audio/*`** — platform TTS + search voice (trang này)
- **`/gateway/jobs/tts`** — V2 job async + catalog models

→ [Media jobs](./media-jobs.md)

## API đầy đủ

→ [Audio reference](../reference/audio.md)

## Tiếp theo

→ [Chat](./chat.md)
