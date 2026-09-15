---
title: โมเดล & routing
description: โมเดล Gommo โฮสต์ upstream และโหมดการเชื่อมต่อผ่าน AI Gateway
---

# โมเดล & routing

AI Gateway อยู่ระหว่าง client กับ **โฮสต์ upstream Gommo สองตัว** เกตเวย์ไม่โฮสต์โมเดล — คุณ **route** คำขอไปโฮสต์และโหมดที่ถูก (Direct, REST หรือ Proxy)

## สแต็ก routing

```
Client
  │
  ├─ โหมด A ──► v2.api.gommo.net  (งานมีเดีย)
  │          └─► api.gommo.net    (auth, chat, audio)
  │
  └─ โหมด B/C ──► AI Gateway (:3001)
                    ├─ /gateway/*     REST wrap (โหมด B)
                    ├─ /v2/*          ──► v2.api.gommo.net
                    ├─ /ai/*, /api/v2/*  ──► api.gommo.net
                    └─ /api/apps/go-mmo/*  auth proxy
```

## สามโหมดการเชื่อมต่อ

| | โหมด A Direct | โหมด B REST | โหมด C Proxy |
|---|---------------|-------------|--------------|
| Base URL | โฮสต์ Gommo | `{gateway}/gateway` | `{gateway}` |
| Auth | Bearer / form upstream | `Authorization: Bearer` | ส่งต่อ |
| Domain ฝั่ง client | ต้องมี (form) | **ทางเลือก** (env เซิร์ฟเวอร์) | ต้องมี (form) |
| ซ่อน URL upstream | ไม่ | ใช่ | ใช่ |
| Poll ในตัว | ไม่ | `wait: true` | Gommo envelope ดิบ |
| เหมาะสำหรับ | Backend ที่เชื่อถือได้ | แอป/automation ใหม่ | FE Gommo legacy |

`{gateway}` = `http://localhost:3001` (dev) หรือ URL deploy ของคุณ

## ลำดับ routing โมเดล

ทุกการเชื่อมต่อมีเดียทำตามลำดับเดียวกัน — ทุกโหมด:

1. **ลิสต์โมเดล** — `type=image|video|music|…`
2. **เลือก `modelSlug`** และฟิลด์ที่อนุญาต (`ratio`, `mode`, `resolution`, …) จาก response
3. **สร้างงาน** — ห้ามเดาพารามิเตอร์
4. **Poll** — gateway (`wait: true`) หรือ client (`GET /gateway/jobs/:id`)

ดู [ภาพรวมโมเดล](../models/) สำหรับรายละเอียดแคตตาล็อก

## แยก upstream

Gommo แยก API สองโฮสต์:

| โฮสต์ | API ทั่วไป |
|-------|------------|
| **`v2.api.gommo.net`** | ลิสต์โมเดล งานมีเดีย อัปโหลด (V2) |
| **`api.gommo.net`** | Login `/ai/me` แชท เสียง feed |

Gateway map env ไปโฮสต์เหล่านี้ รายละเอียด → [โฮสต์ upstream](./upstream-hosts.md)

## แผนที่ endpoint ย่อ

| การดำเนินการ | โหมด B (REST) | โหมด C (proxy) | โหมด A (direct) |
|-------------|---------------|----------------|-----------------|
| ลิสต์โมเดล | `GET /gateway/models?type=` | `POST /v2/ai/models?type=` | `POST v2…/ai/models?type=` |
| สร้างงาน | `POST /gateway/jobs/:type` | `POST /v2/ai/jobs/:type/:slug` | เหมือน upstream |
| Poll งาน | `GET /gateway/jobs/:id?media=` | `POST /v2/ai/jobs/:id?media=` | เหมือน upstream |
| แชท | `POST /gateway/chat` | `POST /api/v2/chat` | `POST api…/api/v2/chat` |
| Login | — | `POST /api/apps/go-mmo/auth/login` | เหมือน upstream |

ตารางฉบับเต็ม → [แผนที่ endpoint](./endpoint-map.md)

## เลือกโหมด

→ [เลือกโหมด](./choosing-a-mode.md) — decision tree สำหรับ SPA legacy backend ใหม่ หรือ upstream ตรง

## ในส่วนนี้

- [โฮสต์ upstream](./upstream-hosts.md) — env หน้าที่โฮสต์
- [โหมดการเชื่อมต่อ](./integration-modes.md) — โหมด A / B / C ลึก
- [แผนที่ endpoint](./endpoint-map.md) — อ้างอิมข้ามโหมด
- [เลือกโหมด](./choosing-a-mode.md) — ใช้เมื่อไหร่

## ถัดไป

→ [ภาพรวมโมเดล](../models/) · [อ้างอิงมีเดีย](../reference/media.md) · [เริ่มต้นใช้งาน](../quickstart.md)
