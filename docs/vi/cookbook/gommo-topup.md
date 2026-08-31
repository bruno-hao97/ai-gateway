---
title: 'Cookbook: Nạp credit Gommo VietQR'
description: Liệt kê gói, tạo payment, poll sync, xem lịch sử
---

# Nạp credit Gommo VietQR

Billing nằm ở **`/billing/*`** — tách khỏi `/gateway`.

Mode mặc định: Gommo `create_payment` + client poll `payment_sync`. Không cần cấu hình PayOS trên server.

## 1. Trạng thái server

```powershell
Invoke-RestMethod "http://localhost:3001/billing/status"
```

Kỳ vọng `billingMode: gommo`.

## 2. Danh sách gói

```powershell
$packages = Invoke-RestMethod "http://localhost:3001/billing/packages"
$packages.data | Format-Table id, name, amountVnd, credits
```

## 3. Username từ `/ai/me`

```powershell
$me = Invoke-RestMethod -Uri "http://localhost:3001/ai/me" -Headers @{ Authorization = "Bearer $env:TOKEN" }
$username = $me.username ?? $me.data.username
```

## 4. Tạo payment

```powershell
$h = @{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }
$body = @{
  username = $username
  packageId = 'basic-member'
  invoiceBuyer = @{ type = 'consumer'; name = 'Bán cho người tiêu dùng'; email = '' }
} | ConvertTo-Json -Depth 5

$payment = Invoke-RestMethod -Method POST -Uri "http://localhost:3001/billing/payment/create" -Headers $h -Body $body
$orderCode = $payment.data.content ?? $payment.data.orderCode
```

## 5. Poll đến khi paid

```powershell
while ($true) {
  $sync = Invoke-RestMethod -Method POST -Uri "http://localhost:3001/billing/payment/sync" `
    -Headers $h -Body (@{ orderCode = $orderCode } | ConvertTo-Json)
  if ($sync.data.paid) { break }
  Start-Sleep -Seconds 4
}
```

## 6. Lịch sử

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/billing/topup/orders?username=$username" -Headers $h
```

## PayOS legacy

Xem [PayOS nạp credit](./payos-topup.md).

## Portal

`/app/credits/` có modal checkout đầy đủ (tóm tắt → hóa đơn 3 tab → VietQR).
