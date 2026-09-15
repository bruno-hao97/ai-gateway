---
title: Billing & เครดิต
description: เติมเครดิต Gommo VietQR และภาพรวมการเติมเครดิต
---

# Billing & เครดิต

**เติมเครดิต** ผู้ใช้ปลายทางผ่าน Gommo (`create_payment` + VietQR) — แยกจาก API generation ของ `/gateway`

เส้นทางค่าเริ่มต้น proxy API subscriptions ของ Gommo เครดิตเติมโดย **Gommo upstream** หลังโอนเงิน gateway poll `payment_sync` จาก client

**UI Portal:** [`/th/app/credits/`](/th/app/credits/) — KPI ยอดคงเหลือ แพ็ก VietQR modal checkout และประวัติเติมเครดิต ลิงก์ไป Activity Billing และ [เอกสาร billing](./billing-credits.md)

## ภาพรวม

```
แอปผู้ใช้ ──► POST /billing/payment/create (Bearer user)
                └── Gommo VietQR + order code (SP…)
                        └── poll payment_sync ──► paid: true → Gommo เติมเครดิตผู้ใช้
```

Legacy PayOS + `sendBalances` (`POST /billing/topup/create`) ยังมีเมื่อตั้ง `PAYOS_*` สำหรับ fulfillment ที่ merchant ควบคุม

## สิ่งที่ต้องมี

| ข้อกำหนด | Env / หมายเหตุ |
|----------|----------------|
| Gommo domain | `GOMMO_API_DOMAIN` (ค่าเริ่มต้น `79ai.net`) |
| Session ผู้ใช้ | Bearer จาก `/ai/login` — เหมือน API generation |
| ฟิลด์ device | `device_id`, `device_name`, `device_info` (portal ส่งอัตโนมัติ) |
| Legacy PayOS (ทางเลือก) | `PAYOS_*` + `GOMMO_ACCESS_TOKEN` สำหรับ `/billing/topup/create` |

ตรวจ config:

```http
GET /billing/status
```

คืน `billingMode: "gommo"`, `gommoPayment: true` และ `payosConfigured` ทางเลือก

## แพ็กเกจ

```http
GET /billing/packages
```

คืนแพ็กเครดิต (`id`, `amountVnd`, `credits`, `gommoIdBase`) กำหนดใน server `creditPackages.ts`

## สร้างการชำระเงิน (Gommo)

```http
POST /billing/payment/create
Authorization: Bearer {user_access_token}
Content-Type: application/json

{
  "username": "gommo_username_from_/ai/me",
  "packageId": "basic-member",
  "invoiceBuyer": {
    "type": "consumer",
    "name": "Bán cho người tiêu dùng",
    "email": ""
  },
  "promoCode": "OPTIONAL",
  "referralCode": "OPTIONAL"
}
```

Response มี URL รูป VietQR ฟิลด์โอน (`holder`, `acc`, `bank`, `content`) VAT breakdown และ `orderCode`

Gateway เก็บ order ในเครื่อง (`TOPUP_ORDERS_FILE`) สำหรับประวัติ

## Poll สถานะการชำระเงิน

```http
POST /billing/payment/sync
Authorization: Bearer {user_access_token}
Content-Type: application/json

{ "orderCode": "SP..." }
```

Poll ทุก ~3.5s จน `data.paid === true` Gommo เติมเครดิตผู้ใช้อัตโนมัติ

## ประวัติ order

```http
GET /billing/topup/orders?username={}&limit=20
Authorization: Bearer {user_access_token}
```

คืน order ในเครื่องสำหรับ Gommo และ legacy PayOS สถานะ: `pending`, `paid`, `credited`, `failed`

## เทียบกับ `/gateway`

| Path | วัตถุประสงค์ |
|------|-------------|
| `/gateway/*` | ใช้เครดิต (โมเดล งาน แชท …) |
| `/billing/*` | เติมเครดิต (Gommo VietQR หรือ legacy PayOS) |

ห้าม mount logic billing ใต้ `/gateway`

## อ้างอิงฉบับเต็ม

→ [อ้างอิง Billing API](./../reference/billing.md)  
→ [คู่มือ: Gommo VietQR เติมเครดิต](./../cookbook/gommo-topup.md)

## ถัดไป

→ [FAQ](./../faq.md) · [การยืนยันตัวตน](./../authentication.md)
