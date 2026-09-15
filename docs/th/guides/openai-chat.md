---
title: OpenAI-compatible chat
description: ใช้ POST /v1/chat/completions กับ OpenAI SDK และ agents มาตรฐาน
---

# OpenAI-compatible chat

AI Gateway เปิด **`POST /v1/chat/completions`** — แมป Gommo chat ไป OpenAI Chat Completions API เพื่อให้ LangChain, OpenAI SDK หรือ agents ต่อได้โดยไม่ต้องใช้ payload เฉพาะ Gommo

## Auth

เหมือน `/gateway/*`:

```http
Authorization: Bearer <user_access_token>
```

รับ token ผ่าน [Authentication](../authentication.md) หรือ `POST /gateway/auth/login`

## Request

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5::cheap",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

| Field | หมายเหตุ |
|-------|----------|
| `messages` | จำเป็น รองรับ `system` / `user` / `assistant` |
| `model` | Optional รูปแบบ `model::server` (Gommo) หรือไม่ใส่ใช้ default `GOMMO_CHAT_MODEL` |
| `stream` | `true` → SSE รูปแบบ OpenAI chunk |

`system` messages ถูกต่อหน้า user query สำหรับความเข้ากันได้ upstream

## Response (non-stream)

รูปแบบ OpenAI มาตรฐาน:

```json
{
  "id": "chatcmpl-…",
  "object": "chat.completion",
  "choices": [{
    "message": { "role": "assistant", "content": "…" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

Gommo ไม่รายงาน token usage — ฟิลด์เป็น `0`

## Streaming

```bash
curl -N -X POST http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.5::cheap","stream":true,"messages":[{"role":"user","content":"Hi"}]}'
```

คืน `text/event-stream` พร้อม `chat.completion.chunk` และ `data: [DONE]` สุดท้าย

## รายการโมเดล

```bash
curl http://localhost:3001/v1/models \
  -H "Authorization: Bearer $TOKEN"
```

คืน default chat model จาก env (`GOMMO_CHAT_MODEL`)

## เทียบ `/gateway/chat`

| | `/v1/chat/completions` | `/gateway/chat` |
|---|------------------------|-----------------|
| รูปแบบ | OpenAI | Gommo-native (`action`, `query`, `sessionId`) |
| SDKs | OpenAI-compatible | Custom |
| Upstream | Gommo chat เดียวกัน | เดียวกัน |

ใช้ `/gateway/chat` เมื่อต้องการ `set_model` หรือฟิลด์ Gommo เต็ม ใช้ `/v1/*` สำหรับ agent/SDK portability

## ขั้นตอนถัดไป

→ [Chat reference](../reference/chat.md) · [Endpoint map](../routing/endpoint-map.md) · [OpenAPI](/openapi.yaml)
