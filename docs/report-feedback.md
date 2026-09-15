---
title: Report feedback
description: How to report bugs and upstream issues
---

# Report feedback

Help us improve AI Gateway docs and API behavior.

## Before you report

1. **Reproduce on public API** — [Quickstart](./quickstart.md) or [Playground](/app/playground/).

   ```bash
   curl.exe -X POST "https://v2.api.gommo.net/ai/models?type=image" ^
     -H "Authorization: Bearer %TOKEN%" ^
     -H "Content-Type: application/x-www-form-urlencoded" ^
     -d "type=image&domain=79ai.net"
   ```

2. **If using self-host gateway**, check health:

   ```bash
   curl http://localhost:3001/health
   ```

3. **Capture** — HTTP status, response body, whether direct Gommo call behaves the same.

## What to include

| Field | Example |
|-------|---------|
| **Environment** | direct Gommo / local gateway / Railway / Fly |
| **Mode** | A Direct / B REST / C proxy |
| **Endpoint** | `POST https://v2.api.gommo.net/ai/jobs/image/{slug}` |
| **Request** | Redact tokens — show form/JSON shape only |
| **Response** | Full error envelope |
| **Expected** | What you expected instead |

## Categories

- **Gateway bug** — wrong mapping, poll logic, auth middleware → [GitHub Issues](https://github.com/bruno-hao97/ai-gateway/issues/new).
- **Docs wrong/missing** — PR or issue with page link (`/principles`, `/reference/…`).
- **Upstream Gommo** — upstream 4xx/5xx with Gommo message; note whether direct call behaves the same.
- **PayOS / billing** — include `orderCode`, webhook logs (no secrets).

## Security

- **Never** paste `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`, PayOS keys, or user passwords.
- Rotate any token accidentally shared.

## MCP vs HTTP

If the issue involves **Cursor MCP** tools, note that separately from HTTP — see [MCP & agents](./mcp/).

## Next

→ [Community](./community/) · [FAQ](./faq.md) · [Quickstart](./quickstart.md)
