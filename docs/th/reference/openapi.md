---
title: OpenAPI
description: สเปก Gommo public API + AI Gateway dev แบบอ่านได้ด้วยเครื่อง
---

# OpenAPI

ดาวน์โหลดหรือเรียกดูสเปก **OpenAPI 3.0** สำหรับ **Gommo public API** (v2 + platform hosts) และ endpoint dev ของ **AI Gateway** (billing, admin, Mode B REST)

## ไฟล์สเปก

| Dev | Production |
|-----|------------|
| [http://localhost:5173/openapi.yaml](http://localhost:5173/openapi.yaml) | `https://docs.yourdomain.com/openapi.yaml` |

## เซิร์ฟเวอร์เริ่มต้น (Swagger)

| เซิร์ฟเวอร์ | คำอธิบาย |
|------------|----------|
| `https://v2.api.gommo.net` | งาน โมเดล อัปโหลด คลัง album |
| `https://api.gommo.net` | Auth แชท เสียง info รายการคลัง |
| `http://localhost:3001` | AI Gateway dev — `/gateway/*`, billing, admin |

แต่ละ operation ตั้ง `servers` เมื่อใช้ได้กับ host เดียว ดู [Gommo public API](./gommo-public-api.md) สำหรับแผนที่ครบ

## กลุ่ม path

| Tag | Host | ตัวอย่าง |
|-----|------|----------|
| **Gommo V2** | v2.api.gommo.net | `/ai/models`, `/ai/jobs/{type}/{model}`, `/ai/library/album-images` |
| **Gommo Platform** | api.gommo.net | `/ai/me`, `/api/v2/chat`, `/ai/info/image/{id}` |
| **Gateway Dev** | localhost:3001 | `/gateway/jobs/{type}`, `/gateway/models` |
| **Billing** | localhost:3001 | `/billing/payment/*` |
| **Admin** | localhost:3001 | `/admin/*` |

## Auth ในสเปก

| Security scheme | ใช้กับ |
|-----------------|--------|
| `bearerAuth` | path สาธารณะ Gommo, `/gateway/*`, billing |
| `adminKey` (`x-admin-key`) | `/admin/*` |

## อ้างอิงสำหรับมนุษย์

→ [Gommo public API](./gommo-public-api.md) · [มีเดีย & งาน](./media.md) · [การยืนยันตัวตน](../authentication.md)

## ถัดไป

→ [แผนที่ endpoint](../routing/endpoint-map.md) · [โหมดการเชื่อมต่อ](../routing/integration-modes.md)
