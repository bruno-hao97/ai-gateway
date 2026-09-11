---
title: Quickstart
description: Login, list models, create one image job — Gommo public API
---

# Quickstart

Get from **zero to one image job** on the public Gommo API (`v2.api.gommo.net` + `api.gommo.net`). Full host map: [Gommo public API](./reference/gommo-public-api.md).

## Choose your path

| Path | Start here |
|------|------------|
| **HTTP client** | Continue below — curl or PowerShell |
| **Browser** | [API Playground](/app/playground/) — Request tab shows public URLs |
| **AI agents** | [MCP](/mcp/) — 10 `gommo_*` tools, token from [/app/token/](/app/token/) |
| **Self-host gateway** | [Integration modes](./routing/integration-modes.md) — Mode B on `:3001` |

## Prerequisites

| Item | Value |
|------|--------|
| Gommo account | email + password + **registration domain** (e.g. `79ai.net`) |
| HTTPS client | curl, PowerShell, or [Playground](/app/playground/) |

::: tip Playground
Try the same flow in browser: [Playground](/app/playground/) — **Endpoints** tab shows full public URLs per operation.
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

## 2. List models (`v2.api.gommo.net`)

Never guess `ratio` — read from catalog only.

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

::: warning Never guess ratio
See [Models](./models/) and [Principles](./principles.md).
:::

## 3. Create image job (form body)

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

Poll with `POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image` every **3.5s**, max **80** attempts.

## Optional: AI Gateway dev (Mode B)

Run `npm run dev` → `http://localhost:3001` for JSON REST (`POST /gateway/jobs/image` with `modelSlug` + `wait: true`). See [Integration modes](./routing/integration-modes.md).

```powershell
Invoke-RestMethod http://localhost:3001/health
```

## Scripts

- `scripts/test-image-job.ps1`
- `scripts/test-gateway.ps1`

## Next

- [Gommo public API](./reference/gommo-public-api.md)
- [Principles](./principles.md)
- [Authentication](./authentication.md)
- [Media reference](./reference/media.md)
