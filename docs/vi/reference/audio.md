---
title: Audio
description: Tìm giọng, TTS và lịch sử audio trên Gommo
---

# Audio

Upstream: `POST https://api.gommo.net/ai/audio` (form urlencoded).

| Thao tác | Gommo (Direct) | Gateway REST (tùy chọn) |
|-----------|----------------|-------------------------|
| Search voices | `action_type=searchVoices` | `POST /gateway/audio/voices` |
| TTS create | `action_type=create` | `POST /gateway/audio/tts` |
| List history | `action_type=getLists` | `GET /gateway/audio/lists` |

Auth: `access_token` trong form (hoặc Bearer). Luôn gửi `domain` và `project_id`.

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

:::

---

## Text-to-speech

::: code-group

```bash [curl — Direct]
curl.exe -X POST "https://api.gommo.net/ai/audio" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "action_type=create&access_token=%TOKEN%&domain=79ai.net&project_id=default&text=Hello&voice_id=VOICE_ID&server=elevenlabs_cheap&model=eleven_multilingual_v2"
```

:::

Response: `data.fileUrl`.

---

## Tùy chọn: self-host gateway (Mode B)

→ [Gommo public API](./gommo-public-api.md) · [Audio TTS recipe](../cookbook/audio-tts.md)
