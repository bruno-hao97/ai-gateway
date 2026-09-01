---
title: MCP tool reference
description: gommo_* tools mapped to AI Gateway HTTP endpoints
---

# MCP tool reference

Package: **`@ai-gateway/mcp-server`** · Transport: **stdio**

## Rules (all media tools)

1. Call **`gommo_models_list`** before create
2. **Never invent** `ratio`, `mode`, `resolution`, `duration`
3. After create, keep **`id_base`** — poll with status or `gommo_task_stream`
4. Image/video create **consumes credits** — check `gommo_credit_balance` first

---

## `gommo_models_list`

List catalog models for a media type.

| Param | Type | Required |
|-------|------|----------|
| `type` | `image` \| `video` \| `audio` | yes |

`audio` maps to gateway `music` catalog.

**Gateway:** `GET /gateway/models?type={type}`

---

## `gommo_credit_balance`

Latest credit balance for authenticated user.

**Gateway:** `POST /api/apps/go-mmo/ai/me` (via proxy)

---

## `gommo_account_info`

Full profile + balances from `/ai/me`.

**Gateway:** `POST /api/apps/go-mmo/ai/me`

---

## `gommo_image_create`

Create async image job. Returns `id_base`.

| Param | Required | Notes |
|-------|----------|-------|
| `model` | yes | From models list |
| `prompt` | yes | |
| `ratio`, `resolution`, `mode` | catalog | Confirm with user |
| `images`, `references`, `subjects` | optional | `{ url }[]` |

**Gateway:** `POST /gateway/jobs/image` (`wait: false`)

---

## `gommo_image_status`

| Param | Required |
|-------|----------|
| `id_base` | yes |

**Gateway:** `GET /gateway/jobs/{id}?media=image`

---

## `gommo_video_create`

Create async video job. Supports start/end frames, references, motion, extend, multi-shot (see tool schema).

| Param | Required |
|-------|----------|
| `model` | yes |
| `prompt` | often |
| `ratio`, `resolution`, `duration`, `mode` | from catalog |

**Gateway:** `POST /gateway/jobs/video` (`wait: false`)

---

## `gommo_video_status`

| Param | Required |
|-------|----------|
| `id_base` | yes |

**Gateway:** `GET /gateway/jobs/{id}?media=video`

---

## `gommo_task_stream`

Poll until done, fail, or timeout.

| Param | Default | Description |
|-------|---------|-------------|
| `type` | — | `image` or `video` |
| `id_base` | — | From create response |
| `interval_seconds` | 30 | 5–60 |
| `max_wait_seconds` | 1800 | Up to 30 min |

**Gateway:** repeated `GET /gateway/jobs/{id}?media=`

---

## Example agent flow

```
1. gommo_credit_balance
2. gommo_models_list { type: "image" }
3. gommo_image_create { model, prompt, ratio }
4. gommo_task_stream { type: "image", id_base }
```

## Coming soon

| Tool | Notes |
|------|-------|
| `gommo_tasks_list` | Recent jobs list |
| `gommo_notify_send` | Push/inbox when job done |

## Next

→ [Setup Cursor](./setup-cursor.md) · [Media jobs](../features/media-jobs.md) · [OpenAPI](/openapi.yaml)
