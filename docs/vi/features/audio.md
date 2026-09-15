---
title: Audio & TTS
description: Tìm voice và text-to-speech trên Gommo platform API
---

# Audio & TTS

Text-to-speech và tìm voice qua platform audio API Gommo trên **`https://api.gommo.net/ai/audio`**.

## Endpoint

Mọi thao tác dùng **`POST https://api.gommo.net/ai/audio`** với form fields (`access_token` hoặc Bearer, `domain`, `action_type`, …).

Auth: `Authorization: Bearer {access_token}`.

## Voice providers

Giá trị `server` thường gặp:

| Server | Ghi chú |
|--------|---------|
| `elevenlabs_cheap` | ElevenLabs voices |
| `minimaxai_cheap` | MiniMax |
| `omnivoice_local` | Local Omnivoice |

Search voice trước TTS để lấy `voice_id` hợp lệ.

## Search voices

```http
POST https://api.gommo.net/ai/audio
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action_type=search_voices&server=elevenlabs_cheap&page=0
```

Chọn `voice_id` từ danh sách voices trong response.

## Text-to-speech

```http
POST https://api.gommo.net/ai/audio
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action_type=tts&text=Hello world&voice_id=…&server=elevenlabs_cheap
```

Response thành công gồm **`fileUrl`** — link trực tiếp đến audio đã tạo.

## vs media `tts` job type

Gommo cũng expose `type=tts` dưới **V2 media jobs** (`POST v2…/ai/jobs/tts/{model_id}`). Dùng:

- **`/ai/audio`** — platform TTS với voice search (trang này)
- **V2 tts jobs** — job pipeline với catalog models và poll semantics

## API đầy đủ

→ [Audio reference](../reference/audio.md) · [Gommo public API](../reference/gommo-public-api.md)

## Tiếp theo

→ [Chat](./chat.md) · [Features overview](./)
