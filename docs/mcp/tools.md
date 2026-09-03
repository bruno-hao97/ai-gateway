---
title: MCP tool reference
description: All 10 gommo_* tools on 79ai remote MCP
---

# MCP tool reference

**Host:** [79ai remote MCP](./other-hosts.md) — `https://api.gommo.net/api/v2/gommo-mcp`  
**Tools enabled when connected:** 10

Optional [self-hosted](./self-hosted.md) `@ai-gateway/mcp-server` exposes a subset (no `gommo_tasks_list` / `gommo_notify_send` in v0.1).

## Tool overview

| Tool | Purpose | Costs credits |
|------|---------|---------------|
| `gommo_account_info` | Profile, partner info, balances | No |
| `gommo_credit_balance` | Quick `credits_ai` check | No |
| `gommo_models_list` | Catalog — ratio/mode/duration enums | No |
| `gommo_image_create` | Start async image job → `id_base` | **Yes** |
| `gommo_image_status` | One-shot image job status | No |
| `gommo_video_create` | Start async video job → `id_base` | **Yes** |
| `gommo_video_status` | One-shot video job status | No |
| `gommo_tasks_list` | Recent image/video tasks | No |
| `gommo_task_stream` | Poll until done / fail / timeout | No |
| `gommo_notify_send` | Inbox + push + Telegram alert | No |

## Rules (all media tools)

1. Call **`gommo_models_list`** before create
2. **Never invent** `ratio`, `mode`, `resolution`, `duration`
3. After create, keep **`id_base`** — poll with status, stream, or tasks list
4. Image/video create **consumes credits** — check `gommo_credit_balance` first

Example prompts: [Use cases & prompts](./use-cases.md)

---

## `gommo_account_info`

Full account profile and balance payload from `/ai/me`.

**Use when:** user asks who they are, subscription, full balance breakdown.

---

## `gommo_credit_balance`

Latest **`credits_ai`** for the authenticated user (faster than full account info).

**Use when:** before any paid generation.

---

## `gommo_models_list`

List models and valid enums for a media type.

| Param | Type | Required |
|-------|------|----------|
| `type` | `image` \| `video` \| `audio` | yes |

`audio` maps to the music catalog.

**Use when:** always before `gommo_image_create` or `gommo_video_create`.

---

## `gommo_image_create`

Create async image job. Returns **`id_base`**.

| Param | Required | Notes |
|-------|----------|-------|
| `model` | yes | From models list |
| `prompt` | yes | |
| `ratio`, `resolution`, `mode` | catalog | From models list only |
| `images`, `references`, `subjects` | optional | `{ url }[]` |

**Use when:** user wants a new image. Follow with `gommo_task_stream` or `gommo_image_status`.

---

## `gommo_image_status`

Latest status and output URL for one image job.

| Param | Required |
|-------|----------|
| `id_base` | yes |

**Use when:** single status check. Prefer `gommo_task_stream` to wait automatically.

---

## `gommo_video_create`

Create async video job. Returns **`id_base`**.

Supports start/end frames, references, motion, extend, multi-shot (see tool schema in client).

| Param | Required |
|-------|----------|
| `model` | yes |
| `prompt` | often |
| `ratio`, `resolution`, `duration`, `mode` | from catalog |

---

## `gommo_video_status`

One-shot status for a video job by `id_base`.

---

## `gommo_tasks_list`

List recent image and/or video tasks.

| Param | Type | Default |
|-------|------|---------|
| `type` | `all` \| `image` \| `video` | `all` |
| `limit` | 1–100 | — |
| `project_id` | string | optional |
| `after_id` | string | pagination |

**Use when:** find past jobs, fallback if status by id fails, audit history.

---

## `gommo_task_stream`

Poll until success, failure, or timeout.

| Param | Default | Description |
|-------|---------|-------------|
| `type` | — | `image` or `video` |
| `id_base` | — | From create response |
| `interval_seconds` | 30 | 5–60 |
| `max_wait_seconds` | 1800 | Up to 30 min |

**Use when:** waiting for generation to finish (recommended after create).

---

## `gommo_notify_send`

Send notification to the authenticated user: inbox + optional OneSignal push + linked Telegram.

| Param | Description |
|-------|-------------|
| `title` | Notification title |
| `message` | Body / Telegram text |
| `url` | Optional deep link (default `/chat`) |
| `send_push` | Default `true` |
| `send_telegram` | Default `true` |
| `images` | Optional image URLs for Telegram |

**Use when:** user asks to be pinged after a long job. Agent must call **intentionally** — not automatic.

---

## Example flows

**Image:**

```
gommo_credit_balance → gommo_models_list → gommo_image_create → gommo_task_stream
```

**Video + notify:**

```
gommo_models_list (video) → gommo_video_create → gommo_task_stream → gommo_notify_send
```

**Debug:**

```
gommo_tasks_list → gommo_image_status (id_base)
```

## HTTP equivalents

Building an app instead of IDE? Map tools to [`/gateway/*`](../routing/endpoint-map.md) — see [OpenAPI](/openapi.yaml).

## Next

→ [Use cases](./use-cases.md) · [Other hosts](./other-hosts.md)
