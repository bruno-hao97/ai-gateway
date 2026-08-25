---
title: Models
description: Catalog model và job types trên AI Gateway
---

# Models

AI Gateway không host model weights — **proxy catalog Gommo**. Luôn bắt đầu bằng **list models**, rồi **create job** với field model cho phép.

## Job types

| Query `type` | Dùng cho |
|--------------|----------|
| `image` | Text-to-image, edit |
| `video` | Text/image-to-video |
| `tts` | Text-to-speech |
| `music` | Tạo nhạc |
| `avatar-lipsync` | Avatar nói |
| `image-upscale`, `remove-bg`, … | Xem [Media reference](../reference/media.md) |

## List models (Mode B — khuyến nghị)

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

Response (rút gọn):

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

Tên field thay đổi theo model — **luôn** dùng mảng trong response.

## Tạo job

Dùng `modelSlug` từ catalog (thường field `model` hoặc `slug`):

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "imagegen_2_0",
  "wait": true,
  "fields": {
    "prompt": "Ảnh sản phẩm nền trắng",
    "ratio": "16:9",
    "mode": "low",
    "resolution": "2k"
  }
}
```

::: warning
Không copy `ratio` / `mode` / `resolution` từ docs hoặc model khác — đọc từ **models list** của **slug** đó.
:::

## Polling

| `wait` | Hành vi |
|--------|---------|
| `true` | Gateway poll upstream (3.5s × 80), trả `resultUrl` hoặc timeout |
| `false` | Trả job id — client gọi `GET /gateway/jobs/:id?media=image` |

Media poll: `image` | `video` | `music` (tùy loại job).

## Mode A & C

| Mode | List models |
|------|-------------|
| **A Direct** | `POST https://v2.api.gommo.net/ai/models?type=…` |
| **C Proxy** | `POST http://localhost:3001/v2/ai/models?type=…` + form `domain` |

Xem [Integration modes](./routing/integration-modes.md) và [Media reference](../reference/media.md).

## Chat & audio

Chat dùng agent/server/model qua `/gateway/chat` (default từ env gateway).  
Audio TTS dùng `server` + `model` theo provider — xem [Audio & TTS](./features/audio.md) và [Audio reference](./reference/audio.md).

## Tiếp theo

→ [Models & routing](./routing/) · [Quickstart](./quickstart.md) · [Media reference](../reference/media.md)
