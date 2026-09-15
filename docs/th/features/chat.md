---
title: แชท
description: Agent chat พร้อมสตรีม SSE ทางเลือกผ่าน /gateway/chat
---

# แชท

AI สนทนาผ่าน platform chat API ของ Gommo Gateway REST ห่อ `POST /api/v2/chat` ด้วย JSON — proxy โหมด C คงรูปแบบ form upstream

## Endpoints

| โหมด | Path |
|------|------|
| REST (แนะนำ) | `POST /gateway/chat` |
| Proxy | `POST /api/v2/chat` |
| Direct | `POST https://api.gommo.net/api/v2/chat` |

Auth: `Authorization: Bearer {user_access_token}`

## Actions

| `action` | พฤติกรรม |
|----------|----------|
| `chat` | JSON เดียวหรือ SSE |
| `stream` | สตรีม **SSE** — gateway pipe โดยไม่ buffer |
| `set_model` | เปลี่ยนโมเดลแชทของเซสชัน |
| `agent` | **set_model** (best-effort) แล้ว **chat** — flow agent ข้อความ |

## REST request

```json
{
  "action": "chat",
  "query": "Hello",
  "sessionId": "optional-uuid",
  "messages": [
    { "role": "user", "text": "Hello" }
  ]
}
```

::: warning messages ไม่ว่าง
Upstream `action=chat` ต้องมี **`messages` อย่างน้อยหนึ่งรายการ** — เช่น `{ "role": "user", "text": "..." }`
:::

`domain` **ไม่จำเป็น** ใน REST body — gateway ใช้ `GOMMO_API_DOMAIN`

## โมเดลค่าเริ่มต้น (env เซิร์ฟเวอร์)

| Env | วัตถุประสงค์ |
|-----|-------------|
| `GOMMO_CHAT_SERVER` | เซิร์ฟเวอร์แชท (ค่าเริ่มต้น `cheap`) |
| `GOMMO_CHAT_MODEL` | id โมเดล (ค่าเริ่มต้น `gpt-5.5::cheap`) |
| `GOMMO_CHAT_AGENT_ID` | Moon Chat agent (ข้อความค่าเริ่มต้น) |
| `GOMMO_CHAT_WORKFLOW_AGENT_ID` | Composer / workflow agent |
| `GOMMO_CHAT_WORKFLOW_PROJECT_ID` | project id สำหรับ workflow stream |
| `GOMMO_CHAT_MODELS_FILE` | override JSON ทางเลือก (`data/chat-models.json`) |
| `GOMMO_CHAT_MODELS_TTL_MS` | TTL cache แคตตาล็อก upstream (ค่าเริ่มต้น 5 นาที) |

แก้ต่อคำขอผ่านฟิลด์ REST หรือพารามิเตอร์ form upstream

## Portal model picker

`GET /gateway/chat-models` (ต้อง Bearer) โหลดแคตตาล็อกจาก Gommo **`action=models`** (`POST /api/v2/chat`) cache ฝั่งเซิร์ฟเวอร์ response มี `source: "upstream" | "fallback"`

```json
{
  "success": true,
  "data": {
    "defaultId": "auto-router",
    "source": "upstream",
    "models": [
      {
        "id": "auto-router",
        "label": "Auto Router",
        "autoRouter": true,
        "chatApiMode": "agent",
        "model": "gpt-5.5::cheap",
        "server": "cheap"
      },
      {
        "id": "composer-2.5--cursorai",
        "label": "Composer 2.5 (Standard)",
        "chatApiMode": "stream",
        "model": "composer-2.5",
        "server": "cursorai"
      }
    ]
  }
}
```

- **Auto Router** — env ค่าเริ่มต้น `action=agent` (set_model + chat)
- **โมเดลอื่น** — `chatApiMode: stream` เมื่อ upstream `body_type` เป็น `chat_completions` หรือ server เป็น `cursorai`

`data/chat-models.json` ทางเลือกแก้ label ซ่อนโมเดล (`hidden: true`) หรือปิด upstream (`"upstream": false`)

## เซสชันแชท (`/gateway/chat-sessions`)

Gateway REST ยังรองรับ `save_message` / `list_sessions` สำหรับ API client **แชท portal เป็น local-only** — ไม่ sync กับประวัติ Gommo/79ai

ใช้ **Export/Import JSON** ใน sidebar แชทสำหรับ backup ในเครื่อง

## Streaming

ตั้ง `"action": "stream"` สำหรับ SSE ทีละ token:

```http
POST /gateway/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "stream",
  "query": "Tell a short story",
  "messages": [{ "role": "user", "text": "Tell a short story" }]
}
```

Gateway ตรวจจับ streaming เมื่อ:

- URL มี `/chat` และ action เป็น stream หรือ
- `Content-Type: text/event-stream` บน route proxy

Response pipe ไป client — ไม่คาดหวัง JSON body เดียว

## โหมด C (form body)

```http
POST /api/v2/chat
Content-Type: application/x-www-form-urlencoded

action=chat&access_token={token}&domain={domain}&query=Hello&...
```

ใส่ `domain` ตรงกับโดเมนลงทะเบียนผู้ใช้

## เครดิต

แชทใช้เครดิตผู้ใช้ Gommo เหมือน API แพลตฟอร์มอื่น ตรวจยอดผ่าน `/api/apps/go-mmo/ai/me` (proxy บน gateway)

## API ฉบับเต็ม

→ [อ้างอิงแชท](../reference/chat.md) · [แผนที่ endpoint](../routing/endpoint-map.md)

## ถัดไป

→ [เสียง & TTS](./audio.md) · [งานมีเดีย](./media-jobs.md)
