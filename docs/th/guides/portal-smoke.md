---
title: Portal smoke test
description: Checklist end-to-end สำหรับ developer portal UI ที่ /app/
---

# Portal smoke test

รันหลังแก้ portal UI (`docs/.vitepress/theme/`) หรือ gateway REST ที่ portal ใช้

## สิ่งที่ต้องมีก่อน

- Login แล้ว (`gw_access_token` ใน browser)
- `npm run docs:stack` (docs `:5173` + API `:3001`) หรือ remote gateway ผ่าน `GATEWAY_PROXY_TARGET`

```bash
npm run theme:test
npm run test:aggregate
npm run portal:smoke   # HTTP 200 + HTML fragments (ต้อง docs:stack)
```

## Overview (`/app/`)

- [ ] Hero: **Open Playground**, **Activity**, **Copy token**
- [ ] Usage widget (7 วัน) โหลด; งานล่าสุดคลิกได้ → Explore + job modal
- [ ] การ์ด **Workspace**: Activity, Access token, Credits, BYOK, Files, Observability
- [ ] **credits pill** ใน header / sidebar → `/app/credits/`
- [ ] **Resources**: Quickstart, MCP, Authentication, **Portal smoke test** (หน้านี้)

## Playground (`/app/playground/`)

Immersive embed — ไม่มี app sidebar/header ดู [API Playground](/reference/playground.md) (redirect มาที่นี่)

- [ ] Overview hero **Open Playground** → `/app/playground/`
- [ ] Iframe โหลด (default worker **Create image**); ไม่มี loading spinner ไม่จบ
- [ ] Login แล้ว → playground รับ token (Connection OK / list models ได้)
- [ ] **List models** → เลือโมเดล catalog + ratio จาก list (ไม่เดา)
- [ ] **Image job** ติ๊ก **wait** → `resultUrl` ใน response / preview
- [ ] หลัง **SUCCESS** สลับ **REQUEST** / **ENDPOINTS** / **AI GUIDE** — tab คงอยู่ (poll ไม่แย่ง **RESULT**)
- [ ] URL อัปเดตเมื่อสลับ worker (`?worker=create-video` ฯลฯ)
- [ ] Deep link จาก [Models](/models/) ปุ่ม **Playground** → `?model=` กรอกล่วงหน้า
- [ ] Optional: Observability **Local mirror** เปิด → แถว job ปรากฏหลังรัน

## Chat (`/app/chat/`)

- [ ] Low-credit banner เมื่อยอด &lt; threshold
- [ ] BYOK hint เมื่อ gateway มี mapped chat models — ลิงก์ **Open BYOK**
- [ ] Hint อัปเดตเมื่อเลือโมเดล BYOK-mapped (พร้อม provider key ที่บันทึก)
- [ ] Model picker แสดง badge **BYOK** บน mapped models

## Activity (`/app/activity/`)

ดู [Activity hub](./activity-hub.md) สำหรับ URL params ผ่านเร็ว:

- [ ] Overview → period, Refresh, Export CSV, Usage by type → Explore
- [ ] Top models → Explore `?model=`; cache tooltip; job modal `?job=` ต่อแถว
- [ ] Explore → filters, Load more, Clear all filters
- [ ] Billing → ลิงก์คง `?period=`

## Access token (`/app/token/`)

- [ ] Tab **Gateway** snippet; Copy token; ข้อความ Test connection สำเร็จ
- [ ] ลิงก์ last activity → Activity Explore (เมื่อมี jobs)

## Files (`/app/files/`)

- [ ] Upload → ข้อความสำเร็จ; **Recent uploads** คงหลัง reload
- [ ] Copy URL / Copy fields

## BYOK (`/app/byok/`)

ดู [BYOK reference](/reference/byok.md) และ [BYOK production checklist](/guides/byok-production.md) ผ่านเร็ว:

- [ ] Save key → ข้อความเขียว (ไม่ flash ทั้งหน้า; **Refreshing…** เท่านั้น)
- [ ] Test / Delete พร้อม confirm
- [ ] Usage tab → ลิงก์ Activity; event badges เมื่อ chat BYOK รันแล้ว

## Observability (`/app/observability/`)

ดู [Observability reference](/reference/observability.md) ผ่านเร็ว:

- [ ] Stat cards → Activity / Credits
- [ ] Webhook add, test, delete; payload Copy JSON
- [ ] `wait: false` async job + webhook → delivery หลัง background poll (`data.background: true`)
- [ ] Optional live: `npm run observability:verify-background` — ดู [Observability reference](/reference/observability.md#automated-background-verify-live)

## Credits (`/app/credits/`)

ดู [Billing & credits](./billing-credits.md) ผ่านเร็ว:

- [ ] Low-balance banner เมื่อ credits &lt; threshold
- [ ] KPI row: balance, total topped up, order count, last order
- [ ] Quick links → Activity Billing, Job logs, Overview, Billing docs
- [ ] Package grid: featured **accent**, อื่น **primary**; VietQR checkout modal
- [ ] Top-up history table; stale pending toggle; header **Refresh** reload packages + orders

## Profile (`/app/profile/`)

- [ ] Usage pill **7d**; ลิงก์ไป Activity period เดียวกัน
- [ ] Recent jobs → Explore job modal

## Automated

```bash
npm run theme:test      # URL helpers, usage normalize
npm run test:aggregate  # usage aggregate cache (Activity Overview)
npm run portal:smoke    # route + fragment checks (docs :5173 + API :3001)
node scripts/verify-request-tab.mjs   # Playground response tab pin (ต้อง docs:stack)
npm run observability:verify-background   # live async job + webhook (ต้อง token ใน .env)
```
