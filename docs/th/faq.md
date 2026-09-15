---
title: คำถามที่พบบ่อย
description: คำถามที่พบบ่อยเกี่ยวกับ AI Gateway
---

# คำถามที่พบบ่อย

คำถามทั่วไปเกี่ยวกับ AI Gateway และ Gommo upstream

::: info สถานะ upstream
Catalog งาน และ login เรียก **Gommo public API** หาก `v2.api.gommo.net` หรือ `api.gommo.net` ล่ม `/th/models/` และ Playground **Send** จะล้มเหลว — docs และ UI ยังโหลดได้ ลองใหม่เมื่อ upstream กลับมา
:::

## เริ่มต้น

<details>
<summary>AI Gateway ต่างจากเรียก Gommo ตรงอย่างไร?</summary>

**Gommo public API (แนะนำ):** เรียก `https://v2.api.gommo.net` และ `https://api.gommo.net` โดยตรง — ดู [Gommo public API](./reference/gommo-public-api.md)  
**AI Gateway (dev ทางเลือก):** base local เดียว — REST `/gateway/*` (โหมด B) หรือ path proxy (โหมด C) poll `wait: true` billing Gommo VietQR

</details>

<details>
<summary>ต้องมีอะไรเพื่อรัน local?</summary>

- Node.js 18+
- `cp .env.example .env` และตั้ง `GOMMO_API_DOMAIN`
- `npm install` && `npm run dev` → `http://localhost:3001`
- Docs: `npm run docs:dev` → `http://localhost:5173`
- ทางเลือก: credential ผู้ใช้ Gommo สำหรับ [เริ่มต้นใช้งาน](./quickstart.md)

</details>

<details>
<summary>API playground อยู่ที่ไหน?</summary>

[/th/app/playground/](/th/app/playground/) — เข้าสู่ระบบบน docs playground ฝัง portal และส่ง token อัตโนมัติ

Dev: docs `:5173` API gateway `:3001`

</details>

## การยืนยันตัวตน

<details>
<summary>ได้ user token อย่างไร?</summary>

`POST /api/apps/go-mmo/auth/login` ด้วย `email`, `password`, `domain` (โดเมนลงทะเบียน) Response: `access_token` ดู [การยืนยันตัวตน](./authentication.md)

</details>

<details>
<summary>ต้องส่ง domain ทุก call /gateway ไหม?</summary>

**โหมด B:** ทางเลือก — gateway ใช้ `GOMMO_API_DOMAIN` จาก env เซิร์ฟเวอร์  
**โหมด C / Direct:** ส่ง `domain` ใน form body ตรงกับโดเมนลงทะเบียนผู้ใช้

</details>

<details>
<summary>Merchant token คืออะไร?</summary>

`GOMMO_ACCESS_TOKEN` ใน `.env` เซิร์ฟเวอร์ — สำหรับ `/admin/*` และ fulfillment PayOS legacy ไม่บังคับสำหรับเติม Gommo VietQR ค่าเริ่มต้น ห้ามใส่ใน browser

</details>

## โมเดล & งาน

<details>
<summary>งานล้มเพราะ ratio/mode ไม่ถูกต้อง?</summary>

คุณเดาพารามิเตอร์ ลิสต์โมเดลก่อนเสมอและใช้ค่าจากแคตตาล็อก ดู [โมเดล](./models/)

</details>

<details>
<summary>Poll ใช้เวลานานแค่ไหน?</summary>

Gateway ช่วง **3.5s** สูงสุด **80** ครั้ง (~4.7 นาที) เมื่อ `wait: true` วิดีโอมัก 1–5 นาที

</details>

<details>
<summary>Gommo มี webhook เมื่องานเสร็จไหม?</summary>

ไม่ — client หรือ gateway ต้อง poll สถานะงาน

</details>

## API & โหมด

<details>
<summary>โหมด B vs โหมด C — เลือกอะไร?</summary>

- **โหมด B** — การเชื่อมต่อใหม่ JSON ข้อผิดพลาดมีโครงสร้าง `wait` ทางเลือก
- **โหมด C** — FE ที่ใช้ path Gommo อยู่แล้ว เปลี่ยนโค้ดน้อย

ดู [โหมดการเชื่อมต่อ](./routing/integration-modes.md)

</details>

<details>
<summary>REST คืนข้อผิดพลาดรูปแบบใด?</summary>

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

</details>

## Billing

<details>
<summary>เติมเครดิตอย่างไร?</summary>

**ค่าเริ่มต้น:** Gommo VietQR — `POST /billing/payment/create` (Bearer user) แล้ว poll `POST /billing/payment/sync` จน `paid: true` Portal: [/th/app/credits/](/th/app/credits/) คู่มือ: [Gommo เติมเครดิต](./cookbook/gommo-topup.md)

