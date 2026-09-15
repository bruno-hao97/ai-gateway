---
title: MCP ??? self-hosted
description: รัน @ai-gateway/mcp-server กับ gateway ของคุณเอง
---

# Self-hosted MCP

ทางเลือกจาก [79ai remote MCP](./other-hosts.md): รัน **`@ai-gateway/mcp-server`** กับ gateway ที่คุณ deploy เอง

| | 79ai remote | Self-hosted |
|---|-------------|-------------|
| Endpoint | `https://api.gommo.net/api/v2/gommo-mcp` | `http://localhost:3001/mcp` (ตัวอย่าง) |
| Tools | 10 | 8 ใน v0.1 (ไม่มี `gommo_tasks_list`, `gommo_notify_send`) |
| เหมาะกับ | ผู้ใช้ทั่วไป | Dev, custom domain, air-gapped |

## ติดตั้ง

จาก monorepo:

```bash
npm run mcp:build
```

หรือจาก npm (เมื่อ publish):

```bash
npm install -g @ai-gateway/mcp-server
```

## รัน

Gateway ต้องทำงานก่อน (`npm run dev` หรือ production URL)

```bash
GATEWAY_URL=http://localhost:3001 \
GATEWAY_ACCESS_TOKEN=your_token \
GATEWAY_DOMAIN=79ai.net \
npx @ai-gateway/mcp-server
```

Server ฟัง stdio (MCP default) — ต่อกับ Cursor ผ่าน **command** config:

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "npx",
      "args": ["-y", "@ai-gateway/mcp-server"],
      "env": {
        "GATEWAY_URL": "http://localhost:3001",
        "GATEWAY_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN",
        "GATEWAY_DOMAIN": "79ai.net"
      }
    }
  }
}
```

## Environment variables

| Variable | Default | คำอธิบาย |
|----------|---------|----------|
| `GATEWAY_URL` | `http://localhost:3001` | Base URL ของ gateway |
| `GATEWAY_ACCESS_TOKEN` | *(จำเป็น)* | User token จาก [/app/token/](/app/token/) |
| `GATEWAY_DOMAIN` | `79ai.net` | Domain สำหรับ `/ai/me` |

## ขั้นตอนถัดไป

→ [79ai MCP](./other-hosts.md) · [MCP tools](./tools.md) · [packages/mcp-server README](../../packages/mcp-server/README.md)
