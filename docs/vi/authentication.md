---
title: Authentication
description: User token, Bearer auth, admin key và kiểm tra session
---

# Authentication

User đăng nhập **Gommo** → nhận **`access_token`**. App hoặc browser giữ token và gửi kèm mỗi request.

## Gommo public API (khuyến nghị)

| Thao tác | URL |
|----------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

Form body: `email`, `password`, `domain` (login) hoặc `access_token`, `domain` (me). Header: `Authorization: Bearer <token>` khi dùng Bearer style.

→ [Gommo public API](./reference/gommo-public-api.md) · [Quickstart](./quickstart.md)

## Đăng nhập trên site docs

Site tài liệu (dev `:5173`) có luồng tài khoản sẵn:

| Trang | URL |
|-------|-----|
| Đăng nhập | `/vi/login/` |
| Đăng ký | `/vi/signup/` |
| Dashboard (sau login) | `/vi/app/` |

Sau đăng nhập/đăng ký thành công, trình duyệt chuyển tới **`/vi/app/`** (Tổng quan). Token lưu `localStorage` key `gw_access_token`. Profile và credits lấy từ `POST /ai/me`.

::: tip Dán token dev
Trên `/vi/login/`, tab **Bearer token** để dán sẵn `access_token` Gommo (test không cần email/password).
:::

::: info Cursor MCP (79ai)
Sau đăng nhập, copy token [/vi/app/token/](/vi/app/token/) vào **[79ai MCP](/vi/mcp/other-hosts.md)** — xem [10 tools](/vi/mcp/tools.md) và [prompt mẫu](/vi/mcp/use-cases.md).
:::

## User token

Dùng **`access_token`** cho mọi Gommo API call.

**Domain:** gửi `domain` trong form body — cùng domain đăng ký tài khoản (vd. `79ai.net`).

### Login direct

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

Response có `access_token` — lưu làm `$TOKEN`.

## V2 media jobs

- Header: `Authorization: Bearer {access_token}`
- Form body: `domain`, `project_id`, `prompt`, …

## Platform / chat / audio (form)

- Form field: `access_token={token}` hoặc Bearer header
- Form field: `domain` — domain đăng ký tài khoản

## Admin / merchant (chỉ server)

`/admin/*` **không** dùng Bearer user.

| Header | Env server |
|--------|------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [Admin reference](./reference/admin.md)

## Kiểm tra session

Lấy user và số dư credit. Dashboard docs (`/vi/app/`) và nạp tiền dùng endpoint này.

::: code-group

```bash [curl — /ai/me (khuyến nghị)]
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

Gửi **`device_id`**, **`device_name`**, và **`device_info`** trong form (giống 79ai) để `balancesInfo.credits_ai` có giá trị.

---

## Tùy chọn: Gateway auth API (Mode B — dev)

Khi self-host AI Gateway local, dùng JSON endpoints sau. Gateway tự điền `domain` từ `GOMMO_API_DOMAIN` khi client bỏ qua.

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

Cần merchant env trên server (`GOMMO_ACCESS_TOKEN`, `GOMMO_MANAGER_ID`).

```http
POST /gateway/auth/register
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","phone":"+84…","name":"Tên tùy chọn"}
```

### Login qua proxy (Mode C)

`POST http://localhost:3001/api/apps/go-mmo/auth/login` → upstream Gommo.

### Gateway REST auth

Header cho **jobs, upload, chat, audio** khi dùng `/gateway/*`:

```
Authorization: Bearer {access_token}
```

`domain` **tùy chọn** — gateway dùng `GOMMO_API_DOMAIN` khi bỏ qua.
