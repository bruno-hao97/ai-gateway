---
title: Audio
description: Voice search, TTS, and audio history
---

# Audio

Upstream: `POST https://api.gommo.net/ai/audio` (form urlencoded).

| Operation | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Search voices | `action_type=searchVoices` | `POST /gateway/audio/voices` | `POST /ai/audio` |
| TTS create | `action_type=create` | `POST /gateway/audio/tts` | `POST /ai/audio` |
| List history | `action_type=getLists` | `GET /gateway/audio/lists` | `POST /ai/audio` |

**Voice servers:** `elevenlabs_cheap` | `minimaxai_cheap` | `omnivoice_local`

Auth: `access_token` in form (or `Authorization: Bearer`). Include `domain` and `project_id` in every call.

---

## Search voices

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://api.gommo.net/ai/audio" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action_type=searchVoices&access_token=%TOKEN%&domain=79ai.net&project_id=default&server=elevenlabs_cheap&page=0&page_size=100"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "action_type=searchVoices&access_token=$env:TOKEN&domain=$d&project_id=default&server=elevenlabs_cheap&page=0&page_size=100"
Invoke-RestMethod -Method POST -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

```bash [curl — Bearer header]
curl.exe -X POST "https://api.gommo.net/ai/audio" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action_type=searchVoices&domain=79ai.net&project_id=default&server=elevenlabs_cheap&page=0&page_size=100"
```

:::

Pick `voice_id` from `data.voices[]`.

---

## Text-to-speech

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://api.gommo.net/ai/audio" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action_type=create&access_token=%TOKEN%&domain=79ai.net&project_id=default&text=Hello&voice_id=VOICE_ID&server=elevenlabs_cheap&model=eleven_multilingual_v2"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "action_type=create&access_token=$env:TOKEN&domain=$d&project_id=default" `
  + "&text=Hello&voice_id=$voiceId&server=elevenlabs_cheap&model=eleven_multilingual_v2"
Invoke-RestMethod -Method POST -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

:::

Response: `data.fileUrl`.

---

## Audio lists

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://api.gommo.net/ai/audio" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action_type=getLists&access_token=%TOKEN%&domain=79ai.net&project_id=default"
```

```powershell [PowerShell — Direct]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "action_type=getLists&access_token=$env:TOKEN&domain=$d&project_id=default"
Invoke-RestMethod -Method POST -Uri "https://api.gommo.net/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

:::

---

## Optional: self-host gateway (Mode B)

JSON wrappers at `POST {gateway}/gateway/audio/voices`, `/gateway/audio/tts`, `GET /gateway/audio/lists`. Gateway injects `domain` from env when omitted.

::: code-group

```bash [curl — REST voices]
curl.exe -X POST "http://localhost:3001/gateway/audio/voices" ^
  -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" ^
  -d "{\"server\":\"elevenlabs_cheap\",\"page\":0}"
```

```powershell [PowerShell — REST TTS]
$body = @{
  text = 'Hello'
  voice_id = $voiceId
  server = 'elevenlabs_cheap'
  model = 'eleven_multilingual_v2'
} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/gateway/audio/tts" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type'='application/json' } -Body $body
```

:::

→ [Gommo public API](./gommo-public-api.md) · [Audio TTS recipe](../cookbook/audio-tts.md)
