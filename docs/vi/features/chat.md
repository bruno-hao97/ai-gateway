---
title: Chat
description: Agent chat với SSE streaming tùy chọn trên Gommo platform API
---

# Chat

Chat AI qua platform chat API Gommo trên **`https://api.gommo.net`**.

## Endpoint (khuyến nghị)

```http
POST https://api.gommo.net/api/v2/chat
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

action=chat&domain=79ai.net&query=Hello&messages=[{"role":"user","text":"Hello"}]
```

Form có thể dùng `access_token` thay Bearer header — cùng token.

## Actions

| `action` | Hành vi |
|----------|---------|
| `chat` | Response JSON một lần |
| `stream` | **SSE** stream |
| `set_model` | Đổi chat model cho session |
| `agent` | **set_model** (best-effort) rồi **chat** — text agent flow |
| `models` | List chat models có sẵn |

## Messages không rỗng

Upstream `action=chat` yêu cầu **`messages` có ít nhất một entry** — vd. `{ "role": "user", "text": "..." }`.

## Streaming

Đặt `action=stream` cho SSE token-by-token. Consume stream trên client — không kỳ vọng một JSON body.

## Credits

Chat tiêu credit user Gommo. Kiểm tra số dư qua `POST https://api.gommo.net/ai/me`.

## Portal chat

[/vi/app/chat/](/vi/app/chat/) dùng cùng upstream API. Lịch sử chat trong portal **chỉ local** — export/import JSON từ sidebar để backup.

## Tùy chọn: self-host gateway

JSON wrapper tại `POST {gateway}/gateway/chat` — xem [Chat reference](../reference/chat.md) phần Mode B.

## API đầy đủ

→ [Chat reference](../reference/chat.md) · [Gommo public API](../reference/gommo-public-api.md)

## Tiếp theo

→ [Audio & TTS](./audio.md) · [Media jobs](./media-jobs.md)
