---
title: Privacy & security
description: Credentials, secrets, logging และความปลอดภัย billing
---

# Privacy & security

AI Gateway เป็น **API platform** — ผู้ใช้ authenticate ด้วย Gommo user tokens; server ของคุณเก็บ merchant และ admin secrets หน้านี้อธิบายสิ่งที่ต้องเป็นส่วนตัวและ gateway จัดการข้อมูล sensitive อย่างไร

## Trust boundaries

```
Browser / mobile app          Your server (gateway)           Gommo upstream
─────────────────────         ─────────────────────           ──────────────
User email/password    →      (proxy login only)       →      api.gommo.net
User access_token      →      Bearer on /gateway/*   →      v2 + platform
                               GOMMO_ACCESS_TOKEN     →      /admin, billing fulfill
                               ADMIN_API_KEY          →      protects /admin/*
                               PayOS keys (legacy)    →      webhook verify only
```

**กฎ:** สิ่งใดในคอลัมน์ server-only secrets ต้อง **ไม่** ส่งไป browsers, mobile apps หรือ public repos

## ประเภท credentials

| Credential | อยู่ที่ | Expose ให้ clients? | ใช้สำหรับ |
|------------|---------|---------------------|----------|
| User `access_token` | Client storage (หลัง login) | ใช่ — Bearer header | `/gateway/*`, proxy user routes |
| User password | Login form เท่านั้น | ห้ามเก็บระยะยาว | Login ครั้งเดียวผ่าน proxy |
| `GOMMO_ACCESS_TOKEN` | Server `.env` / secrets | **ห้าม** | `/admin/*`, Gommo billing fulfill, sync `credit_plans` |
| `ADMIN_API_KEY` | Server `.env` / secrets | **ห้าม** | Header `x-admin-key` บน `/admin/*` |
| PayOS keys (legacy) | Server `.env` | **ห้าม** | Legacy PayOS topup เท่านั้น |

ดู [Authentication](../authentication.md) สำหรับ login flow

## `/gateway` ไม่ expose อะไร

Mode B REST **ไม่** คืนหรือรับ:

- Merchant `GOMMO_ACCESS_TOKEN`
- `ADMIN_API_KEY`
- PayOS `checksumKey` หรือ API secrets

Billing ใช้ **user Bearer** + `username` — fulfillment เรียก merchant APIs **ภายใน** gateway process

## `/admin` เป็น server-only

Route `/admin/*` ทั้งหมดต้อง `x-admin-key: {ADMIN_API_KEY}` เมื่อตั้งค่า ใช้สำหรับ:

- ตรวจยอด merchant
- ส่ง credits ด้วยมือ
- ลงทะเบียนผู้ใช้ (merchant)

ถ้า `ADMIN_API_KEY` ไม่ตั้ง admin routes คืน `503 NOT_CONFIGURED`

::: danger ห้ามใน frontend code
ห้ามฝัง `ADMIN_API_KEY` หรือ `GOMMO_ACCESS_TOKEN` ใน SPA, React Native bundles หรือ public GitHub repos
:::

## Gommo billing (default)

Flow เติม credits (VietQR ผ่าน Gommo):

1. Client สร้าง order ผ่าน `POST /billing/payment/create` (user Bearer)
2. ผู้ใช้ชำระผ่านโอน/VietQR ด้วย transfer content จาก response
3. Client poll `POST /billing/payment/sync` (หรือ gateway background sync) จนชำระแล้ว
4. เมื่อสำเร็จ `sendCreditsToUser()` ภายใน — client ไม่เกี่ยว merchant APIs

**ข้อกำหนด:**

- ตั้ง `GOMMO_ACCESS_TOKEN` สำหรับ fulfillment และ sync package สด (`GET /billing/packages`)
- Transfer content (`orderCode`) ต้องตรงเป๊ะ — ผู้ใช้ไม่ควรแก้

ดู [Billing & credits](../guides/billing-credits.md)

## PayOS webhook security (legacy)

Legacy PayOS topup (`POST /billing/topup/create`) ยังรองรับเมื่อตั้ง PayOS env:

1. Client สร้าง order ผ่าน `POST /billing/topup/create` (user Bearer)
2. ผู้ใช้ชำระบน PayOS
3. PayOS POST `/billing/webhook/payos` พร้อม signed payload
4. Gateway verify **checksum** ด้วย `PAYOS_CHECKSUM_KEY`
5. เมื่อ `PAID` fulfillment credits ภายใน

**ข้อกำหนด:**

- `PAYOS_WEBHOOK_URL` ต้องเป็น **public HTTPS** ชี้ไป API ของคุณ
- ลงทะเบียน URL เดียวกันบน [PayOS dashboard](https://my.payos.vn)
- ปฏิเสธหรือไม่สนใจ webhook ที่ checksum ไม่ผ่าน

## Logging และการจัดการข้อมูล

**ควร log (operations):**

- HTTP method, path, status code
- Structured error `code` (ไม่ใช่ upstream secrets ดิบ)
- `GET /health` สำหรับ uptime checks

**ห้าม log:**

- `GOMMO_ACCESS_TOKEN`, `ADMIN_API_KEY`, PayOS keys
- รหัผ่านผู้ใช้หรือ `Authorization` header เต็มใน production
- PayOS checksum secrets

Prompt ผู้ใช้และ media URLs อาจปรากฏใน upstream logs ฝั่ง Gommo — จัดการตามนโยบาย privacy และข้อกำหนด Gommo

## CORS และการ expose ใน browser

CORS **ปิดโดย default** (`GATEWAY_CORS_ORIGIN` ว่าง) เมื่อเปิด:

- เฉพาะ origins ที่ระบุเรียก API จาก JavaScript ได้
- `credentials: true` — ใช้ explicit origins ไม่ใช่ `*` ใน production ยกเว้นเข้าใจความเสี่ยง

User tokens ใน localStorage/sessionStorage เป็น **ความรับผิดชอบแอปของคุณ** — ใช้ HTTPS, TTL สั้น และ logout ที่ปลอดภัย

## Portal ใน production

Dev playground ที่ `/portal/` **ปิดใน production** ยกเว้น `GATEWAY_PORTAL=true`

Portal ทดสอบ API แบบ authenticated — expose สาธารณะเพิ่ม attack surface แนะนำ VPN ภายในหรือ deploy dev-only

## Environment hygiene

| แนวทาง | เหตุผล |
|--------|--------|
| คัดลอกจาก `.env.example` ห้าม commit `.env` | ป้องกัน leak secrets |
| ใช้ platform secrets (Railway/Fly) ใน prod | Rotate โดยไม่มี git history |
| Rotate tokens ถ้าแชร์โดยไม่ตั้งใจ | Merchant + admin keys |
| แยก dev/prod merchant tokens ถ้าได้ | ลด blast radius |

## Merchant credit buffer

หลัง `sendBalances` Gommo ต้องการยอด merchant **> 500,000 credits** Gateway env `TOPUP_MERCHANT_BUFFER_CREDITS` (default 300k) ป้องกัน fulfillment — ตั้งให้ topup อัตโนมัติไม่ drain merchant จนหมด

## รายงานปัญหา security

→ [Report feedback](../report-feedback.md) — ระบุ **security**; ห้าม paste live tokens ใน public issues

## ขั้นตอนถัดไป

→ [Best practices](../best-practices/) · [Deploy & ops](../deploy/) · [Authentication](../authentication.md)
