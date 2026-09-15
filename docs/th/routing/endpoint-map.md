---
title: แผนที่ endpoint
description: อ้างอิง endpoint ข้ามโหมด — Direct, REST และ Proxy
---

# แผนที่ endpoint

ตารางเปรียบเทียบสำหรับงานทั่วไป

**การ integrate สาธารณะ (แนะนำ):** เรียก Gommo โดยตรง — ดู [Gommo public API](../reference/gommo-public-api.md)  
**ทางเลือก dev:** แทน `{gateway}` ด้วย base URL ของ AI Gateway (เช่น `http://localhost:3001`)

## Media & jobs

| งาน | Mode A (Direct) | Mode B (REST) | Mode C (Proxy) |
|-----|-----------------|---------------|----------------|
| รายการโมเดล | `POST https://v2.api.gommo.net/ai/models?type={type}` | `GET {gateway}/gateway/models?type={type}` | `POST {gateway}/v2/ai/models?type={type}` |
| สร้าง job | `POST https://v2.api.gommo.net/ai/jobs/{type}/{slug}` | `POST {gateway}/gateway/jobs/{type}` | `POST {gateway}/v2/ai/jobs/{type}/{slug}` |
| Poll job | `POST https://v2.api.gommo.net/ai/jobs/{id}?media={media}` | `GET {gateway}/gateway/jobs/{id}?media={media}` | `POST {gateway}/v2/ai/jobs/{id}?media={media}` |

**ประเภท job:** `image`, `video`, `tts`, `music`, `avatar-lipsync`, `image-upscale`, `remove-bg`, `video-upscale`, `video-vfx`, `video-subtitle`, `video-cut`

**Poll media:** `image` | `video` | `music`

Body สร้าง job Mode B (JSON):

```json
{
  "modelSlug": "flux-dev",
  "wait": false,
  "fields": { "prompt": "…", "ratio": "16:9" }
}
```

Body สร้าง job Mode A/C (form): `domain`, `project_id`, `prompt`, `ratio`, …

## Upload

| งาน | Mode A | Mode B | Mode C |
|-----|--------|--------|--------|
| อัปโหลดภาพ | `POST v2…/ai/upload/image` | `POST {gateway}/gateway/upload/image` | `POST {gateway}/v2/ai/upload/image` |
| อัปโหลดวิดีโอ | `POST v2…/ai/upload/video` | `POST {gateway}/gateway/upload/video` | `POST {gateway}/v2/ai/upload/video` |

## Chat

| งาน | Mode A | Mode B | Mode C |
|-----|--------|--------|--------|
| Chat (JSON) | `POST api…/api/v2/chat` | `POST {gateway}/gateway/chat` | `POST {gateway}/api/v2/chat` |
| Chat (stream) | เหมือนกัน + SSE | เหมือนกัน — gateway pipe stream | เหมือนกัน — proxy pipe stream |
| **OpenAI shim** | — | `POST {gateway}/v1/chat/completions` | — |

Stream ทำงานเมื่อ URL มี `/chat` หรือ `Content-Type: text/event-stream`

OpenAI shim รับ `messages[]` มาตรฐาน + `stream: true` (optional) รูปแบบ model: `model::server` (เช่น `gpt-5.5::cheap`) หรือ default server จาก env

→ [OpenAI-compatible chat](../guides/openai-chat.md)

## Audio

| งาน | Mode A | Mode B | Mode C |
|-----|--------|--------|--------|
| Voices | `POST api…/ai/audio` | `POST {gateway}/gateway/audio/voices` | `POST {gateway}/ai/audio` |
| TTS | `POST api…/ai/audio` | `POST {gateway}/gateway/audio/tts` | `POST {gateway}/ai/audio` |
| Lists | `GET api…/…` | `GET {gateway}/gateway/audio/lists` | ผ่าน platform paths |

## Auth (ผ่าน platform host เสมอ)

| งาน | Mode A | Mode B/C |
|-----|--------|----------|
| Login | `POST api…/api/apps/go-mmo/auth/login` | `POST {gateway}/api/apps/go-mmo/auth/login` |
| Profile | `POST api…/api/apps/go-mmo/ai/me` | `POST {gateway}/api/apps/go-mmo/ai/me` |

Login และ `/ai/me` **ไม่** อยู่ใต้ `/gateway` — ใช้ auth proxy path บน gateway

## ฟิลด์ domain

| โหมด | ใครส่ง `domain` |
|------|----------------|
| A Direct | Client ในทุก form body |
| B REST | ไม่บังคับ — gateway ใช้ `GOMMO_API_DOMAIN` |
| C Proxy | Client ใน form (upstream บังคับ) |

## ค่าเริ่มต้น polling (Mode B `wait: true`)

| การตั้งค่า | ค่า |
|-----------|-----|
| Interval | 3500 ms |
| จำนวนครั้งสูงสุด | 80 (~4.7 นาที) |
| Webhook | ไม่มี — Gommo ไม่ push เมื่อเสร็จ |

## เอกสาร API ละเอียด

→ [Media & jobs](../reference/media.md) · [Upload](../reference/upload.md) · [Chat](../reference/chat.md) · [Audio](../reference/audio.md)

## ขั้นตอนถัดไป

→ [Integration modes](./integration-modes.md) · [Choosing a mode](./choosing-a-mode.md)
