---
title: Admin (server-only)
description: ยอด merchant, ส่ง credits, ลงทะเบียนผู้ใช้
---

# Admin (server-only)

::: danger
Route `/admin/*` ใช้ **`x-admin-key`** ไม่ใช่ Bearer token ของผู้ใช้  
**`GOMMO_ACCESS_TOKEN`** (merchant) อยู่ใน `.env` บน server เท่านั้น
:::

| งาน | Gommo upstream | AI Gateway |
|-----|----------------|------------|
| ยอด merchant | `POST .../ai/me` + merchant token | `GET /admin/merchant/balance` |
| ส่ง credits | `POST .../users/sendBalances` | `POST /admin/credits/send` |
| ลงทะเบียนผู้ใช้ | `POST .../auth/register` | `POST /admin/users/register` |

## Server env

| Variable | วัตถุประสงค์ |
|----------|-------------|
| `GOMMO_ACCESS_TOKEN` | Merchant token |
| `GOMMO_API_DOMAIN` | Domain merchant (default `79ai.net`) |
| `GOMMO_MANAGER_ID` | `manager_id` สำหรับ register |
| `TOPUP_MERCHANT_BUFFER_CREDITS` | Buffer ก่อนส่ง (default 300000) |
| `ADMIN_API_KEY` | ป้องกัน `/admin/*` |

กฎ Gommo: หลัง `sendBalances` merchant ต้องเหลือ **> 500,000** credits

---

## ยอด merchant

::: code-group

```bash [curl]
curl.exe "http://localhost:3001/admin/merchant/balance" ^
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

```powershell [PowerShell]
$h = @{ 'x-admin-key' = $env:ADMIN_API_KEY }
Invoke-RestMethod "http://localhost:3001/admin/merchant/balance" -Headers $h
```

:::

---

## ส่ง credits

```json
{
  "username": "gommo_username",
  "value": 100,
  "message": "Topup test",
  "type": "credits_ai"
}
```

::: code-group

```bash [curl]
curl.exe -X POST "http://localhost:3001/admin/credits/send" ^
  -H "x-admin-key: YOUR_ADMIN_KEY" -H "Content-Type: application/json" ^
  -d "{\"username\":\"user1\",\"value\":100,\"message\":\"Test topup\"}"
```

```powershell [PowerShell]
$body = @{ username = 'user1'; value = 100; message = 'Test topup' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/admin/credits/send" `
  -Headers @{ 'x-admin-key' = $env:ADMIN_API_KEY; 'Content-Type' = 'application/json' } `
  -Body $body
```

:::

สิทธิ์ `sendBalances` มอบโดย Gommo ให้บัญชี **merchant** ของ domain

---

## ลงทะเบียนผู้ใช้

::: code-group

```bash [curl]
curl.exe -X POST "http://localhost:3001/admin/users/register" ^
  -H "x-admin-key: YOUR_ADMIN_KEY" -H "Content-Type: application/json" ^
  -d "{\"email\":\"u@example.com\",\"password\":\"secret12\",\"phone\":\"0900000000\"}"
```

```powershell [PowerShell]
$body = @{
  email = 'u@example.com'
  password = 'secret12'
  phone = '0900000000'
} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/admin/users/register" `
  -Headers @{ 'x-admin-key' = $env:ADMIN_API_KEY; 'Content-Type' = 'application/json' } `
  -Body $body
```

:::

Script: `scripts/test-admin.ps1`
