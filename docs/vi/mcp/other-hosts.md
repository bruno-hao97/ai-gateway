---
title: Host MCP khác
description: JSON cấu hình 79ai MCP — Cursor, Claude Desktop, ChatGPT và client tương thích
---

# Host MCP khác

**79ai MCP** là server **remote** tại `https://api.gommo.net/api/v2/gommo-mcp`. Copy JSON cho client AI của bạn. Thay `YOUR_ACCESS_TOKEN` bằng token từ [/vi/app/token/](/vi/app/token/).

Mẫu tĩnh: [Cursor](/mcp-cursor-79ai.example.json) · [Claude](/mcp-claude-79ai.example.json) · [Mở rộng](/cursor-mcp-79ai.example.json)

## Cursor

File: `~/.cursor/mcp.json` hoặc **Settings → MCP**.

```json
{
  "mcpServers": {
    "79-ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

## Claude Desktop

File:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "79-ai": {
      "type": "http",
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

## ChatGPT

Nếu gói của bạn có **Connectors / MCP** (tùy phiên bản):

| Trường | Giá trị |
|--------|---------|
| **Connector URL** | `https://api.gommo.net/api/v2/gommo-mcp` |
| **Authentication** | `Bearer YOUR_ACCESS_TOKEN` |

Không dùng `mcp.json` — cấu hình trong Settings ChatGPT. Nếu chưa có Connectors, dùng Cursor hoặc Claude.

## Mở rộng (nếu 401)

Một số setup cần cả hai header:

```json
{
  "mcpServers": {
    "79-ai": {
      "url": "https://api.gommo.net/api/v2/gommo-mcp",
      "headers": {
        "Gommo-Token": "YOUR_ACCESS_TOKEN",
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

---

## Host hỗ trợ

| Host | Hỗ trợ | File config | Ghi chú |
|------|--------|-------------|---------|
| **[Cursor](https://cursor.com)** | ✅ Khuyên dùng | `~/.cursor/mcp.json` | JSON trên |
| **[Claude Desktop](https://claude.ai/download)** | ✅ | Xem trên | Thêm `"type": "http"` |
| **[Windsurf](https://codeium.com/windsurf)** | ✅ | MCP settings | Cùng `url` + headers |
| **VS Code** (extension MCP) | ⚠️ Tùy extension | Theo extension | Một số chỉ stdio |
| **Zed / Continue** | ⚠️ Xem docs | Theo sản phẩm | Đang phát triển |

### Kiểm tra

1. Dot xanh, **~10 tools**
2. Thử: *"Kiểm tra credit balance qua 79ai MCP"*
3. Prompt khác: [Use cases](./use-cases.md)

### Token hết hạn?

Đăng nhập lại → [/vi/app/token/](/vi/app/token/) → cập nhật config → restart IDE.

Tham khảo: [Model Context Protocol](https://modelcontextprotocol.io).

---

## Không hỗ trợ pattern MCP này

| Nền tảng | Lý do | Thay thế |
|----------|-------|----------|
| **ChatGPT web/mobile** (không Connectors) | Không custom MCP | HTTP [`/gateway/*`](/vi/routing/endpoint-map.md) |
| **Gemini web** | Không custom MCP | HTTP API |
| **Copilot browser** | Không config MCP user | HTTP API |

---

## MCP vs HTTP

| Mục tiêu | Dùng |
|----------|------|
| Agent IDE (Cursor, Claude…) | **79ai MCP** |
| Web / mobile / backend | **HTTP** Bearer → `/gateway/*` |
| Route IDE qua API riêng | [Self-hosted](./self-hosted.md) |

Cùng token — khác cách gọi.

---

## Yêu cầu remote MCP

1. **HTTPS remote URL** (không chỉ stdio)
2. **Custom headers** (`Authorization`, và `Gommo-Token` nếu cần)
3. Liệt kê ~**10** tool `gommo_*` khi connected

Chỉ hỗ trợ stdio → dùng HTTP hoặc [self-hosted](./self-hosted.md).

---

## Tiếp theo

→ [Tools](./tools.md) · [Use cases](./use-cases.md) · [Self-hosted](./self-hosted.md)
