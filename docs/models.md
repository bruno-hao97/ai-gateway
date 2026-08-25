---
title: Models
description: How model catalogs and job types work on AI Gateway
---

# Models

AI Gateway does not host its own model weights — it **proxies Gommo’s catalog**. Your integration always starts with **list models**, then **create job** with fields allowed by that model.

## Job types

| `type` query | Typical use |
|--------------|-------------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech jobs |
| `music` | Music generation |
| `avatar-lipsync` | Talking avatar |
| `image-upscale`, `remove-bg`, … | See [Media reference](./reference/media.md) |

## List models (Mode B — recommended)

::: code-group

```bash [curl]
curl "http://localhost:3001/gateway/models?type=image" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

```powershell [PowerShell]
$h = @{ Authorization = "Bearer $env:TOKEN" }
Invoke-RestMethod "http://localhost:3001/gateway/models?type=image" -Headers $h
```

:::

Response shape (simplified):

```json
{
  "success": true,
  "data": [
    {
      "model": "imagegen_2_0",
      "name": "…",
      "ratios": [{ "value": "16:9", "label": "16:9" }],
      "modes": [{ "value": "low", "label": "Low" }],
      "resolutions": [{ "value": "2k", "label": "2K" }]
    }
  ]
}
```

Field names vary by model — **always** use arrays returned in the response.

## Create a job

Use `modelSlug` from the catalog (often `model` or `slug` field):

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "imagegen_2_0",
  "wait": true,
  "fields": {
    "prompt": "A product photo on white background",
    "ratio": "16:9",
    "mode": "low",
    "resolution": "2k"
  }
}
```

::: warning
Do not copy `ratio` / `mode` / `resolution` from docs or other models — read them from **your** models list for **that** slug.
:::

## Polling

| `wait` | Behavior |
|--------|----------|
| `true` | Gateway polls upstream (3.5s × 80) and returns `resultUrl` or timeout |
| `false` | Returns job id — client calls `GET /gateway/jobs/:id?media=image` |

Poll media: `image` | `video` | `music` (depends on job type).

## Mode A & C

| Mode | List models |
|------|-------------|
| **A Direct** | `POST https://v2.api.gommo.net/ai/models?type=…` |
| **C Proxy** | `POST http://localhost:3001/v2/ai/models?type=…` + form `domain` |

See [Integration modes](./routing/integration-modes.md) and [Media reference](./reference/media.md).

## Chat & audio models

Chat uses agent/server/model via `/gateway/chat` (defaults from gateway env).  
Audio TTS uses `server` + `model` per voice provider — see [Audio & TTS](./features/audio.md) and [Audio reference](./reference/audio.md).

## Next

→ [Models & routing](./routing/) · [Quickstart](./quickstart.md) · [Media & jobs reference](./reference/media.md)
