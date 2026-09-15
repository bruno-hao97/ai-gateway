---
title: MCP & เอเจนต์
description: 79ai MCP — Cursor, Claude Desktop และโฮสต์ที่รองรับ
---

# MCP & เอเจนต์

ใช้ **79ai MCP** ใน Cursor, Claude Desktop, Windsurf หรือโฮสต์ที่รองรับ **remote MCP** — สร้างรูป/วิดีโอ ตรวจเครดิต และติดตามงานด้วยบัญชีบนเว็บนี้

::: tip แนะนำ — 79ai MCP
Remote MCP ที่ `https://api.gommo.net/api/v2/gommo-mcp` — **10 tools `gommo_*`** ใช้เฉพาะ token จาก [/th/app/token/](/th/app/token/) ไม่ต้องรัน gateway local
:::

## ใช้ได้ที่ไหน

| โฮสต์ | รองรับ | คู่มือ |
|-------|--------|--------|
| **Cursor** | ✅ | [โฮสต์อื่น](./other-hosts.md) |
| **Claude Desktop** | ✅ | [โฮสต์อื่น](./other-hosts.md) |
| **Windsurf** | ✅ | [โฮสต์อื่น](./other-hosts.md) |
| **VS Code / Zed** | ⚠️ ขึ้นกับ extension | [โฮสต์อื่น](./other-hosts.md) |
| **แอป / backend** | HTTP ไม่ใช่ MCP | [Gommo public API](../reference/gommo-public-api.md) · [Quickstart](../quickstart.md) |

## 10 tools เมื่อเชื่อมต่อ

| กลุ่ม | Tools |
|-------|-------|
| บัญชี | `gommo_account_info`, `gommo_credit_balance` |
| แคตตาล็อก | `gommo_models_list` |
| สร้างมีเดีย | `gommo_image_create`, `gommo_video_create` |
| ติดตามงาน | `gommo_image_status`, `gommo_video_status`, `gommo_task_stream` |
| ประวัติ | `gommo_tasks_list` |
| แจ้งเตือน | `gommo_notify_send` |

รายละเอียด: [อ้างอิง tool](./tools.md) · ตัวอย่าง prompt: [กรณีใช้งาน](./use-cases.md)

## Flow ผู้ใช้

1. [เข้าสู่ระบบ](/th/login/) → คัดลอก token จาก [/th/app/token/](/th/app/token/)
2. คัดลอก JSON สำหรับ AI client — [MCP host อื่น](./other-hosts.md) (Cursor · Claude · ChatGPT)
3. รีสตาร์ท IDE → แชทด้วย tools `gommo_*`

```json
{
  "mcpServers": {
    "79-ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

เทมเพลต: [Cursor](/mcp-cursor-79ai.example.json) · [Claude](/mcp-claude-79ai.example.json) · [Extended](/cursor-mcp-79ai.example.json)

## MCP vs HTTP

| | **79ai MCP** | **HTTP (Gommo public API)** |
|---|-------------|---------------------------|
| Cursor / Claude / IDE | ✅ | ❌ |
| เว็บ / มือถือ / script | ❌ | ✅ |
| ต้อง self-host gateway | ❌ | ❌ (เรียก `v2.api.gommo.net` / `api.gommo.net`) |

token login เดียวกัน — สไตล์การเชื่อมต่อต่างกัน

[MCP self-hosted](./self-hosted.md) ทางเลือกให้ IDE tools ผ่าน `GATEWAY_URL`

## ถัดไป

→ [โฮสต์อื่น](./other-hosts.md) · [Tools](./tools.md) · [กรณีใช้งาน](./use-cases.md)
