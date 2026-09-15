---
title: 'Recipe: Audio TTS'
description: ค้นหาเสียงและสร้าง speech
---

# Audio TTS

สองขั้น: **search voices** → **create TTS** ผ่าน `https://api.gommo.net/ai/audio`

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

## 3. List history (ทางเลือก)

ใช้ `action_type` ที่เหมาะสมบน endpoint `/ai/audio` เดียวกัน

## ทางเลือก: gateway dev

`POST http://localhost:3001/gateway/audio/voices` และ `/gateway/audio/tts` เมื่อ self-host

## Playground

**Audio TTS** → Fetch voices → Run TTS

## ถัดไป

- [อ้างอิงเสียง](../reference/audio.md)
- [TTS media job](./video-music-job.md) — V2 `type=tts` vs platform `/ai/audio`
