---
title: 'Recipe: Audio TTS'
description: Search voices and create speech
---

# Audio TTS

Two steps: **search voices** → **create TTS**.

## 1. Search voices

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$body = @{ server = 'elevenlabs_cheap'; page = 0 } | ConvertTo-Json

$voices = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/audio/voices" `
  -Headers $h -Body $body
$voiceId = $voices.data.voices[0].voice_id
```

Servers: `elevenlabs_cheap` | `minimaxai_cheap` | `omnivoice_local`

## 2. Create TTS

```powershell
$ttsBody = @{
  text = 'Hello from AI Gateway.'
  voice_id = $voiceId
  server = 'elevenlabs_cheap'
  model = 'eleven_multilingual_v2'
} | ConvertTo-Json

$tts = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/audio/tts" `
  -Headers $h -Body $ttsBody
$tts.data.fileUrl
```

## 3. List history (optional)

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/audio/lists?projectId=default" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

## Playground

**Audio TTS** → Fetch voices → Run TTS. **Audio lists** for history.

## Next

- [Audio reference](../reference/audio.md)
- [TTS media job](./video-music-job.md) — gateway `/gateway/jobs/tts` vs platform `/gateway/audio/tts`
