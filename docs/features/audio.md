---
title: Audio & TTS
description: Voice search and text-to-speech via /gateway/audio
---

# Audio & TTS

Text-to-speech and voice discovery through Gommo's platform audio API. Unlike media V2 jobs, audio routes hit **`api.gommo.net`**.

## Endpoints (Mode B)

| Operation | Method | Path |
|-----------|--------|------|
| Search voices | `POST` | `/gateway/audio/voices` |
| Text-to-speech | `POST` | `/gateway/audio/tts` |
| List history | `GET` | `/gateway/audio/lists` |

Auth: `Authorization: Bearer {user_access_token}`.

Proxy equivalent: `POST /ai/audio` with `action_type` form fields.

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
POST /gateway/audio/voices
Authorization: Bearer {token}
Content-Type: application/json

{
  "server": "elevenlabs_cheap",
  "page": 0
}
```

Pick `voice_id` from `data.voices[]`.

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

Success response includes **`data.fileUrl`** — direct link to generated audio.

## Audio history

```http
GET /gateway/audio/lists
Authorization: Bearer {token}
```

Returns previous TTS generations for the user.

## vs media `tts` job type

Gommo also exposes `type=tts` under **V2 media jobs** (`/gateway/jobs/tts`). Use:

- **`/gateway/audio/*`** — platform TTS with voice search (this page)
- **`/gateway/jobs/tts`** — V2 job pipeline with model catalog and poll semantics

See [Media jobs](./media-jobs.md) for async job flow.

## Full API

→ [Audio reference](../reference/audio.md) · [Endpoint map](../routing/endpoint-map.md)

## Next

→ [Chat](./chat.md) · [Features overview](./)
