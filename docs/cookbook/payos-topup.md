---
title: 'Recipe: PayOS credit topup (legacy)'
description: Merchant-controlled PayOS + sendBalances — use Gommo VietQR by default
---

# PayOS credit topup (legacy)

::: warning
**Legacy path.** New integrations should use [Gommo VietQR topup](./gommo-topup.md) (`POST /billing/payment/create`). This recipe requires PayOS keys and merchant `GOMMO_ACCESS_TOKEN` on the server.
:::

Billing lives under **`/billing/*`** — separate from `/gateway` generation APIs.

Requires server env: PayOS keys + `GOMMO_ACCESS_TOKEN`. Check readiness first.

## 1. Server status

```powershell
Invoke-RestMethod "http://localhost:3001/billing/status"
```

Expect `payosConfigured: true` and `merchantReady: true` before creating orders.

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

## 4. Create topup order

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

Open `url` in a browser (PayOS checkout / QR). User completes payment on PayOS.

## 5. Poll order (optional)

Webhook `PAID` → gateway sends Gommo credits automatically. Poll if webhook is not reachable in dev:

```powershell
Invoke-RestMethod "http://localhost:3001/billing/topup/orders/$orderCode"
```

Statuses: `pending` → `paid` → `credited` (or `failed`).

## Webhook (production)

Register on [my.payos.vn](https://my.payos.vn):

```
POST https://api.yourdomain.com/billing/webhook/payos
```

Set `PAYOS_WEBHOOK_URL` in server env. See [Billing reference](../reference/billing.md).

## Next

- [Billing & credits guide](../guides/billing-credits.md)
- [Billing reference](../reference/billing.md)
