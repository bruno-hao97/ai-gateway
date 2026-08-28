---
title: Report feedback
description: How to report bugs and upstream issues
---

# Report feedback

Help us improve AI Gateway docs and API behavior.

## Before you report

1. **Health check**

   ```bash
   curl http://localhost:3001/health
   ```

2. **Reproduce minimally** — [Quickstart](./quickstart.md) or [Playground](/app/playground/).

3. **Capture** — HTTP status, response body `{ success, message, code }`, gateway version/commit.

## What to include

| Field | Example |
|-------|---------|
| **Environment** | local / Railway / Fly, Node version |
| **Mode** | B REST / C proxy / direct upstream |
| **Endpoint** | `POST /gateway/jobs/image` |
| **Request** | Redact tokens — show JSON shape only |
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

If the issue involves **Cursor MCP** tools, note that separately from HTTP gateway — see [MCP & agents](./mcp.md).

## Next

→ [Community](./community/) · [FAQ](./faq.md) · [Quickstart](./quickstart.md)
