---
title: Audio
description: Voice search, TTS, and audio history
---

# Audio

Upstream: `POST https://api.gommo.net/ai/audio`.

| Operation | Gommo (Direct) | Gateway REST | Gateway proxy |
|-----------|----------------|--------------|---------------|
| Search voices | `action_type=searchVoices` | `POST /gateway/audio/voices` | `POST /ai/audio` |
| TTS create | `action_type=create` | `POST /gateway/audio/tts` | `POST /ai/audio` |
| List history | `action_type=getLists` | `GET /gateway/audio/lists` | `POST /ai/audio` |

**Voice servers:** `elevenlabs_cheap` | `minimaxai_cheap` | `omnivoice_local`

REST auth: `Authorization: Bearer {user_token}`. Domain: optional (gateway env).

---

## Search voices

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/audio/voices" ^
  -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" ^
  -d "{\"server\":\"elevenlabs_cheap\",\"page\":0}"
```

```powershell [PowerShell — REST]
$body = @{ server = 'elevenlabs_cheap'; page = 0 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/gateway/audio/voices" `
  -Headers @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type'='application/json' } -Body $body
```

```bash [curl — Direct]
curl.exe -X POST "https://api.gommo.net/ai/audio" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action_type=searchVoices&access_token=%TOKEN%&domain=%GOMMO_API_DOMAIN%&project_id=default&server=elevenlabs_cheap&page=0&page_size=100"
```

```powershell [PowerShell — Proxy]
$d = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "action_type=searchVoices&access_token=$env:TOKEN&domain=$d&project_id=default&server=elevenlabs_cheap&page=0&page_size=100"
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/ai/audio" `
  -ContentType "application/x-www-form-urlencoded" -Body $form
```

:::

Pick `voice_id` from `data.voices[]`.

---

## Text-to-speech

```json
{
  "text": "Hello",
  "voice_id": "VOICE_ID_FROM_SEARCH",
  "server": "elevenlabs_cheap",
  "model": "eleven_multilingual_v2"
}
```

::: code-group

```bash [curl — REST]
curl.exe -X POST "http://localhost:3001/gateway/audio/tts" ^
  -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" ^
  -d "{\"text\":\"Hello\",\"voice_id\":\"VOICE_ID\",\"server\":\"elevenlabs_cheap\",\"model\":\"eleven_multilingual_v2\"}"
```

```powershell [PowerShell — REST]
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

Response: `data.fileUrl`.

---

## Audio lists

::: code-group

```bash [curl — REST]
curl.exe "http://localhost:3001/gateway/audio/lists" ^
  -H "Authorization: Bearer %TOKEN%"
```

```powershell [PowerShell]
Invoke-RestMethod "http://localhost:3001/gateway/audio/lists" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

:::
