---
title: 'Recipe: Audio TTS'
description: Search voices and create speech
---

# Audio TTS

Two steps on **`https://api.gommo.net/ai/audio`**: **search voices** → **create TTS**. Form body: `application/x-www-form-urlencoded`.

## 1. Search voices

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "action_type=searchVoices&access_token=$env:TOKEN&domain=$domain&project_id=default&server=elevenlabs_cheap&page=0&page_size=100"

$voices = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $form
$voiceId = $voices.data.voices[0].voice_id
```

Servers: `elevenlabs_cheap` | `minimaxai_cheap` | `omnivoice_local`

## 2. Create TTS

```powershell
$ttsForm = "action_type=create&access_token=$env:TOKEN&domain=$domain&project_id=default" `
  + "&text=Hello from Gommo.&voice_id=$voiceId&server=elevenlabs_cheap&model=eleven_multilingual_v2"

$tts = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $ttsForm
$tts.data.fileUrl
```

## 3. List history (optional)

```powershell
$listForm = "action_type=getLists&access_token=$env:TOKEN&domain=$domain&project_id=default"
Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $listForm
```

## Playground

**Audio TTS** → Fetch voices → Run TTS. **Audio lists** for history.

## Next

- [Audio reference](../reference/audio.md)
- [Gommo public API](../reference/gommo-public-api.md)
