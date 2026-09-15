---
title: MCP บนโฮสต์อื่น
description: ตั้งค่า 79ai remote MCP บน Cursor, Claude Desktop, Windsurf และ MCP client อื่น
---

# MCP บนโฮสต์อื่น

**แนะนำ:** ใช้ **79ai remote MCP** — ไม่ต้องรัน server เอง มี **10 tools** ครบ

| | 79ai remote | Self-hosted |
|---|-------------|-------------|
| URL | `https://api.gommo.net/api/v2/gommo-mcp` | `http://localhost:3001/mcp` (ตัวอย่าง) |
| Auth | Bearer token ของผู้ใช้ | `GATEWAY_ACCESS_TOKEN` |
| Tools | 10 (รวม tasks + notify) | 8 ใน v0.1 |
| ตั้งค่า | คัดลอก config ด้านล่าง | [Self-hosted MCP](./self-hosted.md) |

## 79ai remote MCP

| | |
|---|---|
| **URL** | `https://api.gommo.net/api/v2/gommo-mcp` |
| **Transport** | Streamable HTTP (MCP 2025-03-26) |
| **Auth** | `Authorization: Bearer <access_token>` |
| **Token** | สร้างที่ [/app/token/](/app/token/) (หรือ `/th/app/token/`) |

### Cursor

1. **Settings → MCP → Add server** (หรือแก้ `~/.cursor/mcp.json`)
2. วาง config ด้านล่าง — แทนที่ token
3. รีสตาร์ท Cursor หรือ reload MCP
4. ใน chat ควรเห็น tools `gommo_*` (เช่น `gommo_models_list`)

```json
{
  "mcpServers": {
    "79ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

### Claude Desktop

แก้ `claude_desktop_config.json` (ตำแหน่งขึ้นกับ OS):

```json
{
  "mcpServers": {
    "79ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

### Windsurf / Cline / อื่น

ใช้ **URL + Bearer header** เดียวกัน ตามเอกสาร MCP client ของแต่ละตัว

### ตรวจสอบ

ใน IDE chat ลอง:

- `gommo_credit_balance`
- `gommo_models_list` พร้อม `type: "image"`

ถ้าเชื่อมต่อสำเร็จ จะได้ JSON จาก Gommo ผ่าน MCP

## Self-hosted (ทางเลือก)

รัน gateway ของคุณเอง + [`@ai-gateway/mcp-server`](../../packages/mcp-server/README.md) — เหมาะกับ dev หรือ custom domain

→ [Self-hosted MCP](./self-hosted.md)

## ขั้นตอนถัดไป

→ [MCP tools](./tools.md) · [Use cases](./use-cases.md)
