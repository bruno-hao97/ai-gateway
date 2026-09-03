---
title: Authentication
description: User tokens, Bearer auth, admin keys, and session checks
---

# Authentication

End users log in to **Gommo** and receive an **`access_token`**. The gateway stores nothing server-side — your app or browser keeps the token and sends it on each request.

## Sign in on the developer site

The docs site (`:5173` in dev) includes a built-in account flow:

| Page | URL |
|------|-----|
| Sign in | `/login/` |
| Sign up | `/signup/` |
| Dashboard (after login) | `/app/` |

After a successful sign-in or sign-up, the browser redirects to **`/app/`** (Overview). The access token is stored in `localStorage` as `gw_access_token`. Profile and credits load from `POST /ai/me`.

::: tip Dev token paste
On `/login/`, switch to the **Bearer token** tab to paste an existing Gommo `access_token` (useful for testing without email/password).
:::

::: info Cursor MCP (79ai)
After sign-in, copy your token from [/app/token/](/app/token/) into **[79ai MCP](./mcp/other-hosts.md)**. See [all 10 tools](./mcp/tools.md) and [example prompts](./mcp/use-cases.md).
:::

## Gateway auth API (Mode B — recommended)

Use these JSON endpoints from your own app or scripts. The gateway fills `domain` from `GOMMO_API_DOMAIN` when omitted.

### Login

```http
POST /gateway/auth/login
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","device_id":"…","device_name":"Chrome 1","device_info":"{…}"}
```

The docs sign-in form sends **`device_id`**, **`device_name`**, and **`device_info`** (79ai marketplace shape) so `/ai/me` returns full credit balances. Optional for API clients; recommended for browser apps.

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

Requires merchant env on the server (`GOMMO_ACCESS_TOKEN`, `GOMMO_MANAGER_ID`).

```http
POST /gateway/auth/register
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","phone":"+84…","name":"Optional name"}
```

Returns `access_token` on success — same Bearer usage as login.

## User token (Mode B & C)

Use the **`access_token`** for `/gateway/*` and proxy routes.

**Domain:** the gateway reads `GOMMO_API_DOMAIN` from `.env` (default `79ai.net`). Mode B does **not** require the client to send `domain`. Mode C (proxy form) needs `domain` in the body — use the same value as server env.

### Login via proxy (Mode C)

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

Response contains `access_token` — store as `$TOKEN`.

### Login direct (Mode A)

```bash
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=YOUR_GOMMO_DOMAIN"
```

## Gateway REST auth (Mode B)

Required header for **jobs, upload, chat, audio** (not for public model catalog):

```
Authorization: Bearer {access_token}
```

`domain` is **optional** — the gateway uses `GOMMO_API_DOMAIN` when omitted.

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
- Form field: `domain` — must match `GOMMO_API_DOMAIN` when using proxy

## Admin / merchant (server-only)

`/admin/*` routes do **not** use the user Bearer token.

| Header | Server env |
|--------|------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [Admin reference](./reference/admin.md)

## Check session

Load the signed-in user and credit balance. The docs dashboard (`/app/`) and billing top-up use this endpoint.

::: code-group

```bash [curl — /ai/me (recommended)]
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

Response includes `access_token` — use as `Authorization: Bearer …` for `/gateway/*`.

### Check session (`/ai/me`)

Include **`device_id`**, **`device_name`**, and **`device_info`** in the form body (same as 79ai) so `balancesInfo.credits_ai` is populated.
