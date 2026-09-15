---
title: BYOK (beta)
description: Hybrid Bring Your Own Key — provider keys สำหรับ chat, บัญชี Gommo สำหรับ media
---

# BYOK (beta)

::: warning Beta
BYOK **ยังไม่พร้อม production เต็มรูปแบบ** ใช้สำหรับ dev, staging หรือ self-hosted gateway ที่ยอมรับข้อจำกัดด้านล่าง Billing, fallback และพฤติกรรม provider อาจเปลี่ยนโดยไม่ bump major version
:::

**Deploy production:** ทำตาม [BYOK production checklist](/guides/byok-production.md) (encryption key, persistent volumes, smoke test)

**BYOK** (Bring Your Own Key) บน gateway นี้เป็น **hybrid** — ต่างจาก BYOK chat-only แบบ OpenRouter:

| งาน | Auth / billing | การตั้งค่าของคุณ |
|-----|----------------|-----------------|
| Chat (`POST /gateway/chat`, `POST /v1/chat/completions`) | **OpenAI / Anthropic** key ของคุณเมื่อโมเดลอยู่ใน gateway map | เพิ่ม provider key ใน [BYOK](/app/byok/) |
| Media jobs, upload, audio | **Gommo credits** บนบัญชี **primary** ที่เชื่อม | เชื่อมบัญชี Gommo ใน [BYOK](/app/byok/) |
| Platform fee (optional) | Accrued ledger + pre-check กับ session Gommo credits | ตั้ง `BYOK_PLATFORM_FEE_PERCENT` บน gateway host |

Chat **ไม่** bill provider ผ่าน Gommo Media **ไม่**ใช้ OpenAI/Anthropic key ของคุณโดยตรง

## เริ่มต้นเร็ว

