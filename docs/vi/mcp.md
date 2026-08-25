---
title: MCP & agents
description: Cursor MCP vs HTTP runtime AI Gateway
---

# MCP & agents

Trang này làm rõ **Model Context Protocol (MCP)** liên quan thế nào tới AI Gateway — và những gì **chưa** ship.

## Hai thứ khác nhau

| | **Cursor MCP tools** (`gommo_*`) | **AI Gateway (repo này)** |
|---|----------------------------------|----------------------------|
| **Chạy ở đâu** | Trong Cursor IDE | Server của bạn (`npm run dev` / Docker) |
| **Transport** | MCP qua stdio / Cursor | **HTTP** REST + proxy |
| **Đối tượng** | Bạn khi code trong Cursor | App, script, khách hàng |
| **Auth** | Cấu hình MCP Cursor | Bearer user token, admin key trên server |
| **Billing** | Không phải API production | `/billing/*`, `/gateway/*` |

::: info Option B — làm rõ, không trùng lặp
OpenRouter có **MCP server** để agent gọi API. **AI Gateway chưa có MCP server chính thức.** Dùng endpoint HTTP trong docs này.
:::

## Dùng gì khi nào

### Xây product hoặc tích hợp backend

Dùng **HTTP**:

- Mode B: `GET/POST /gateway/*`
- Mode C: proxy `/v2`, `/api/v2`, …
- Auth: [Authentication](../authentication.md)

Test tương tác: [Playground](http://localhost:3001/portal/playground.html) (cùng origin API khi dev).

### Dùng Cursor khi phát triển gateway

Bạn có thể cấu hình **Cursor MCP** riêng (vd. `gommo_*`) trong Cursor settings. Chúng gọi Gommo **trực tiếp** qua Cursor — **không** giống gọi `api.yourdomain.com` đã deploy.

**Đừng** nhầm response MCP tool với hành vi gateway. Luôn verify:

```bash
curl http://localhost:3001/health
```

và [Quickstart](./quickstart.md).

## Pattern HTTP thân thiện agent

Agent LLM biết HTTP (không cần MCP):

1. `POST /api/apps/go-mmo/auth/login` → token (hoặc token sẵn có).
2. `GET /gateway/models?type=image` → chọn slug + ratio.
3. `POST /gateway/jobs/image` với `wait: true` → `resultUrl`.

Lỗi có cấu trúc (`code`, `message`) giúp agent retry an toàn.

## Roadmap (chưa implement)

MCP server **chính thức** wrap `/gateway/*` có thể expose:

- `list_models(type)`
- `create_job(type, modelSlug, fields, wait?)`
- `chat(query)`

Cần tính năng này, mở GitHub issue kèm agent host (Cursor, Claude Desktop, custom).

## Tiếp theo

→ [Quickstart](./quickstart.md) · [Nguyên tắc](./principles.md) · [Góp ý](./report-feedback.md)
