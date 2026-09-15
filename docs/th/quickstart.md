---
title: เริ่มต้นใช้งาน
description: เข้าสู่ระบบ ดูรายการโมเดล สร้างงานรูปภาพแรก — Gommo public API
---

# เริ่มต้นใช้งาน

จาก **ศูนย์ถึงงานรูปภาพแรก** บน Gommo public API (`v2.api.gommo.net` + `api.gommo.net`) แผนที่ host ทั้งหมด: [Gommo public API](./reference/gommo-public-api.md)

## เลือกเส้นทางของคุณ

| เส้นทาง | เริ่มที่นี่ |
|--------|-------------|
| **HTTP client** | ทำตามด้านล่าง — curl หรือ PowerShell |
| **เบราว์เซอร์** | [API Playground](/th/app/playground/) — แท็บ Request แสดง URL สาธารณะ |
| **AI agents** | [MCP](/th/mcp/) — 10 เครื่องมือ `gommo_*` ใช้ token จาก [/th/app/token/](/th/app/token/) |
| **Self-host gateway** | [โหมดการเชื่อมต่อ](./routing/integration-modes.md) — Mode B บน `:3001` |

## สิ่งที่ต้องมี

| รายการ | ค่า |
|--------|-----|
| บัญชี Gommo | อีเมล + รหัสผ่าน + **โดเมนที่ลงทะเบียน** (เช่น `79ai.net`) |
| HTTPS client | curl, PowerShell หรือ [Playground](/th/app/playground/) |

::: tip Playground
ลอง flow เดียวกันในเบราว์เซอร์: [Playground](/th/app/playground/) — แท็บ **Endpoints** แสดง URL สาธารณะครบทุก operation
:::

## 1. เข้าสู่ระบบ (`api.gommo.net`)

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

## 2. ดูรายการโมเดล (`v2.api.gommo.net`)

ห้ามเดา `ratio` — อ่านจาก catalog เท่านั้น

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

::: warning ห้ามเดา ratio
ดู [โมเดล](./models/) และ [หลักการ](./principles.md)
:::

## 3. สร้างงานรูปภาพ (form body)

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

Poll ด้วย `POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image` ทุก **3.5 วินาที** สูงสุด **80** ครั้ง

## ทางเลือก: AI Gateway dev (Mode B)

รัน `npm run dev` → `http://localhost:3001` สำหรับ JSON REST (`POST /gateway/jobs/image` พร้อม `modelSlug` + `wait: true`) ดู [โหมดการเชื่อมต่อ](./routing/integration-modes.md)

```powershell
Invoke-RestMethod http://localhost:3001/health
```

## สคริปต์

- `scripts/test-image-job.ps1`
- `scripts/test-gateway.ps1`

## ถัดไป

- [Gommo public API](./reference/gommo-public-api.md)
- [หลักการ](./principles.md)
- [การยืนยันตัวตน](./authentication.md)
- [อ้างอิงมีเดีย](./reference/media.md)
