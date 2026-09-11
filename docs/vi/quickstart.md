---
title: Quickstart
description: Login, list models, tạo một image job — Gommo public API
---

# Quickstart

Từ **zero đến một image job** trên Gommo public API (`v2.api.gommo.net` + `api.gommo.net`). Bản đồ host: [Gommo public API](./reference/gommo-public-api.md).

## Chọn lộ trình

| Lộ trình | Bắt đầu |
|----------|---------|
| **HTTP client** | Tiếp tục bên dưới — curl hoặc PowerShell |
| **Browser** | [API Playground](/vi/app/playground/) — tab Request hiện URL public |
| **AI agents** | [MCP](/vi/mcp/) — 10 tool `gommo_*`, token từ [/vi/app/token/](/vi/app/token/) |
| **Self-host gateway** | [Integration modes](./routing/integration-modes.md) — Mode B trên `:3001` |

## Điều kiện

| Mục | Giá trị |
|-----|---------|
| Tài khoản Gommo | email + password + **domain đăng ký** (vd. `79ai.net`) |
| HTTP client | curl, PowerShell, hoặc [Playground](/vi/app/playground/) |

::: tip Playground
Thử cùng flow trên browser: [Playground](/vi/app/playground/) — tab **Endpoints** hiển thị URL public đầy đủ.
:::

## 1. Login (`api.gommo.net`)

::: code-group

```bash [curl]
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "email=YOU@example.com&password=YOUR_PASSWORD&domain=79ai.net"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$loginBody = "email=YOU@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $loginBody
$env:TOKEN = $login.access_token
```

:::

## 2. Lấy models (`v2.api.gommo.net`)

Không đoán `ratio` — chỉ dùng giá trị từ catalog.

::: code-group

```bash [curl]
curl.exe "https://v2.api.gommo.net/ai/models?type=image" ^
  -H "Authorization: Bearer %TOKEN%"
```

```powershell [PowerShell]
$h = @{ Authorization = "Bearer $env:TOKEN" }
$models = Invoke-RestMethod `
  -Uri "https://v2.api.gommo.net/ai/models?type=image" `
  -Headers $h
$m = $models.data[0]
$slug = $m.model
if (-not $slug) { $slug = $m.slug }
$ratio = $m.ratios[0]
if ($ratio -is [pscustomobject]) { $ratio = $ratio.value }
Write-Host "model=$slug ratio=$ratio"
```

:::

::: warning Không đoán ratio
Xem [Models](./models/) và [Principles](./principles.md).
:::

## 3. Tạo image job (form body)

::: code-group

```bash [curl]
curl.exe -X POST "https://v2.api.gommo.net/ai/jobs/image/MODEL_SLUG" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&prompt=A cute cat, studio photo&ratio=RATIO_FROM_MODELS"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$body = "domain=$domain&prompt=A cute cat, studio photo&ratio=$ratio"
$job = Invoke-RestMethod -Method POST `
  -Uri "https://v2.api.gommo.net/ai/jobs/image/$slug" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

:::

Poll: `POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image` mỗi **3.5s**, tối đa **80** lần.

## Tùy chọn: AI Gateway dev (Mode B)

`npm run dev` → `http://localhost:3001` cho REST JSON (`POST /gateway/jobs/image`). Xem [Integration modes](./routing/integration-modes.md).

## Tiếp theo

- [Gommo public API](./reference/gommo-public-api.md)
- [Principles](./principles.md)
- [Authentication](./authentication.md)
- [Media reference](./reference/media.md)
