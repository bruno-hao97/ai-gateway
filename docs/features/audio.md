---
title: Audio & TTS
description: Voice search and text-to-speech on Gommo platform API
---

# Audio & TTS

Text-to-speech and voice discovery through Gommo's platform audio API on **`https://api.gommo.net/ai/audio`**.

## Endpoint

All operations use **`POST https://api.gommo.net/ai/audio`** with form fields (`access_token` or Bearer, `domain`, `action_type`, …).

Auth: `Authorization: Bearer {access_token}`.

## Voice providers

Common `server` values:

| Server | Notes |
|--------|-------|
| `elevenlabs_cheap` | ElevenLabs voices |
| `minimaxai_cheap` | MiniMax |
| `omnivoice_local` | Local Omnivoice |

Search voices before TTS to get a valid `voice_id`.

## Search voices

```http
POST https://api.gommo.net/ai/audio
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action_type=search_voices&server=elevenlabs_cheap&page=0
```

Pick `voice_id` from response voices list.

## Text-to-speech

```http
POST https://api.gommo.net/ai/audio
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action_type=tts&text=Hello world&voice_id=…&server=elevenlabs_cheap
```

Success response includes **`fileUrl`** — direct link to generated audio.

## vs media `tts` job type

Gommo also exposes `type=tts` under **V2 media jobs** (`POST v2…/ai/jobs/tts/{model_id}`). Use:

- **`/ai/audio`** — platform TTS with voice search (this page)
- **V2 tts jobs** — job pipeline with model catalog and poll semantics

## Full API

→ [Audio reference](../reference/audio.md) · [Gommo public API](../reference/gommo-public-api.md)

## Next

→ [Chat](./chat.md) · [Features overview](./)
