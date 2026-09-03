---
title: MCP use cases & prompts
description: Example chat prompts and workflows for all 79ai gommo_* tools
---

# MCP use cases & prompts

Copy these prompts into **Cursor**, **Claude Desktop**, or any host with **79ai MCP** connected. Say *"use 79ai MCP"* if you have multiple MCP servers.

## Quick reads (no credit cost)

| Goal | Example prompt |
|------|----------------|
| Credit balance | *Use 79ai MCP: check my credit balance.* |
| Full profile | *Use 79ai MCP: show my account info.* |
| Image models | *List all image models with ratio and mode options.* |
| Video models | *List video models and valid duration values.* |
| Recent jobs | *Show my recent image and video tasks.* |

---

## Create image (consumes credits)

```
Use 79ai MCP:
1. Check my credit balance
2. List image models
3. Create an image with [model from list], prompt "[your prompt]", ratio from catalog only
4. Use gommo_task_stream until done and give me the output URL
```

**Shorter:**

> 79ai MCP: list image models, then create a sunset beach photo using a catalog ratio, wait for the result.

---

## Create video (consumes credits)

```
Use 79ai MCP:
1. gommo_credit_balance
2. gommo_models_list type=video
3. gommo_video_create with confirmed model, prompt, ratio, duration from catalog
4. gommo_task_stream type=video until success or failure
```

---

## Poll manually (without stream)

> Check gommo_image_status for id_base `[paste id_base from create]`.

Or list jobs:

> Use gommo_tasks_list type=all limit=20 — find my latest image job.

---

## Notification when done

After a long job, ask the agent to notify you:

> When the video finishes, use gommo_notify_send with title "Done" and message including the output URL.

`gommo_notify_send` sends inbox + optional push/Telegram (if linked on your 79ai account). The agent does **not** call this automatically — you must ask.

---

## Full tour (all tool types)

One session to try read + create + list + notify:

```
79ai MCP full tour:
1. Account info + credit balance
2. List image and video models
3. Create one small test image (cheap model if available)
4. gommo_task_stream until URL
5. gommo_tasks_list — show recent jobs
6. (Optional) gommo_notify_send "Tour complete" with the image URL
```

---

## Agent rules (remind the AI)

Paste into project rules or chat if the agent guesses enums:

- Always call **`gommo_models_list`** before create
- Never invent `ratio`, `mode`, `resolution`, `duration`
- After create, poll with **`id_base`** only — never internal `task_id`
- Check **`gommo_credit_balance`** before image/video create

---

## Standard workflow diagram

```
gommo_credit_balance
        ↓
gommo_models_list
        ↓
gommo_image_create  or  gommo_video_create
        ↓
gommo_task_stream  (or gommo_*_status)
        ↓
gommo_notify_send  (optional)
        ↓
gommo_tasks_list  (review history)
```

---

## Next

→ [Tool reference](./tools.md) · [Other hosts](./other-hosts.md)
