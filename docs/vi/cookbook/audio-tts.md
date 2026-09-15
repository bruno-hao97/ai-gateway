---
title: 'Recipe: Audio TTS'
description: Tìm voice và tạo speech
---

# Audio TTS

Hai bước: **search voices** → **create TTS** qua `https://api.gommo.net/ai/audio`.

## 1. Search voices

```powershell
$body = "access_token=$env:TOKEN&domain=79ai.net&action_type=search_voices&server=elevenlabs_cheap&page=0"
$voices = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
$voiceId = $voices.data.voices[0].voice_id
```

Servers: `elevenlabs_cheap` | `minimaxai_cheap` | `omnivoice_local`

## 2. Create TTS

```powershell
$ttsBody = "access_token=$env:TOKEN&domain=79ai.net&action_type=tts&text=Hello from Gommo.&voice_id=$voiceId&server=elevenlabs_cheap"
$tts = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $ttsBody
$tts.fileUrl
```

## 3. List history (tùy chọn)

Dùng `action_type` phù hợp trên cùng endpoint `/ai/audio`.

## Tùy chọn: gateway dev

`POST http://localhost:3001/gateway/audio/voices` và `/gateway/audio/tts` khi self-host.

## Playground

**Audio TTS** → Fetch voices → Run TTS.

## Tiếp theo

- [Audio reference](../reference/audio.md)
- [TTS media job](./video-music-job.md) — V2 `type=tts` vs platform `/ai/audio`
