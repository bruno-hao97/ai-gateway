---
title: Gommo public API
description: Host Gommo chính thức — v2.api.gommo.net và api.gommo.net (không qua gateway)
---

# Gommo public API

Dùng các URL này khi tích hợp **trực tiếp Gommo** (giống 79ai). Auth: `Authorization: Bearer <access_token>` qua HTTPS. Body form có `domain` (domain app, vd. `79ai.net`).

## Host

| Host | Dùng cho |
|------|----------|
| **`https://v2.api.gommo.net`** | Models, create/poll job, upload ảnh/video, album library |
| **`https://api.gommo.net`** | Login, `/ai/me`, info job, library list, chat, audio platform |

Tab **Endpoints** trên [playground](/app/playground/) hiển thị URL đầy đủ theo từng operation (v2 vs auth).

## Media & jobs (v2)

| Thao tác | Method | URL |
|----------|--------|-----|
| List models | `GET` hoặc `POST` | `https://v2.api.gommo.net/ai/models?type={type}` |
| Create job | `POST` | `https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` |
| Poll job | `POST` | `https://v2.api.gommo.net/ai/jobs/{id_base}?media=image\|video\|music` |
| Upload ảnh | `POST` | `https://v2.api.gommo.net/ai/upload/image` |
| Upload video | `POST` | `https://v2.api.gommo.net/ai/upload/video` |

Create/poll dùng **`application/x-www-form-urlencoded`** (không phải JSON gateway). Luôn gọi models trước — không đoán `ratio`, `mode`, `resolution`, `duration`.

Poll: **3.5s**, tối đa **80** lần (~5 phút). Không webhook.

## Library & album

| Thao tác | Host | Path |
|----------|------|------|
| Album ảnh | v2 | `POST /ai/library/album-images` |
| Album video | v2 | `POST /ai/library/album-videos` |
| Thư viện nhạc | v2 | `POST /ai/library/musics` |
| Thư viện audio | v2 | `POST /ai/library/audios` |

Body album (thường): `domain`, `project_id`, `limit`, `order_by`, `sort_by` (+ `access_token` trong form hoặc Bearer).

## Job status (auth)

| Thao tác | URL |
|----------|-----|
| Info ảnh | `POST https://api.gommo.net/ai/info/image/{id_base}` |
| Info video | `POST https://api.gommo.net/ai/info/video/{id}` |
| Info nhạc | `POST https://api.gommo.net/ai/info/music/{id_base}` |

## Auth & profile (auth)

| Thao tác | URL |
|----------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

## Chat & audio (auth)

| Thao tác | URL |
|----------|-----|
| Chat / stream | `POST https://api.gommo.net/api/v2/chat` |
| Voices / TTS | `POST https://api.gommo.net/ai/audio` |

## AI Gateway (dev tùy chọn)

Repo này còn **Mode B** REST tại `{gateway}/gateway/*` (JSON job, `wait: true`) cho dev local. Xem [Integration modes](../routing/integration-modes.md) và [Endpoint map](../routing/endpoint-map.md).

## OpenAPI

Path public trong [openapi.yaml](/openapi.yaml), tag **Gommo V2** và **Gommo Platform**. Path chỉ gateway dùng server `http://localhost:3001`.

## Tiếp theo

→ [Quickstart](../quickstart.md) · [Authentication](../authentication.md) · [Media & jobs](./media.md) · [Endpoint map](../routing/endpoint-map.md)
