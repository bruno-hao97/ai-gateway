---
title: การยืนยันตัวตน
description: User token, Bearer auth, admin key และตรวจสอบ session
---

# การยืนยันตัวตน

ผู้ใช้ login **Gommo** แล้วได้ **`access_token`** แอปหรือเบราว์เซอร์เก็บ token และส่งในทุกคำขอ

## Gommo public API (แนะนำ)

| การดำเนินการ | URL |
|-------------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

Form body: `email`, `password`, `domain` (login) หรือ `access_token`, `domain` (me) Header: `Authorization: Bearer <token>` เมื่อใช้ Bearer style

→ [Gommo public API](./reference/gommo-public-api.md) · [เริ่มต้นใช้งาน](./quickstart.md)

## ลงชื่อเข้าใช้บน site docs

site เอกสาร (dev `:5173`) มี flow บัญชีในตัว:

| หน้า | URL |
|------|-----|
| ลงชื่อเข้าใช้ | `/th/login/` |
| สมัคร | `/th/signup/` |
| Dashboard (หลัง login) | `/th/app/` |

หลัง login/สมัครสำเร็จ เบราว์เซอร์ไป **`/th/app/`** (ภาพรวม) token เก็บใน `localStorage` key `gw_access_token` profile และ credits จาก `POST /ai/me`

::: tip วาง token dev
บน `/th/login/` แท็บ **Bearer token** สำหรับวาง `access_token` Gommo (ทดสอบไม่ต้อง email/password)
:::

::: info Cursor MCP (79ai)
หลัง login คัดลอก token จาก [/th/app/token/](/th/app/token/) ไป **[79ai MCP](/th/mcp/other-hosts.md)** — ดู [10 tools](/th/mcp/tools.md) และ [prompt ตัวอย่าง](/th/mcp/use-cases.md)
:::

## User token

ใช้ **`access_token`** สำหรับทุก Gommo API call

**Domain:** ส่ง `domain` ใน form body — โดเมนลงทะเบียนบัญชี (เช่น `79ai.net`)

### Login โดยตรง

::: code-group

```bash [curl]
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=79ai.net"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$body = "email=you@example.com&password=YOUR_PASSWORD&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

:::

response มี `access_token` — เก็บเป็น `$TOKEN`

## V2 media jobs

- Header: `Authorization: Bearer {access_token}`
- Form body: `domain`, `project_id`, `prompt`, …

## Platform / chat / audio (form)

- Form field: `access_token={token}` หรือ Bearer header
- Form field: `domain` — โดเมนลงทะเบียนบัญชี

## Admin / merchant (เซิร์ฟเวอร์เท่านั้น)

`/admin/*` **ไม่** ใช้ Bearer user

| Header | Env เซิร์ฟเวอร์ |
|--------|----------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [อ้างอิง admin](./reference/admin.md)

## ตรวจสอบ session

โหลดผู้ใช้และยอดเครดิต dashboard docs (`/th/app/`) และเติมเงินใช้ endpoint นี้

::: code-group

```bash [curl — /ai/me (แนะนำ)]
curl.exe -X POST "https://api.gommo.net/ai/me" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "access_token=%TOKEN%&domain=79ai.net"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$meBody = "access_token=$env:TOKEN&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/ai/me" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $meBody
```

:::

ส่ง **`device_id`**, **`device_name`**, และ **`device_info`** ใน form (เหมือน 79ai) เพื่อให้ `balancesInfo.credits_ai` มีค่า

---

## ทางเลือก: Gateway auth API (Mode B — dev)

เมื่อ self-host AI Gateway local ใช้ JSON endpoints ต่อไปนี้ gateway เติม `domain` จาก `GOMMO_API_DOMAIN` เมื่อ client ไม่ส่ง

### Login

```http
POST /gateway/auth/login
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD"}
```

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

ต้องมี merchant env บนเซิร์ฟเวอร์ (`GOMMO_ACCESS_TOKEN`, `GOMMO_MANAGER_ID`)

```http
POST /gateway/auth/register
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","phone":"+66…","name":"ชื่อทางเลือก"}
```

### Login ผ่าน proxy (Mode C)

`POST http://localhost:3001/api/apps/go-mmo/auth/login` → upstream Gommo

### Gateway REST auth

Header สำหรับ **jobs, upload, chat, audio** เมื่อใช้ `/gateway/*`:

```
Authorization: Bearer {access_token}
```

`domain` **ทางเลือก** — gateway ใช้ `GOMMO_API_DOMAIN` เมื่อไม่ส่ง
