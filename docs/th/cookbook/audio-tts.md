---
title: 'สูตร: Audio TTS'
description: ค้นหาเสียงและสร้างเสียงพูด
---

# Audio TTS

สองขั้น: **ค้นหาเสียง** → **สร้าง TTS**

## 1. ค้นหาเสียง

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$body = @{ server = 'elevenlabs_cheap'; page = 0 } | ConvertTo-Json

$voices = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/audio/voices" `
  -Headers $h -Body $body
$voiceId = $voices.data.voices[0].voice_id
```

เซิร์ฟเวอร์: `elevenlabs_cheap` | `minimaxai_cheap` | `omnivoice_local`

## 2. สร้าง TTS

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

## 3. ลิสต์ประวัติ (ทางเลือก)

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/audio/lists?projectId=default" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

## Playground

**Audio TTS** → Fetch voices → Run TTS **Audio lists** สำหรับประวัติ

## ถัดไป

- [อ้างอิงเสียง](../reference/audio.md)
- [งาน TTS มีเดีย](./video-music-job.md) — gateway `/gateway/jobs/tts` vs platform `/gateway/audio/tts`
