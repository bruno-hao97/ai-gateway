# Admin (server-only)

::: danger
Routes `/admin/*` dùng **`x-admin-key`**, không dùng Bearer user token.
**`GOMMO_ACCESS_TOKEN`** (merchant) chỉ nằm trong `.env` server.
:::

| Operation | Gommo upstream | AI Gateway |
|-----------|----------------|------------|
| Merchant balance | `POST .../ai/me` + merchant token | `GET /admin/merchant/balance` |
| Send credits | `POST .../users/sendBalances` | `POST /admin/credits/send` |
| Register user | `POST .../auth/register` | `POST /admin/users/register` |

## Env server

| Variable | Mục đích |
|----------|----------|
| `GOMMO_ACCESS_TOKEN` | Merchant token |
| `GOMMO_API_DOMAIN` | Domain merchant (default `79ai.net`) |
| `GOMMO_MANAGER_ID` | `manager_id` khi register |
| `TOPUP_MERCHANT_BUFFER_CREDITS` | Buffer trước send (default 300000) |
| `ADMIN_API_KEY` | Bảo vệ `/admin/*` |

Rule Gommo: sau `sendBalances`, merchant phải còn **> 500.000** credits.

---

## Merchant balance

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

## Send credits

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

Quyền `sendBalances` do Gommo cấp cho **merchant account** domain.

---

## Register user

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
