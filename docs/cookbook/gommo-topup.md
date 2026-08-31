---
title: 'Recipe: Gommo VietQR credit topup'
description: List packages, create payment, poll sync, view order history
---

# Gommo VietQR credit topup

Billing lives under **`/billing/*`** — separate from `/gateway` generation APIs.

Default mode: Gommo `create_payment` + client poll `payment_sync`. No PayOS env required on your server.

## 1. Server status

```powershell
Invoke-RestMethod "http://localhost:3001/billing/status"
```

Expect `billingMode: gommo` and `gommoPayment: true`.

## 2. List packages

```powershell
$packages = Invoke-RestMethod "http://localhost:3001/billing/packages"
$packages.data | Format-Table id, name, amountVnd, credits, bonusPercent
```

Package ids include `basic-member`, `vip-member`, `ultra-member`, …

## 3. Get username from `/ai/me`

`username` in the create body must match the Bearer token owner.

```powershell
$me = Invoke-RestMethod `
  -Uri "http://localhost:3001/ai/me" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$username = $me.username ?? $me.data.username
Write-Host "username=$username"
```

## 4. Create payment

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

User transfers the **charge amount** (base + 5% VAT) with memo `orderCode`.

## 5. Poll until paid

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

## 6. Order history

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3001/billing/topup/orders?username=$username&limit=10" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
```

## Legacy PayOS

If you run merchant-controlled fulfillment, see [PayOS topup](./payos-topup.md) (`POST /billing/topup/create`).

## Portal UI

The developer portal (`/app/credits/`) implements the full 79ai-style checkout: summary → invoice (3 tabs) → VietQR + poll.
