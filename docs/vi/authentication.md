---
title: Authentication
description: User token, Bearer auth, admin key và kiểm tra session
---

# Authentication

User đăng nhập **Gommo** → nhận **`access_token`**. Gateway không lưu session server-side — client/browser giữ token và gửi kèm mỗi request.

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

## Gateway auth API (Mode B — khuyên dùng)

JSON endpoint cho app/script của bạn. Gateway tự điền `domain` từ `GOMMO_API_DOMAIN` nếu client bỏ qua.

### Login

```http
POST /gateway/auth/login
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","device_id":"…","device_name":"Chrome 1","device_info":"{…}"}
```

Form đăng nhập docs gửi **`device_id`**, **`device_name`**, **`device_info`** (format 79ai) để `/ai/me` trả đủ `balancesInfo.credits_ai`. Tùy chọn cho API client; khuyên dùng cho browser app.

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

Thành công trả `access_token` — dùng Bearer giống login.

## User token (Mode B & C)

Dùng **`access_token`** cho `/gateway/*` và proxy.

**Domain:** gateway đọc `GOMMO_API_DOMAIN` từ `.env` (mặc định `79ai.net`). Mode B **không bắt buộc** client gửi `domain`. Mode C (form proxy) cần `domain` trong body — cùng giá trị env server.

### Login qua proxy (Mode C)

Gateway: `POST /api/apps/go-mmo/auth/login` → `https://api.gommo.net/api/apps/go-mmo/auth/login`

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

Response có `access_token` — lưu làm `$TOKEN`.

### Login direct (Mode A)

```bash
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=YOUR_GOMMO_DOMAIN"
```

## Gateway REST auth (Mode B)

Header bắt buộc cho **jobs, upload, chat, audio** (không áp dụng list models public):

```
Authorization: Bearer {access_token}
```

`domain` **tùy chọn** — gateway dùng `GOMMO_API_DOMAIN` nếu bỏ qua.

```powershell
$headers = @{
  Authorization = "Bearer $env:TOKEN"
  'Content-Type' = 'application/json'
}
```

## V2 media jobs (Mode A & C)

- Header: `Authorization: Bearer {access_token}`
- Form: `domain` (proxy), `project_id`, `prompt`, …

## Platform / chat / audio (form)

- Form: `access_token={token}`
- Form: `domain` — khớp `GOMMO_API_DOMAIN` khi qua proxy

## Admin / merchant (chỉ server)

`/admin/*` **không** dùng Bearer user.

| Header | Env server |
|--------|------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [Admin reference](./reference/admin.md)

## Kiểm tra session

Lấy user và số dư credit. Dashboard docs (`/vi/app/`) và nạp tiền dùng endpoint này.

::: code-group

```bash [curl — /ai/me (khuyên dùng)]
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

Response có `access_token` — dùng `Authorization: Bearer …` cho `/gateway/*`.

### Kiểm tra session (`/ai/me`)

Gửi **`device_id`**, **`device_name`**, **`device_info`** trong form (giống 79ai) để `balancesInfo.credits_ai` có giá trị.