**Legacy (ทางเลือก):** PayOS ผ่าน `POST /billing/topup/create` เมื่อตั้ง `PAYOS_*` และ merchant ดู [PayOS เติมเครดิต (legacy)](./cookbook/payos-topup.md)

</details>

<details>
<summary>Billing ผิดพลาด — ตรวจอะไร?</summary>

เรียก `GET /billing/status` — flow ค่าเริ่มต้นต้อง `billingMode: "gommo"` และ `gommoPayment: true`

ข้อผิดพลาดที่พบบ่อย:

- Bearer ไม่ตรง `username` ใน body
- `packageId` ไม่ถูกต้อง
- PayOS legacy: `payosConfigured` หรือ `merchantReady` เป็น false

</details>

<details>
<summary>/billing/topup/create คืน 503?</summary>

Path นี้สำหรับ **PayOS legacy** เท่านั้น PayOS หรือ merchant env ยังไม่ตั้ง การเชื่อมต่อใหม่ใช้ `POST /billing/payment/create` ตรวจ `GET /billing/status`

</details>

<details>
<summary>ต้องมี billing เพื่อใช้ /gateway?</summary>

ไม่ — billing เป็นการเติมทางเลือก ผู้ใช้ต้องมีเครดิต Gommo (บัญชี upstream หรือเติมเงิน)

</details>

## MCP & Cursor {#mcp-cursor}

<details>
<summary>ควรใช้ MCP ไหนใน Cursor?</summary>

**แนะนำ:** **[79ai remote MCP](./mcp/other-hosts.md)** — 10 tools token [/th/app/token/](/th/app/token/) JSON สำหรับ Cursor Claude ChatGPT และ [โฮสต์อื่น](/th/mcp/other-hosts.md)

**แอป production:** HTTP [`/gateway/*`](/th/routing/endpoint-map.md)

**ทางเลือก:** [Self-hosted](/th/mcp/self-hosted.md) เมื่อ IDE ต้องเรียก `GATEWAY_URL` แยก

</details>

<details>
<summary>79ai MCP ทำอะไรได้?</summary>

**10 tools:** บัญชี/เครดิต แคตตาล็อก สร้างรูป/วิดีโอ poll status/stream ประวัติงาน แจ้งเตือน ดู [tools](/th/mcp/tools.md) และ [กรณีใช้งาน](/th/mcp/use-cases.md)

</details>

<details>
<summary>ใช้ 79ai MCP นอก Cursor ได้ไหม?</summary>

**ได้** — client MCP ที่รองรับ remote `url` + headers [โฮสต์อื่น](/th/mcp/other-hosts.md) ChatGPT/Gemini web ไม่ใช้ MCP — ใช้ HTTP

</details>

<details>
<summary>Token /app/token/ ใช้กับ 79ai MCP ได้ไหม?</summary>

ได้ เข้าสู่ระบบ/สมัครคืน **`access_token` ผู้ใช้ Gommo** ใส่ใน header 79ai MCP (`Gommo-Token` + `Authorization: Bearer …`) และ `Authorization: Bearer …` สำหรับ HTTP `/gateway/*` ในแอป

</details>

<details>
<summary>ต้องรัน gateway เพื่อใช้ MCP ไหม?</summary>

**ไม่** กับ [79ai MCP](/th/mcp/other-hosts.md) — tool เรียก MCP host ของ Gommo

**ใช่** เฉพาะ [self-hosted MCP](/th/mcp/self-hosted.md) (`@ai-gateway/mcp-server` + `GATEWAY_URL`)

</details>

<details>
<summary>@ai-gateway/mcp-server คืออะไร?</summary>

แพ็กเกจทางเลือกสำหรับ merchant ที่ต้องการ tool Cursor เรียก **gateway URL ของตัวเอง** แทน 79ai remote MCP ดู [Self-hosted](/th/mcp/self-hosted.md) ผู้ใช้ส่วนใหญ่ใช้ 79ai MCP

</details>

## Deploy & ปฏิบัติการ

<details>
<summary>ต้องใช้ CORS เมื่อไหร่?</summary>

เมื่อ **browser app origin ต่าง** เรียก API (เช่น `localhost:5175`) ไม่ต้องสำหรับ `/portal` หรือ client ฝั่งเซิร์ฟเวอร์

ตั้ง `GATEWAY_CORS_ORIGIN` หลาย origin คั่นด้วย comma

ดู [Deploy](/th/deploy/) และ [แนวปฏิบัติที่ดี](/th/best-practices/)

</details>

<details>
<summary>/portal มีบน production ไหม?</summary>

ปิดค่าเริ่มต้น (`NODE_ENV=production`) เปิด `GATEWAY_PORTAL=true` หากยอมรับความเสี่ยง

</details>

## ยังติดขัด?

→ [ส่ง feedback](./report-feedback.md) · [ชุมชน](./community/)
