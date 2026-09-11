---
title: Gommo public API
description: Official Gommo hosts — v2.api.gommo.net and api.gommo.net (no gateway wrapper)
---

# Gommo public API

Use these URLs when integrating **directly with Gommo** (79ai-style). Auth: `Authorization: Bearer <access_token>` on HTTPS. Form bodies include `domain` (your app domain, e.g. `79ai.net`).

## Hosts

| Host | Use for |
|------|---------|
| **`https://v2.api.gommo.net`** | Models, create/poll jobs, upload image/video, album library |
| **`https://api.gommo.net`** | Login, `/ai/me`, info jobs, library lists, chat, platform audio |

The [playground](/app/playground/) **Endpoints** tab shows the full URL per operation (v2 vs auth).

## Media & jobs (v2)

| Operation | Method | URL |
|-----------|--------|-----|
| List models | `GET` or `POST` | `https://v2.api.gommo.net/ai/models?type={type}` |
| Create job | `POST` | `https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` |
| Poll job | `POST` | `https://v2.api.gommo.net/ai/jobs/{id_base}?media=image\|video\|music` |
| Upload image | `POST` | `https://v2.api.gommo.net/ai/upload/image` |
| Upload video | `POST` | `https://v2.api.gommo.net/ai/upload/video` |

Create/poll use **`application/x-www-form-urlencoded`** (not gateway JSON). Always load models first — never guess `ratio`, `mode`, `resolution`, or `duration`.

Poll: **3.5s** interval, max **80** attempts (~5 min). No webhooks.

## Library & albums

| Operation | Host | Path |
|-----------|------|------|
| Image album | v2 | `POST /ai/library/album-images` |
| Video album | v2 | `POST /ai/library/album-videos` |
| Music library | v2 | `POST /ai/library/musics` |
| Audio library | v2 | `POST /ai/library/audios` |

Album body (typical): `domain`, `project_id`, `limit`, `order_by`, `sort_by` (+ `access_token` in form or Bearer header).

## Job status (auth)

| Operation | URL |
|-----------|-----|
| Image info | `POST https://api.gommo.net/ai/info/image/{id_base}` |
| Video info | `POST https://api.gommo.net/ai/info/video/{id}` |
| Music info | `POST https://api.gommo.net/ai/info/music/{id_base}` |

## Auth & profile (auth)

| Operation | URL |
|-----------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

## Chat & audio (auth)

| Operation | URL |
|-----------|-----|
| Chat / stream | `POST https://api.gommo.net/api/v2/chat` |
| Voices / TTS | `POST https://api.gommo.net/ai/audio` |

## AI Gateway (optional dev)

For local development, this repo also exposes **Mode B** REST at `{gateway}/gateway/*` (JSON job body, optional `wait: true`). See [Integration modes](../routing/integration-modes.md) and [Endpoint map](../routing/endpoint-map.md).

## OpenAPI

Public paths are listed in [openapi.yaml](/openapi.yaml) under tags **Gommo V2** and **Gommo Platform**. Gateway-only paths use server `http://localhost:3001`.

## Next

→ [Quickstart](../quickstart.md) · [Authentication](../authentication.md) · [Media & jobs](./media.md) · [Endpoint map](../routing/endpoint-map.md)
