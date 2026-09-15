---
title: Parameters
description: ratio, mode, resolution, duration — always from the models catalog
---

# Parameters

Gommo models expose allowed fields in the **models list response**. Upstream rejects guessed values.

## Response shape (simplified)

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

Field names vary by model — **always** use arrays returned in the response for **that** model id.

## Common job fields

| Field | Source | Notes |
|-------|--------|-------|
| `ratio` | `ratios[]` in catalog | Aspect ratio |
| `mode` | `modes[]` | Quality/speed tier |
| `resolution` | `resolutions[]` | Output size |
| `duration` | catalog (video/music) | Length — never guess |
| `prompt` | your app | Text prompt |
| model id | `model`, `slug`, or `id_base` | URL path on create |

::: warning
Do not copy `ratio` / `mode` / `resolution` / `duration` from docs, other models, or examples — read them from **your** models list for **that** model.
:::

## Slug field names

Upstream may use `model`, `slug`, `model_id`, or `id_base`. Use the id from the catalog in the create URL: `POST …/ai/jobs/{type}/{model_id}`.

## Tool jobs

Some tool models expect different input keys (`url`, `image`, …). Check `POST …/ai/models?type=…` or the RESPONSE panel in [Playground](/app/playground/).

## Next

→ [Job types](./job-types.md) · [Media & jobs reference](../reference/media.md) · [Quickstart](../quickstart.md)
