---
title: Audio
description: ค้นหาเสียง TTS และประวัติ audio บน Gommo
---

# Audio

Upstream: `POST https://api.gommo.net/ai/audio` (form urlencoded)

| การดำเนินการ | Gommo (Direct) | Gateway REST (ทางเลือก) |
|-----------|----------------|-------------------------|
| Search voices | `action_type=searchVoices` | `POST /gateway/audio/voices` |
| TTS create | `action_type=create` | `POST /gateway/audio/tts` |
| List history | `action_type=getLists` | `GET /gateway/audio/lists` |

Auth: `access_token` ใน form (หรือ Bearer) ส่ง `domain` และ `project_id` ทุกครั้ง

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

Response: `data.fileUrl`

---

## ทางเลือก: self-host gateway (Mode B)

→ [Gommo public API](./gommo-public-api.md) · [Audio TTS recipe](../cookbook/audio-tts.md)
