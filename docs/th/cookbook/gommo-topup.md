---
title: 'สูตร: Gommo VietQR เติมเครดิต'
description: ลิสต์แพ็ก สร้างการชำระ poll sync ดูประวัติ order
---

# Gommo VietQR เติมเครดิต

Billing อยู่ใต้ **`/billing/*`** — แยกจาก API generation ของ `/gateway`

โหมดค่าเริ่มต้น: Gommo `create_payment` + client poll `payment_sync` ไม่ต้องมี env PayOS บนเซิร์ฟเวอร์

## 1. สถานะเซิร์ฟเวอร์

```powershell
Invoke-RestMethod "http://localhost:3001/billing/status"
```

คาดหวัง `billingMode: gommo` และ `gommoPayment: true`

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

## 4. สร้างการชำระเงิน

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$body = @{
  username = $username
  packageId = 'basic-member'
  invoiceBuyer = @{
    type = 'consumer'
    name = 'Bán cho người tiêu dùng'
    email = ''
  }
} | ConvertTo-Json -Depth 5

$payment = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/billing/payment/create" `
  -Headers $h -Body $body

$qr = $payment.data.qrImage
$orderCode = $payment.data.content ?? $payment.data.orderCode
Write-Host "QR: $qr"
Write-Host "orderCode=$orderCode"
```

ผู้ใช้โอน**ยอดเรียกเก็บ** (ฐาน + VAT 5%) พร้อมหมายเหตุ `orderCode`

## 5. Poll จน paid

```powershell
while ($true) {
  $syncBody = @{ orderCode = $orderCode } | ConvertTo-Json
  $sync = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:3001/billing/payment/sync" `
    -Headers $h -Body $syncBody
  if ($sync.data.paid) { Write-Host 'Paid!'; break }
  Start-Sleep -Seconds 4
}
```

## 6. ประวัติ order

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3001/billing/topup/orders?username=$username&limit=10" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

## PayOS legacy

หากรัน fulfillment ที่ merchant ควบคุม ดู [PayOS เติมเครดิต](./payos-topup.md) (`POST /billing/topup/create`)

## UI Portal

Developer portal (`/th/app/credits/`) ทำ checkout แบบ 79ai ครบ: สรุป → ใบแจ้งหนี้ (3 แท็บ) → VietQR + poll
