---
title: Integration guide
description: How Gommo model catalogs work — public API integration
---

# Models integration guide

Integrate with the [Gommo public API](../reference/gommo-public-api.md) on **`https://v2.api.gommo.net`**. Auth: `Authorization: Bearer <access_token>`. Form bodies include **`domain`** (your registration domain, e.g. `79ai.net`).

Gommo hosts the model catalog. Every media integration follows the same flow:

1. **List models** for a [job type](./job-types.md)
2. **Pick `model` / slug** and allowed [parameters](./parameters.md) from the response
3. **Create job** — never guess fields
4. **Poll** — client poll every **3.5s**, max **80** attempts (~5 min)

Browse the live catalog on the [Models tab](/models/).

## List models (recommended)

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

Full request examples → [Media & jobs reference](../reference/media.md).

## Create a job

Use the model id from the catalog (field name may be `model`, `slug`, or `id_base` in the response):

```http
POST https://v2.api.gommo.net/ai/jobs/image/{model_id}
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default&prompt=A product photo on white background&ratio=16:9&mode=low&resolution=2k
```

Field values must come from **your** models list for **that** model — see [Parameters](./parameters.md).

## Polling

Gommo does not webhook job completion. Poll until terminal status:

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default
```

| Setting | Value |
|---------|-------|
| Interval | **3500 ms** |
| Max attempts | **80** |
| Poll `media` | `image` \| `video` \| `music` (match job type) |

## Optional: self-host gateway (dev)

This repo also exposes JSON REST at `{gateway}/gateway/*` (`wait: true`, optional `domain` auto-fill). Use only when self-hosting — see [Integration modes](../routing/integration-modes.md#mode-b-gateway-rest).

## Next

→ [Job types](./job-types.md) · [Parameters](./parameters.md) · [Quickstart](../quickstart.md)
