---
title: Chat
description: Agent chat và SSE streaming qua /gateway/chat
---

# Chat

Chat AI qua platform Gommo. Gateway REST wrap `POST /api/v2/chat` — Mode C giữ form upstream.

## Endpoint

| Mode | Path |
|------|------|
| REST | `POST /gateway/chat` |
| Proxy | `POST /api/v2/chat` |

Auth: `Authorization: Bearer {token}`.

## Actions

| `action` | Hành vi |
|----------|---------|
| `chat` | Response JSON một lần |
| `stream` | **SSE** — gateway pipe không buffer |
| `set_model` | Đổi model session |

## Request REST

```json
{
  "action": "chat",
  "query": "Xin chào",
  "messages": [{ "role": "user", "text": "Xin chào" }]
}
```

::: warning messages không rỗng
Upstream yêu cầu **ít nhất một** `{ "role": "user", "text": "..." }`.
:::

`domain` không cần trong body REST — gateway dùng `GOMMO_API_DOMAIN`.

## Env mặc định

| Env | Mục đích |
|-----|----------|
| `GOMMO_CHAT_SERVER` | Server chat |
| `GOMMO_CHAT_MODEL` | Model id |
| `GOMMO_CHAT_AGENT_ID` | Agent id |

## Streaming

`"action": "stream"` → SSE token-by-token. Gateway pipe khi URL có `/chat` hoặc SSE content-type.

## Mode C

Form: `action=chat&access_token=…&domain=…&query=…`

## Credits

Chat tiêu credit user Gommo. Kiểm tra qua `/api/apps/go-mmo/ai/me`.

## API đầy đủ

→ [Chat reference](../reference/chat.md)

## Tiếp theo

→ [Audio](./audio.md) · [Media jobs](./media-jobs.md)
