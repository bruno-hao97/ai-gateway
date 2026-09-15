---
title: โหมดการเชื่อมต่อ
description: โหมด A Direct, โหมด B REST และโหมด C Proxy — auth, domain และ routing
---

# โหมดการเชื่อมต่อ

AI Gateway รองรับสามวิธีเข้าถึง Gommo ทุกโหมดใช้ **token ผู้ใช้เดียวกัน** และ **แคตตาล็อกโมเดลเดียวกัน** — ต่างแค่รูปแบบ URL และความสะดวก

## เปรียบเทียบเร็ว

| | โหมด A Direct | โหมด B REST | โหมด C Proxy |
|---|---------------|-------------|--------------|
| Base URL | `v2.api.gommo.net` / `api.gommo.net` | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | ส่งต่อ headers + body |
| Domain ฝั่ง client | ต้องมีใน form | **ทางเลือก** (เซิร์ฟเวอร์ `GOMMO_API_DOMAIN`) | ต้องมีใน form |
| ซ่อน URL upstream | ไม่ | ใช่ | ใช่ |
| Poll / wrap | ทำเอง | `wait: true` ในตัว | Gommo envelope ดิบ |
| รูปแบบ response | Gommo native | `{ success, data, message, code }` | Gommo native |
| เหมาะสำหรับ | Backend ไม่มี gateway | การเชื่อมต่อใหม่ | FE Gommo legacy |

`{gateway}` = `http://localhost:3001` (dev) หรือ URL API production

---

## โหมด A — Direct Gommo {#mode-a-direct-gommo}

เรียกโฮสต์ upstream โดยตรงจาก backend ที่เชื่อถือได้ ไม่มี gateway ในเส้นทาง

**งานมีเดีย V2:**

```http
POST https://v2.api.gommo.net/ai/jobs/image/{modelSlug}
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

domain={GOMMO_API_DOMAIN}&project_id=default&prompt=...&ratio=...
```

**Auth, แชท, เสียง:**

```http
POST https://api.gommo.net/api/apps/go-mmo/auth/login
POST https://api.gommo.net/api/apps/go-mmo/ai/me
POST https://api.gommo.net/api/v2/chat
POST https://api.gommo.net/ai/audio
```

ใช้เมื่อไม่พึ่ง gateway — เช่น แอปมือถือที่มี backend เอง หรือบริการภายในที่เชื่อม Gommo แล้ว

::: warning คุณต้อง poll เอง
Gommo ไม่ webhook เมื่องานเสร็จ ทำ poll (ช่วง 3.5s ~80 ครั้ง) หรือใช้โหมด B `wait: true`
:::

---

## โหมด B — Gateway REST {#mode-b-gateway-rest}

JSON API บน `/gateway/*` gateway แปล REST body เป็น form call upstream และ poll ทางเลือก

**เติม domain อัตโนมัติ:** ถ้า client ไม่ส่ง `domain` gateway inject `GOMMO_API_DOMAIN` จาก env เซิร์ฟเวอร์

| Gateway endpoint | เทียบเท่า upstream |
|------------------|---------------------|
| `GET /gateway/models?type=` | `POST /ai/models` (v2) |
| `POST /gateway/jobs/:type` | `POST /ai/jobs/:type/:slug` |
| `GET /gateway/jobs/:id?media=` | poll งาน |
| `POST /gateway/upload/image` | `POST /ai/upload/image` |
| `POST /gateway/upload/video` | `POST /ai/upload/video` |
| `POST /gateway/chat` | `POST /api/v2/chat` |
| `POST /gateway/audio/voices` | `POST /ai/audio` |
| `POST /gateway/audio/tts` | TTS ผ่าน platform |
| `GET /gateway/audio/lists` | รายการเสียง |

Auth: `Authorization: Bearer {user_access_token}`

ตัวอย่างสร้างงาน:

```http
POST /gateway/jobs/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "modelSlug": "flux-dev",
  "wait": true,
  "fields": {
    "prompt": "A sunset",
    "ratio": "16:9"
  }
}
```

ข้อผิดพลาด:

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

แนะนำสำหรับ script ใหม่ SPA (พร้อม CORS ถ้า cross-origin) และ automation

---

## โหมด C — Gateway proxy {#mode-c-gateway-proxy}

ส่งต่อโปร่งใส — path เดียวกับ Gommo แต่ base URL เป็น gateway

| Mount บน gateway | Upstream | หมายเหตุ |
|------------------|----------|----------|
| `/v2/*` | `GOMMO_API_BASE_URL` | ตัด `/v2` |
| `/ai/*` | `GOMMO_AUTH_BASE_URL` | |
| `/api/v2/*` | `GOMMO_AUTH_BASE_URL` | Stream สำหรับ `/chat` หรือ SSE |
| `/api/apps/go-mmo/*` | `GOMMO_AUTH_BASE_URL` | Login, me, balances |

ตัวอย่าง map URL:

```
POST /v2/ai/jobs/image/flux-dev  →  POST https://v2.api.gommo.net/ai/jobs/image/flux-dev
POST /api/v2/chat                →  POST https://api.gommo.net/api/v2/chat
POST /api/apps/go-mmo/auth/login →  POST https://api.gommo.net/api/apps/go-mmo/auth/login
```

- ขีด body **50 MB** (raw)
- Pipe stream สำหรับแชท / SSE
- Form body ต้องมี `domain` — ใช้ **`GOMMO_API_DOMAIN`** (ตรงโดเมนลงทะเบียนผู้ใช้)

ใช้เมื่อย้าย FE Gommo ที่มีอยู่: เปลี่ยน base URL เป็น gateway คง path และ form body

---

## Auth ข้ามโหมด

| ตระกูล route | สไตล์ token |
|--------------|-------------|
| งาน V2 (`/v2`, `/gateway/jobs`) | `Authorization: Bearer` |
| Route form platform | `access_token` ใน form (+ Bearer บน `/api/v2` เมื่อต้องการ) |
| Login | ไม่มี token — คืน `access_token` |

ดู [การยืนยันตัวตน](../authentication.md)

---

## แคตตาล็อกและกฎเดียวกัน

ทั้งสามโหมด:

1. ลิสต์โมเดลก่อนสร้างงาน — ห้ามเดา `ratio` / `mode` / `resolution` / `duration`
2. ใช้ Gommo `access_token` ของผู้ใช้
3. เคารพ semantics งาน async (poll หรือ `wait: true`)

## ถัดไป

→ [เลือกโหมด](./choosing-a-mode.md) · [แผนที่ endpoint](./endpoint-map.md) · [ภาพรวมโมเดล](../models/)
