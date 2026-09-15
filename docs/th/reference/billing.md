---
title: การเรียกเก็บเงิน
description: endpoint การชำระเงิน Gommo และเติมเครดิต PayOS legacy
---

# การเรียกเก็บเงิน

แยกจาก `/gateway` — เติมเครดิตผ่าน Gommo VietQR (ค่าเริ่มต้น) หรือ PayOS legacy + `sendBalances` ภายใน

## Env

| ตัวแปร | วัตถุประสงค์ |
|--------|-------------|
| `GOMMO_API_DOMAIN` | Domain ส่งไป Gommo (`create_payment` ค่าเริ่มต้น `79ai.net`) |
| `TOPUP_ORDERS_FILE` | แผนที่ order JSON (ค่าเริ่มต้น `data/topup-orders.json`) |
| `PAYOS_CLIENT_ID` | PayOS legacy เท่านั้น |
| `PAYOS_API_KEY` | PayOS legacy เท่านั้น |
| `PAYOS_CHECKSUM_KEY` | PayOS legacy + ตรวจ webhook |
| `PAYOS_WEBHOOK_URL` | ลงทะเบียนที่ my.payos.vn → `https://api…/billing/webhook/payos` |
| `GOMMO_ACCESS_TOKEN` | fulfillment legacy ผ่าน `sendBalances` |

## Endpoints

| Method | Path | Auth | โหมด |
|--------|------|------|------|
| GET | `/billing/status` | — | — |
| GET | `/billing/packages` | — | — |
| POST | `/billing/payment/create` | Bearer user | **Gommo** |
| POST | `/billing/payment/sync` | Bearer user | **Gommo** |
| GET | `/billing/topup/orders` | Bearer user | ประวัติในเครื่อง |
| GET | `/billing/topup/orders/:orderCode` | — | ค้นหาในเครื่อง |
| POST | `/billing/topup/create` | Bearer user | PayOS legacy |
| GET/POST | `/billing/webhook/payos` | PayOS signature | Legacy |

## สร้างการชำระเงิน Gommo

```bash
curl.exe -X POST "http://localhost:3001/billing/payment/create" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"gommo_user\",\"packageId\":\"basic-member\",\"invoiceBuyer\":{\"type\":\"consumer\",\"name\":\"Bán cho người tiêu dùng\",\"email\":\"\"}}"
```

ฟิลด์ response (ส่งต่อจาก Gommo):

| ฟิลด์ | คำอธิบาย |
|-------|----------|
| `orderCode` / `content` | หมายเหตุโอน (`SP…`) |
| `qrImage` / `qrFallback` | URL รูป VietQR |
| `holder`, `acc`, `bank`, `store` | รายละเอียดโอนเงิน |
| `amountVnd`, `amountBaseVnd`, `vatAmountVnd` | แยกยอดเรียกเก็บ |
| `paymentServer` | เช่น `sepay` |

ฟิลด์ body ทางเลือก: `promoCode`, `referralCode` (และ `invoiceBuyer.referral_code` สำหรับใบแจ้งหนี้บุคคล)

## Sync การชำระเงิน

```bash
curl.exe -X POST "http://localhost:3001/billing/payment/sync" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderCode\":\"SP...\"}"
```

เมื่อ `data.paid` เป็น `true` gateway ทำเครื่องหมาย order ในเครื่องเป็น `credited`

## เติมเครดิต PayOS legacy

`POST /billing/topup/create` สร้าง checkout PayOS และเก็บ `orderCode` ตัวเลข webhook `PAID` เรียก `sendCreditsToUser()` ภายใน

## แพ็กเครดิต

ดู `GET /billing/packages` หรือ `src/services/creditPackages.ts` แต่ละแพ็ก map ไป Gommo `credit_plans` `key` ส่งเป็น `gommoIdBase` ใน `create_payment` (`credit-basic`, `credit-agency`, …) `amountVnd` เป็นราคาก่อน VAT (`priceVND` บน 79ai `/prices`) checkout เพิ่ม VAT 5%
