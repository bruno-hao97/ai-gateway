---
title: Upstream hosts
description: Gommo hosts ที่ gateway proxy และเมื่อใช้แต่ละตัว
---

# Upstream hosts

Gateway เป็นตัวกลางไปยัง **Gommo** upstream — client ไม่ต้องจำ host หลายตัวเมื่อใช้ Mode B

## Hosts หลัก

| Host | ใช้สำหรับ |
|------|-----------|
| `v2.api.gommo.net` | V2 jobs, chat stream, models |
| `api.gommo.net` | Platform API (`/api/v2`, `/api/apps/go-mmo`) |

Gateway mount proxy paths ตาม [endpoint map](./endpoint-map.md)

## Mode B — client เห็นแค่ gateway

```
https://your-gateway/gateway/models
https://your-gateway/gateway/chat/completions
```

Gateway เติม `domain` จาก `GOMMO_API_DOMAIN` (default `79ai.net`)

## Mode C — path เดิม เปลี่ยน host

| Client เรียก | Gateway forward ไป |
|-------------|-------------------|
| `/v2/...` | `v2.api.gommo.net/v2/...` |
| `/ai/...` | platform routes |
| `/api/v2/...` | `api.gommo.net/api/v2/...` |
| `/api/apps/go-mmo/...` | Gommo app API |

Raw body สูงสุด **50 MB** — stream pipe สำหรับ chat และ `text/event-stream`

## Auth ต่อ upstream

| Route | Header / body |
|-------|---------------|
| V2 jobs | `Authorization: Bearer` |
| Platform | form `access_token` (+ Bearer บาง `/api/v2`) |

Mode B: ส่ง Bearer ไป gateway — gateway แปลงตาม upstream

## ไม่ควรทำ

- Expose **merchant token** ไป browser
- เรียก upstream โดยตรงจาก frontend ถ้าต้องการ usage/billing รวมที่ gateway

## ขั้นตอนถัดไป

→ [Endpoint map](./endpoint-map.md) · [Choosing a mode](./choosing-a-mode.md)
