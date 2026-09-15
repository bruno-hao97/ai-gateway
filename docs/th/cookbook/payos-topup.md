---
title: 'สูตร: PayOS เติมเครดิต (legacy)'
description: PayOS ที่ merchant ควบคุม + sendBalances — ค่าเริ่มต้นใช้ Gommo VietQR
---

# PayOS เติมเครดิต (legacy)

::: warning
**เส้นทาง legacy** การเชื่อมต่อใหม่ควรใช้ [Gommo VietQR เติมเครดิต](./gommo-topup.md) (`POST /billing/payment/create`) สูตรนี้ต้องมีคีย์ PayOS และ merchant `GOMMO_ACCESS_TOKEN` บนเซิร์ฟเวอร์
:::

Billing อยู่ใต้ **`/billing/*`** — แยกจาก API generation ของ `/gateway`

ต้องมี env เซิร์ฟเวอร์: คีย์ PayOS + `GOMMO_ACCESS_TOKEN` ตรวจความพร้อมก่อน

## 1. สถานะเซิร์ฟเวอร์

```powershell
Invoke-RestMethod "http://localhost:3001/billing/status"
```

คาดหวัง `payosConfigured: true` และ `merchantReady: true` ก่อนสร้าง order

## 2. ลิสต์แพ็ก

```powershell
$packages = Invoke-RestMethod "http://localhost:3001/billing/packages"
$packages.data | Format-Table id, name, amountVnd, credits, bonusPercent
```

package id รวม `basic-member`, `vip-member`, `ultra-member`, …

## 3. ได้ username จาก `/ai/me`

`username` ใน body สร้างต้องตรงกับเจ้าของ Bearer token

```powershell
$me = Invoke-RestMethod `
  -Uri "http://localhost:3001/ai/me" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$username = $me.username ?? $me.data.username
Write-Host "username=$username"
```

## 4. สร้าง order เติมเครดิต

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$body = @{
  username = $username
  packageId = 'basic-member'
} | ConvertTo-Json

$order = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/billing/topup/create" `
  -Headers $h -Body $body

$checkoutUrl = $order.data.url
$orderCode = $order.data.orderCode
Write-Host "Pay: $checkoutUrl"
Write-Host "orderCode=$orderCode"
```

เปิด `url` ในเบราว์เซอร์ (PayOS checkout / QR) ผู้ใช้ชำระเงินบน PayOS

## 5. Poll order (ทางเลือก)

Webhook `PAID` → gateway ส่งเครดิต Gommo อัตโนมัติ Poll ถ้า webhook ไม่ถึงใน dev:

```powershell
Invoke-RestMethod "http://localhost:3001/billing/topup/orders/$orderCode"
```

สถานะ: `pending` → `paid` → `credited` (หรือ `failed`)

## Webhook (production)

ลงทะเบียนที่ [my.payos.vn](https://my.payos.vn):

```
POST https://api.yourdomain.com/billing/webhook/payos
```

ตั้ง `PAYOS_WEBHOOK_URL` ใน env เซิร์ฟเวอร์ ดู [อ้างอิง billing](../reference/billing.md)

## ถัดไป

- [คู่มือ Billing & เครดิต](../guides/billing-credits.md)
- [อ้างอิง billing](../reference/billing.md)
