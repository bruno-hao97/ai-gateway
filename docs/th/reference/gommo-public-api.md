---
title: Gommo public API
description: โฮสต์ Gommo อย่างเป็นทางการ — v2.api.gommo.net และ api.gommo.net (ไม่ผ่าน gateway wrapper)
---

# Gommo public API

ใช้ URL เหล่านี้เมื่อ integrate **ตรงกับ Gommo** (แบบ 79ai) Auth: `Authorization: Bearer <access_token>` บน HTTPS Form body มี `domain` (โดเมนแอป เช่น `79ai.net`)

## โฮสต์

| โฮสต์ | ใช้สำหรับ |
|-------|-----------|
| **`https://v2.api.gommo.net`** | โมเดล สร้าง/poll งาน อัปโหลดรูป/วิดีโอ คลัง album |
| **`https://api.gommo.net`** | Login, `/ai/me`, info งาน รายการคลัง แชท audio แพลตฟอร์ม |

แท็บ **Endpoints** ใน [playground](/th/app/playground/) แสดง URL ครบต่อ operation (v2 vs auth)

## มีเดีย & งาน (v2)

| การดำเนินการ | Method | URL |
|-------------|--------|-----|
| รายการโมเดล | `GET` หรือ `POST` | `https://v2.api.gommo.net/ai/models?type={type}` |
| สร้างงาน | `POST` | `https://v2.api.gommo.net/ai/jobs/{type}/{model_id}` |
| Poll งาน | `POST` | `https://v2.api.gommo.net/ai/jobs/{id_base}?media=image\|video\|music` |
| อัปโหลดรูป | `POST` | `https://v2.api.gommo.net/ai/upload/image` |
| อัปโหลดวิดีโอ | `POST` | `https://v2.api.gommo.net/ai/upload/video` |

สร้าง/poll ใช้ **`application/x-www-form-urlencoded`** (ไม่ใช่ JSON ของ gateway) โหลดโมเดลก่อนเสมอ — ห้ามเดา `ratio`, `mode`, `resolution`, หรือ `duration`

Poll: ช่วง **3.5s** สูงสุด **80** ครั้ง (~5 นาที) ไม่มี webhook

## คลัง & album

| การดำเนินการ | โฮสต์ | Path |
|-------------|-------|------|
| Album รูป | v2 | `POST /ai/library/album-images` |
| Album วิดีโอ | v2 | `POST /ai/library/album-videos` |
| คลังเพลง | v2 | `POST /ai/library/musics` |
| คลังเสียง | v2 | `POST /ai/library/audios` |

Body album (ทั่วไป): `domain`, `project_id`, `limit`, `order_by`, `sort_by` (+ `access_token` ใน form หรือ Bearer header)

## สถานะงาน (auth)

| การดำเนินการ | URL |
|-------------|-----|
| ข้อมูลรูป | `POST https://api.gommo.net/ai/info/image/{id_base}` |
| ข้อมูลวิดีโอ | `POST https://api.gommo.net/ai/info/video/{id}` |
| ข้อมูลเพลง | `POST https://api.gommo.net/ai/info/music/{id_base}` |

## Auth & โปรไฟล์ (auth)

| การดำเนินการ | URL |
|-------------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

## แชท & เสียง (auth)

| การดำเนินการ | URL |
|-------------|-----|
| แชท / stream | `POST https://api.gommo.net/api/v2/chat` |
| Voices / TTS | `POST https://api.gommo.net/ai/audio` |

## AI Gateway (dev ทางเลือก)

สำหรับพัฒนา local repo นี้มี REST **Mode B** ที่ `{gateway}/gateway/*` (JSON body งาน, `wait: true` ทางเลือก) ดู [โหมดการเชื่อมต่อ](../routing/integration-modes.md) และ [แผนที่ endpoint](../routing/endpoint-map.md)

## OpenAPI

path สาธารณะอยู่ใน [openapi.yaml](/openapi.yaml) ภายใต้ tag **Gommo V2** และ **Gommo Platform** path เฉพาะ gateway ใช้ server `http://localhost:3001`

## ถัดไป

→ [เริ่มต้นใช้งาน](../quickstart.md) · [การยืนยันตัวตน](../authentication.md) · [มีเดีย & งาน](./media.md) · [แผนที่ endpoint](../routing/endpoint-map.md)
