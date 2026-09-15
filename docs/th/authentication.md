---
title: การยืนยันตัวตน
description: User token, Bearer auth, admin key และตรวจสอบ session
---

# การยืนยันตัวตน

ผู้ใช้เข้าสู่ระบบ **Gommo** แล้วได้ **`access_token`** แอปหรือเบราว์เซอร์เก็บ token และส่งในทุกคำขอ

## Gommo public API (แนะนำ)

| การดำเนินการ | URL |
|-------------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

Form body: `email`, `password`, `domain` (login) หรือ `access_token`, `domain` (me) Header: `Authorization: Bearer <token>` เมื่อใช้รูปแบบ Bearer

→ [Gommo public API](./reference/gommo-public-api.md) · [เริ่มต้นใช้งาน](./quickstart.md)

## เข้าสู่ระบบบน site docs

Site เอกสาร (dev `:5173`) มี flow บัญชีในตัว:

| หน้า | URL |
|------|-----|
| เข้าสู่ระบบ | `/th/login/` |
| สมัคร | `/th/signup/` |
| แดชบอร์ด (หลัง login) | `/th/app/` |

หลังเข้าสู่ระบบหรือสมัครสำเร็จ เบราว์เซอร์ไป **`/th/app/`** (ภาพรวม) Token เก็บใน `localStorage` เป็น `gw_access_token` โปรไฟล์และเครดิตโหลดจาก `POST /ai/me`

::: tip วาง token สำหรับ dev
บน `/th/login/` เปิดแท็บ **Bearer token** เพื่อวาง `access_token` Gommo ที่มีอยู่ (ทดสอบโดยไม่ต้อง email/password)
:::

::: info Cursor MCP (79ai)
หลังเข้าสู่ระบบ คัดลอก token จาก [/th/app/token/](/th/app/token/) ไปยัง **[79ai MCP](./mcp/other-hosts.md)** ดู [10 tools](./mcp/tools.md) และ [prompt ตัวอย่าง](./mcp/use-cases.md)
:::

## Gateway auth API (Mode B — dev ทางเลือก)

ใช้ endpoint JSON เหล่านี้จากแอปหรือสคริปต์ของคุณ gateway ใส่ `domain` จาก `GOMMO_API_DOMAIN` เมื่อไม่ส่งมา

### Login

```http
POST /gateway/auth/login
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","device_id":"…","device_name":"Chrome 1","device_info":"{…}"}
```

ฟอร์มเข้าสู่ระบบ docs ส่ง **`device_id`**, **`device_name`**, และ **`device_info`** (รูปแบบ 79ai marketplace) เพื่อให้ `/ai/me` คืนยอดเครดิตครบ ไม่บังคับสำหรับ API client แนะนำสำหรับแอปเบราว์เซอร์

::: code-group

```bash [curl]
curl.exe -X POST "http://localhost:3001/gateway/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"you@example.com\",\"password\":\"YOUR_PASSWORD\"}"
```

```powershell [PowerShell]
$body = @{ email = 'you@example.com'; password = 'YOUR_PASSWORD' } | ConvertTo-Json
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/auth/login" `
  -ContentType "application/json" `
  -Body $body
```

:::

### Register

ต้องมี env merchant บนเซิร์ฟเวอร์ (`GOMMO_ACCESS_TOKEN`, `GOMMO_MANAGER_ID`)

```http
POST /gateway/auth/register
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","phone":"+84…","name":"Optional name"}
```

คืน `access_token` เมื่อสำเร็จ — ใช้ Bearer เหมือน login

## User token (Mode B & C)

ใช้ **`access_token`** สำหรับ `/gateway/*` และ proxy routes

**Domain:** gateway อ่าน `GOMMO_API_DOMAIN` จาก `.env` (ค่าเริ่มต้น `79ai.net`) Mode B **ไม่บังคับ** client ส่ง `domain` Mode C (proxy form) ต้องมี `domain` ใน body — ใช้ค่าเดียวกับ env เซิร์ฟเวอร์

### Login ผ่าน proxy (Mode C)

Gateway mount: `POST /api/apps/go-mmo/auth/login` → `https://api.gommo.net/api/apps/go-mmo/auth/login`

::: code-group

```bash [curl]
curl.exe -X POST "http://localhost:3001/api/apps/go-mmo/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=%GOMMO_API_DOMAIN%"
```

```powershell [PowerShell]
$domain = $env:GOMMO_API_DOMAIN
if (-not $domain) { $domain = '79ai.net' }
$body = "email=you@example.com&password=YOUR_PASSWORD&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

:::

Response มี `access_token` — เก็บเป็น `$TOKEN`

### Login ตรง (Mode A)

```bash
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=YOUR_GOMMO_DOMAIN"
```

## Gateway REST auth (Mode B)

Header จำเป็นสำหรับ **jobs, upload, chat, audio** (ไม่ใช่ catalog โมเดลสาธารณะ):

```
Authorization: Bearer {access_token}
```

`domain` **ไม่บังคับ** — gateway ใช้ `GOMMO_API_DOMAIN` เมื่อไม่ส่ง

```powershell
$headers = @{
  Authorization = "Bearer $env:TOKEN"
  'Content-Type' = 'application/json'
}
```

## V2 media jobs (Mode A & C)

- Header: `Authorization: Bearer {access_token}`
- Form body: `domain` (proxy), `project_id`, `prompt`, …

## Platform / chat / audio (form)

- Form field: `access_token={token}`
- Form field: `domain` — ต้องตรง `GOMMO_API_DOMAIN` เมื่อใช้ proxy

## Admin / merchant (เซิร์ฟเวอร์เท่านั้น)

route `/admin/*` **ไม่ใช้** user Bearer token

| Header | Server env |
|--------|------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [อ้างอิง Admin](./reference/admin.md)

## ตรวจสอบ session

โหลดผู้ใช้ที่เข้าสู่ระบบและยอดเครดิต แดชบอร์ด docs (`/th/app/`) และเติมเครดิตใช้ endpoint นี้

::: code-group

```bash [curl — /ai/me (แนะนำ)]
curl.exe -X POST "http://localhost:3001/ai/me" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "access_token=%TOKEN%&domain=79ai.net"
```

```bash [curl — proxy path]
curl.exe -X POST "http://localhost:3001/api/apps/go-mmo/ai/me" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "access_token=%TOKEN%&domain=%GOMMO_API_DOMAIN%"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$meBody = "access_token=$env:TOKEN&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/ai/me" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $meBody
```

:::

Response มี `access_token` — ใช้เป็น `Authorization: Bearer …` สำหรับ `/gateway/*`

### ตรวจสอบ session (`/ai/me`)

ใส่ **`device_id`**, **`device_name`**, และ **`device_info`** ใน form body (เหมือน 79ai) เพื่อให้ `balancesInfo.credits_ai` มีค่า
