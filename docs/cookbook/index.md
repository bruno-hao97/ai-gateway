---
title: Cookbook
description: Task-oriented recipes — copy, run, ship
---

# Cookbook

Step-by-step recipes for **Mode B** (`/gateway/*`). Each page is one complete task with curl + PowerShell.

::: tip Try in browser first
[Playground](/app/playground/) — embedded on the docs site; sign in to run jobs.
:::

## Prerequisites (all recipes)

| Item | Value |
|------|--------|
| Gateway | `npm run dev` → `http://localhost:3001` |
| Token | Gommo user `access_token` — [Authentication](../authentication.md) |
| Catalog | Never guess `ratio` / `mode` / `resolution` / `duration` — [Models](../models/) |

```powershell
$env:TOKEN = "<access_token>"
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
```

## Recipes

### Get started

| Recipe | What you build |
|--------|----------------|
| [First image job (wait)](./image-job-wait.md) | Login → models → image with server poll |
| [Async job + poll loop](./job-poll-async.md) | `wait: false` → manual / loop poll |

### Media

| Recipe | What you build |
|--------|----------------|
| [Video or music job](./video-music-job.md) | Same pattern, different `type` |
| [Tool jobs (upscale, remove-bg)](./tool-jobs.md) | Upload → upscale / remove background |
| [Upload image](./upload-image.md) | Multipart upload → public URL |

### Platform

| Recipe | What you build |
|--------|----------------|
| [Chat + stream](./chat-stream.md) | Agent chat and SSE |
| [Audio TTS](./audio-tts.md) | Search voices → synthesize |
| [Gommo VietQR topup](./gommo-topup.md) | Credit packages → VietQR → poll sync |
| [PayOS topup (legacy)](./payos-topup.md) | Merchant PayOS + sendBalances |
| [Agent HTTP flow](./agent-http-flow.md) | Minimal loop for LLM agents / scripts |

## Next

- [Quickstart](../quickstart.md) — single linear path
- [API Reference](../reference/media.md) — full endpoint specs
- [OpenAPI](../reference/openapi.md)