1. **เพิ่ม provider key** — [BYOK → Providers](/app/byok/) → OpenAI หรือ Anthropic → Save key → Test
2. **เชื่อมบัญชี Gommo** — [BYOK → Gommo accounts](/app/byok/) → domain (เช่น `79ai.net`) → **Link current session** → ตั้ง **primary** สำหรับ media
3. **เรียก chat ด้วย mapped model** — ใช้ `model` id จาก [Supported chat models](#supported-chat-models) ด้านล่าง (หรือจาก `GET /gateway/byok/status` → `supportedChatModels`)

ถ้า chat คืน model error โมเดล gateway น่าจะ **ไม่** อยู่ใน `config/byok-model-map.json` — ขอ operator เพิ่ม entry

## สิ่งที่ใช้ได้วันนี้

| พื้นที่ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| OpenAI chat BYOK | **Beta** | `/gateway/chat`, `/v1/chat/completions` |
| Anthropic chat BYOK | **Beta** | route เดียวกันเมื่อ map ใช้ `anthropic` |
| Gommo account link | **Beta** | Primary สำหรับ media/upload/audio |
| Shared fallback to Gommo | **Beta** | Toggle ต่อ key; default จาก `BYOK_DEFAULT_SHARED_FALLBACK` |
| Platform fee ledger | **Beta** | Tracking + pre-check; ไม่เทียบ billing OpenRouter |
| Usage tab | **Beta** | 7 วันล่าสุด BYOK vs platform requests |

**ยังไม่ครอบคลุม:**

- BYOK สำหรับ media/image/video/TTS (ใช้ Gommo เสมอ)
- Model map อัตโนมัติจาก catalog (operator แก้ JSON file)
- Multi-instance credential sync (file store บน gateway host)
- Provider billing reconciliation กับ invoice OpenAI/Anthropic

## Supported chat models

Operator gateway ดูแล `config/byok-model-map.json` (override ด้วย `BYOK_MODEL_MAP_FILE`) แต่ละ entry แมป **gateway model id** ไป provider + upstream model

Default map (อาจต่างบน host ของคุณ):

| Gateway model | Provider | Upstream model | Gommo server |
|---------------|----------|----------------|--------------|
| `gpt-4o` | openai | `gpt-4o` | cheap |
| `gpt-4o-mini` | openai | `gpt-4o-mini` | cheap |
| `gpt-5.5` | openai | `gpt-4o` | cheap |
| `claude-3-5-sonnet` | anthropic | `claude-3-5-sonnet-20241022` | cheap |
| `claude-3-5-haiku` | anthropic | `claude-3-5-haiku-20241022` | cheap |

รายการสดสำหรับ session ของคุณ:

```bash
curl.exe "http://localhost:3001/gateway/byok/status" ^
  -H "Authorization: Bearer USER_TOKEN"
```

ฟิลด์ response: `data.supportedChatModels[]` พร้อม `gatewayModelId`, `byokProvider`, `upstreamModel`, optional `gommoServer`

ฟิลด์ model อาจมี suffix server: `gpt-4o::cheap` — ดู [Chat](./chat.md)

## Fallback behavior

แต่ละ provider key มี **Fallback** (UI) = `sharedFallback`:

| การตั้งค่า | เมื่อ BYOK provider call ล้มเหลว |
|-----------|----------------------------------|
| **Fallback on** | Gateway retry request เดียวกันด้วย **Gommo session credits** (platform path) |
| **Fallback off** | Request ล้มเหลวด้วย provider error — ไม่ charge Gommo สำหรับ chat นั้น |

Default key ใหม่: `BYOK_DEFAULT_SHARED_FALLBACK` (default `true`)

## Platform fee (beta)

เมื่อตั้ง `BYOK_PLATFORM_FEE_PERCENT` และ/หรือ `BYOK_PLATFORM_FEE_PER_REQUEST` บน gateway:

- BYOK chat สำเร็จ **accrue** fee credits ใน `data/byok-fee-ledger.json`
- ก่อน BYOK gateway ตรวจ **accrued fees ค้าง + fee ประมาณ** กับ **session** Gommo credits บน request domain
- ไม่พอ → **`402 INSUFFICIENT_CREDITS`** — เติมที่ [Credits](/app/credits/) (เหมือน credit check gateway อื่น)

หน้า BYOK แสดง **Platform fee %**, **Accrued fees** และ **Platform credits** (session balance) Accrued fees เป็น **ledger tracking** บน gateway host จนกว่าจะขยาย settlement logic

## Credential storage

- Provider secrets และ linked Gommo tokens **encrypt at rest** บน gateway (`BYOK_ENCRYPTION_KEY` จำเป็นใน production)
- Store file: `BYOK_STORE_FILE` (default `data/byok-store.json`)
- API คืน **hints เท่านั้น** (เช่น `sk-…ab12`) — ไม่คืน secret ดิบ

## Management API

Route ทั้งหมดต้อง `Authorization: Bearer` (token ผู้ใช้เดียวกับ `/gateway/*`)

| Method | Path | Body / หมายเหตุ |
|--------|------|----------------|
| GET | `/gateway/byok/status` | Enabled, beta, fees, providers, `supportedChatModels`, primary Gommo |
| GET | `/gateway/byok/credentials?kind=provider\|gommo` | รายการ credentials |
| POST | `/gateway/byok/credentials` | `{ "providerSlug", "secret", "label?", "sharedFallback?" }` |
| PATCH | `/gateway/byok/credentials/{id}` | `{ "label?", "sharedFallback?", "disabled?" }` |
| DELETE | `/gateway/byok/credentials/{id}` | — |
| POST | `/gateway/byok/credentials/{id}/test` | Validate key หรือ Gommo link |
| POST | `/gateway/byok/gommo-accounts` | `{ "domain", "label?", "setPrimary?" }` — ใช้ session token ยกเว้นส่ง `access_token` |
| PATCH | `/gateway/byok/gommo-accounts/{id}/primary` | ตั้ง primary สำหรับ media |
| GET | `/gateway/byok/usage?days=7&limit=20` | สรุป BYOK vs platform + events |

TypeScript SDK: `client.byok.status()`, `createCredential()`, `linkGommoAccount()`, `usage()` — ดู [TypeScript SDK](/sdk/typescript/)

### ตัวอย่างเชื่อม Gommo account

```bash
curl.exe -X POST "http://localhost:3001/gateway/byok/gommo-accounts" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"domain\":\"79ai.net\",\"label\":\"my-site\",\"setPrimary\":true}"
```

ใช้ **session token ปัจจุบัน** สำหรับ domain นั้น ยกเว้นส่ง `access_token` ใน body (server-side integrations เท่านั้น)

## Environment

| Variable | Default | วัตถุประสงค์ |
|----------|---------|-------------|
| `BYOK_ENABLED` | `true` | Master switch |
| `BYOK_BETA` | `true` | Portal/API beta labels |
| `BYOK_ENCRYPTION_KEY` | — | จำเป็นสำหรับ encryption production |
| `BYOK_STORE_FILE` | `data/byok-store.json` | Credential store |
| `BYOK_MODEL_MAP_FILE` | `config/byok-model-map.json` | Chat model routing |
| `BYOK_DEFAULT_SHARED_FALLBACK` | `true` | Default fallback key ใหม่ |
| `BYOK_PLATFORM_FEE_PERCENT` | `0` | Fee % ตาม token |
| `BYOK_PLATFORM_FEE_PER_REQUEST` | `0` | Fee credits ขั้นต่ำต่อ request |
| `BYOK_PLATFORM_FEE_MIN_CREDITS` | `0` | Floor ต่อการคำนวณ fee |
| `BYOK_FEE_LEDGER_FILE` | `data/byok-fee-ledger.json` | Fee accrual ledger |
| `BYOK_PROVIDERS` | `openai,anthropic` | Provider slugs ที่เปิด |

## UI

จัดการ keys และ accounts ที่ [BYOK](/app/byok/) (sidebar **Developer → BYOK**, badge **beta**) callout และ quick-start ในหน้าสะท้อนเอกสารนี้

### Smoke test checklist

Manual (login แล้ว, `npm run docs:stack`):

- [ ] **Providers** → save key → ข้อความสำเร็จสีเขียว
- [ ] **Test** บน key → สำเร็จหรือ error แดง (ไม่เงียบ)
- [ ] **Delete** → confirm dialog → credential ถูกลบ
- [ ] **Gommo** → link session → primary badge
- [ ] **Usage** tab → แถว event แสดง badge OK/Error; ลิงก์ **Activity** ทำงาน
- [ ] Footer quick links: Chat, Chat API, Access token, Activity

ดู [Chat](./chat.md), [Media & jobs](./media.md) และ [Authentication](/authentication)
