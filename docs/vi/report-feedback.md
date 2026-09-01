---
title: Góp ý
description: Báo lỗi và vấn đề upstream
---

# Góp ý

Giúp cải thiện docs và hành vi API AI Gateway.

## Trước khi báo

1. **Health check**

   ```bash
   curl http://localhost:3001/health
   ```

2. **Tái hiện tối thiểu** — [Quickstart](./quickstart.md) hoặc [Playground](/vi/app/playground/).

3. **Ghi lại** — HTTP status, body `{ success, message, code }`, version/commit gateway.

## Nội dung cần có

| Trường | Ví dụ |
|--------|-------|
| **Environment** | local / Railway / Fly, phiên bản Node |
| **Mode** | B REST / C proxy / direct upstream |
| **Endpoint** | `POST /gateway/jobs/image` |
| **Request** | Che token — chỉ shape JSON |
| **Response** | Envelope lỗi đầy đủ |
| **Expected** | Kỳ vọng của bạn |

## Phân loại

- **Lỗi gateway** — mapping, poll, auth → [GitHub Issues](https://github.com/bruno-hao97/ai-gateway/issues/new).
- **Docs sai/thiếu** — PR hoặc issue kèm link trang.
- **Upstream Gommo** — 4xx/5xx kèm message Gommo; ghi rõ direct call có giống không.
- **PayOS / billing** — kèm `orderCode`, log webhook (không secret).

## Bảo mật

- **Không** dán `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`, PayOS key, hoặc mật khẩu user.
- Rotate token nếu lỡ lộ.

## MCP vs HTTP

Vấn đề liên quan **Cursor MCP**, ghi riêng khỏi HTTP gateway — xem [MCP & agents](./mcp/).

## Tiếp theo

→ [Community](./community/) · [FAQ](./faq.md) · [Quickstart](./quickstart.md)
