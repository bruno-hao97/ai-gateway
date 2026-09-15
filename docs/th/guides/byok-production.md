---
title: BYOK production checklist
description: Deploy hybrid BYOK อย่างปลอดภัย — encryption, persistence, model map และ smoke tests
---

# BYOK production checklist

ใช้หลัง [BYOK reference](/reference/byok.md) เมื่อย้ายจาก dev/staging ไป **self-hosted หรือ single-instance production** gateway

::: warning Beta
BYOK ยังเป็น **beta** — checklist นี้ลด operational risk ไม่ได้ลบข้อจำกัด beta (file store, fee ledger, แก้ model map)
:::

## 1. Encryption key (จำเป็น)

Production **ต้อง** ตั้ง `BYOK_ENCRYPTION_KEY` เมื่อ `BYOK_ENABLED=true` (default) Gateway **ไม่ start** ถ้าไม่มีเมื่อ `NODE_ENV=production`

สร้าง key 32-byte:

```bash
npm run byok:generate-key
# or: openssl rand -base64 32
```

ตั้งบน host (Railway/Fly secrets, Docker env, ห้าม commit):

```env
NODE_ENV=production
BYOK_ENCRYPTION_KEY=<paste-base64-key>
```

**ใช้ร่วมกับ:** Observability background poll queue (`data/observability-background-polls.json`) — key material เดียวกับ BYOK credentials

::: danger การ rotate keys
เปลี่ยน `BYOK_ENCRYPTION_KEY` ทำให้ข้อมูล encrypted ใน `byok-store.json` และ observability poll queue ใช้ไม่ได้ วางแผน migration หรือบันทึก credentials ใหม่หลัง rotate
:::

## 2. Persistent volumes

Mount หรือ backup paths เหล่านี้บน gateway host:

| File | วัตถุประสงค์ |
|------|-------------|
| `data/byok-store.json` | Provider keys encrypted + linked Gommo tokens |
| `data/byok-usage.jsonl` | BYOK usage events (append-only) |
| `data/byok-fee-ledger.json` | Platform fee accrual (ถ้าเปิด fees) |
| `config/byok-model-map.json` | Chat model routing (หรือ `BYOK_MODEL_MAP_FILE`) |

**Single instance:** file store ใช้ได้ **Multiple replicas:** แชร์ไฟล์เดียวกันผ่าน NFS/EFS **หรือ** รัน gateway instance เดียวสำหรับ BYOK จนมี shared store

## 3. Environment

| Variable | หมายเหตุ production |
|----------|---------------------|
| `BYOK_ENABLED` | `true` (default) — `false` ปิดทั้งหมด |
| `BYOK_ENCRYPTION_KEY` | **จำเป็น** — ดูด้านบน |
| `BYOK_STORE_FILE` | Absolute path บน persistent disk |
| `BYOK_MODEL_MAP_FILE` | Commit map ใน image หรือ mount config volume |
| `BYOK_BETA` | `true` (default) — portal แสดง beta badge |
| `BYOK_DEFAULT_SHARED_FALLBACK` | `true` = Gommo fallback เมื่อ provider ล้มเหลว |
| `BYOK_PLATFORM_FEE_*` | Optional — ดู [BYOK reference](/reference/byok.md#platform-fee-beta) |
| `BYOK_PROVIDERS` | Default `openai,anthropic` |

ดู [Deploy](/deploy/) สำหรับ `GATEWAY_CORS_ORIGIN`, `ADMIN_API_KEY`, merchant `GOMMO_*`

## 4. Model map

1. แก้ `config/byok-model-map.json` (หรือ `BYOK_MODEL_MAP_FILE` กำหนดเอง)
2. แต่ละ entry: `gatewayModelId` → `provider` + `upstreamModel` (+ optional `gommoServer`)
3. Redeploy หรือ restart หลังเปลี่ยน map
4. Verify: `GET /gateway/byok/status` → `supportedChatModels`

ผู้ใช้ต้องเลือโมเดลจากรายการนั้นใน Chat / API — ห้ามเดา upstream model ids

## 5. Portal + CORS

- Browser portal ที่ `/app/byok/` ต้อง build docs พร้อม `VITE_GATEWAY_URL` ชี้ API — ดู [Deploy § Docs](/deploy/#docs-deploy)
- ถ้า portal อยู่ origin ต่างจาก API ตั้ง `GATEWAY_CORS_ORIGIN`
- `GATEWAY_PORTAL=true` เฉพาะ serve `/portal` จาก API host (หายากใน prod; แนะนำ static docs site)

## 6. Smoke test (production)

Login บน portal ที่ deploy (หรือ staging พร้อม `NODE_ENV=production`):

- [ ] **Providers** → save OpenAI/Anthropic key → ข้อความเขียว → **Test** OK
- [ ] **Gommo** → link session → ตั้ง **primary** สำหรับ media
- [ ] **Chat** (`/app/chat/`) → BYOK-mapped model → ส่งข้อความสำเร็จ; usage row บน BYOK **Usage** tab
- [ ] **Media** → image job ยังใช้ Gommo credits (บัญชี primary ที่เชื่อม)
- [ ] **Delete** provider key → confirm → ถูกลบ
- [ ] Restart gateway → keys ยังทำงาน (store file persist)

Automated (CI, ไม่เรียก provider สด):

```bash
npm run test:byok
```

## 7. Backup & recovery

- **Backup:** copy `byok-store.json`, `byok-usage.jsonl`, `byok-fee-ledger.json` และ model map ตาม schedule
- **Restore:** stop gateway → restore files → `BYOK_ENCRYPTION_KEY` เดิม → start
- **Leak response:** rotate provider keys ที่ OpenAI/Anthropic, ลบ credential ผ่าน API/UI, ออก encryption key gateway ใหม่เฉพาะพร้อมแผน re-encryption เต็ม

## 8. Monitoring

- Log `402 INSUFFICIENT_CREDITS` บน BYOK chat (platform fee pre-check)
- Alert เมื่อ provider error ซ้ำใน `byok-usage.jsonl` หรือ BYOK Usage tab
- `GET /health` — `byokEnabled` / `byokBeta` ใน response data

## ที่เกี่ยวข้อง

- [BYOK reference](/reference/byok.md)
- [Chat](/reference/chat.md)
- [Portal smoke test](/guides/portal-smoke.md) — ส่วน BYOK
- [Deploy](/deploy/)
