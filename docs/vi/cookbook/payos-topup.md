---
title: 'Recipe: PayOS nạp credit (legacy)'
description: PayOS merchant + sendBalances — mặc định dùng Gommo VietQR
---

# PayOS nạp credit (legacy)

::: warning
**Luồng cũ.** Tích hợp mới nên dùng [Gommo VietQR](./gommo-topup.md) (`POST /billing/payment/create`). Recipe này cần `PAYOS_*` và `GOMMO_ACCESS_TOKEN` trên server.
:::

Billing nằm ở **`/billing/*`** — tách khỏi API generation `/gateway`.

Cần env server: PayOS keys + `GOMMO_ACCESS_TOKEN`. Kiểm tra sẵn sàng trước.

## 1. Trạng thái server

```powershell
Invoke-RestMethod "http://localhost:3001/billing/status"
```

Cần `payosConfigured: true` và `merchantReady: true` trước khi tạo order.

## 2. List gói

```powershell
$packages = Invoke-RestMethod "http://localhost:3001/billing/packages"
$packages.data | Format-Table id, name, amountVnd, credits, bonusPercent
```

Package id: `basic-member`, `vip-member`, `ultra-member`, …

## 3. Lấy username từ `/ai/me`

`username` trong body create phải khớp chủ Bearer token.

```powershell
$me = Invoke-RestMethod `
  -Uri "http://localhost:3001/ai/me" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" }
$username = $me.username ?? $me.data.username
Write-Host "username=$username"
```

## 4. Tạo order topup

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

Mở `url` trên trình duyệt (PayOS checkout / QR). User thanh toán trên PayOS.

## 5. Poll order (tùy chọn)

Webhook `PAID` → gateway gửi credit Gommo tự động. Poll khi webhook chưa reachable ở dev:

```powershell
Invoke-RestMethod "http://localhost:3001/billing/topup/orders/$orderCode"
```

Trạng thái: `pending` → `paid` → `credited` (hoặc `failed`).

## Webhook (production)

Đăng ký trên [my.payos.vn](https://my.payos.vn):

```
POST https://api.yourdomain.com/billing/webhook/payos
```

Set `PAYOS_WEBHOOK_URL` trên server. Xem [Billing reference](../reference/billing.md).

## Tiếp theo

- [Billing & credits guide](../guides/billing-credits.md)
- [Billing reference](../reference/billing.md)
