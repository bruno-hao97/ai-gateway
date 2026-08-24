# Authentication

## User token (Mode B & C)

End-user đăng nhập Gommo → nhận **`access_token`**. Dùng cho `/gateway/*` và proxy.

**Domain:** gateway đọc `GOMMO_API_DOMAIN` từ `.env` (default `79ai.net`). Mode B **không bắt buộc** gửi `domain` từ client. Mode C (proxy form) cần field `domain` trong body — dùng cùng giá trị env.

### Login qua proxy (Mode C)

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

Response chứa `access_token` — lưu làm `$TOKEN`.

### Login direct (Mode A)

```bash
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=YOUR_GOMMO_DOMAIN"
```

## Gateway REST auth (Mode B)

Header bắt buộc:

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
- Form body: `domain` (proxy), `project_id`, `prompt`, …

## Platform / chat / audio (form)

- Form field: `access_token={token}`
- Form field: `domain` — khớp `GOMMO_API_DOMAIN` khi qua proxy

## Admin / merchant (server-only)

Route `/admin/*` **không** dùng Bearer user.

| Header | Env server |
|--------|------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [Admin reference](./reference/admin.md)

## Kiểm tra session

::: code-group

```bash [curl — proxy]
curl.exe -X POST "http://localhost:3001/api/apps/go-mmo/ai/me" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "access_token=$TOKEN&domain=%GOMMO_API_DOMAIN%"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$meBody = "access_token=$env:TOKEN&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/api/apps/go-mmo/ai/me" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $meBody
```

:::
