---
title: Integration guide
description: How Gommo model catalogs work through AI Gateway
---

# Models integration guide

AI Gateway does not host its own model weights — it **proxies Gommo’s catalog**. Every media integration follows the same flow:

1. **List models** for a [job type](./job-types.md)
2. **Pick `modelSlug`** and allowed [parameters](./parameters.md) from the response
3. **Create job** — never guess fields
4. **Poll** — `wait: true` on REST or client poll

Browse the live catalog on the [Models tab](/models/) (catalog home).

## List models (Mode B — recommended)

**Bearer optional** — public catalog browse (OpenRouter-style). Create jobs still require auth.

```http
GET /gateway/models?type=image
Authorization: Bearer {access_token}   ← optional
```

Full request examples → [Media & jobs reference](../reference/media.md).

## Create a job

Use `modelSlug` from the catalog:

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

Field values must come from **your** models list for **that** slug → [Parameters](./parameters.md).

## Polling

| `wait` | Behavior |
|--------|----------|
| `true` | Gateway polls upstream (3.5s × 80) and returns `resultUrl` or timeout |
| `false` | Returns job id — client calls `GET /gateway/jobs/:id?media=image` |

## Other modes

| Mode | List models |
|------|-------------|
| **A Direct** | `POST https://v2.api.gommo.net/ai/models?type=…` |
| **C Proxy** | `POST http://localhost:3001/v2/ai/models?type=…` + form `domain` |

→ [Integration modes](../routing/integration-modes.md)

## Next

→ [Job types](./job-types.md) · [Parameters](./parameters.md) · [Quickstart](../quickstart.md)
