---
title: เลือกโหมด
description: เมื่อใช้ Direct, REST gateway หรือ Proxy
---

# เลือกโหมด integration

Gateway รองรับสามโหมด — ดู [Integration modes](./integration-modes.md) สำหรับรายละเอียด

| โหมด | ใครเรียก | เมื่อไหร่ |
|------|----------|----------|
| **A — Direct** | Client → Gommo โดยตรง | Legacy app, form `access_token` |
| **B — REST** | Client → `/gateway/*` | **แนะนำ** — OpenAI-style, SDK, portal |
| **C — Proxy** | Client → gateway → Gommo path | Drop-in แทน upstream URL |

## แนะนำสำหรับโปรเจกต์ใหม่

ใช้ **Mode B (REST)**:

- Bearer token มาตรฐาน
- `domain` เติมโดย gateway
- Job polling ในตัว (`wait: true`)
- เอกสาร OpenAPI ครบ

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-gateway/gateway/models
```

## เมื่อใช้ Mode A (Direct)

- แอปเดิมเรียก `v2.api.gommo.net` / `api.gommo.net` ด้วย form body
- คุณควบคุม `domain` และ `access_token` ในแต่ละ request
- ไม่ผ่าน gateway — ไม่มี billing/usage wrapper ของแพลตฟอร์ม

## เมื่อใช้ Mode C (Proxy)

- ต้องการ **URL เดิม** แต่เปลี่ยน host เป็น gateway
- Stream chat / upload ยัง pipe ตรงไป upstream
- Client ยังส่ง `access_token` ใน form (upstream บังคับ)

ดู [Upstream hosts](./upstream-hosts.md) สำหรับ path ที่ mount

## สรุปเร็ว

| ความต้องการ | โหมด |
|------------|------|
| SDK, portal, agent ใหม่ | **B** |
| แอป Gommo เดิมไม่แก้ body | **A** หรือ **C** |
| เปลี่ยนแค่ base URL | **C** |
| MCP ใน Cursor | Remote MCP (ไม่ใช่ A/B/C โดยตรง) → [MCP](../mcp/index.md) |

## ขั้นตอนถัดไป

→ [Endpoint map](./endpoint-map.md) · [Integration modes](./integration-modes.md)
