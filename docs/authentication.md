---
title: Authentication
description: User tokens, Bearer auth, admin keys, and session checks
---

# Authentication

End users log in to **Gommo** and receive an **`access_token`**. Your app or browser keeps the token and sends it on each request.

## Public Gommo API (recommended)

| Operation | URL |
|-----------|-----|
| Login | `POST https://api.gommo.net/api/apps/go-mmo/auth/login` |
| Me / credits | `POST https://api.gommo.net/ai/me` |

Form body: `email`, `password`, `domain` (login) or `access_token`, `domain` (me). Header: `Authorization: Bearer <token>` when using Bearer style.

→ [Gommo public API](./reference/gommo-public-api.md) · [Quickstart](./quickstart.md)

## Sign in on the developer site

The docs site (`:5173` in dev) includes a built-in account flow:

| Page | URL |
|------|-----|
| Sign in | `/login/` |
| Sign up | `/signup/` |
| Dashboard (after login) | `/app/` |

After a successful sign-in or sign-up, the browser redirects to **`/app/`** (Overview). The access token is stored in `localStorage` as `gw_access_token`. Profile and credits load from `POST https://api.gommo.net/ai/me`.

::: tip Dev token paste
On `/login/`, switch to the **Bearer token** tab to paste an existing Gommo `access_token` (useful for testing without email/password).
:::

::: info Cursor MCP (79ai)
After sign-in, copy your token from [/app/token/](/app/token/) into **[79ai MCP](./mcp/other-hosts.md)**. See [all 10 tools](./mcp/tools.md) and [example prompts](./mcp/use-cases.md).
:::

## Login direct (Mode A)

::: code-group

```bash [curl]
curl.exe -X POST "https://api.gommo.net/api/apps/go-mmo/auth/login" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "email=you@example.com&password=YOUR_PASSWORD&domain=79ai.net"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$body = "email=you@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "https://api.gommo.net/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
$env:TOKEN = $login.access_token
```

:::

Response contains `access_token` — store as `$TOKEN`.

## User token usage

Use the **`access_token`** on all Gommo API calls.

**Domain:** include `domain` in every form body (registration domain, e.g. `79ai.net`). Match the domain the user registered with.

### Bearer header (V2 jobs, optional on platform)

```
Authorization: Bearer {access_token}
```

### Form field (platform / chat / audio)

```
access_token={token}&domain={domain}
```

## V2 media jobs (Mode A)

- Header: `Authorization: Bearer {access_token}`
- Form body: `domain`, `project_id`, `prompt`, `ratio`, …

```powershell
$h = @{
  Authorization = "Bearer $env:TOKEN"
  'Content-Type' = 'application/x-www-form-urlencoded'
}
```

## Platform / chat / audio (form)

- Form field: `access_token={token}`
- Form field: `domain` — registration domain (e.g. `79ai.net`)

## Check session (`/ai/me`)

Load the signed-in user and credit balance. The docs dashboard (`/app/`) and billing top-up use this endpoint.

::: code-group

```bash [curl — Direct (recommended)]
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

```bash [curl — Bearer header]
curl.exe -X POST "https://api.gommo.net/ai/me" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net"
```

:::

Response includes `access_token` — use as `Authorization: Bearer …` for subsequent calls.

Include **`device_id`**, **`device_name`**, and **`device_info`** in the form body (same as 79ai) so `balancesInfo.credits_ai` is populated.

## Admin / merchant (server-only)

`/admin/*` routes do **not** use the user Bearer token.

| Header | Server env |
|--------|------------|
| `x-admin-key: {ADMIN_API_KEY}` | `ADMIN_API_KEY` |

→ [Admin reference](./reference/admin.md)

---

## Optional: self-host gateway

Run `npm run dev` → `http://localhost:3001` for Mode B JSON REST or Mode C path proxy. Use only when you need billing, BYOK, `wait: true`, or local CORS — not required for direct Gommo integration.

### Gateway auth API (Mode B)

JSON endpoints. The gateway fills `domain` from `GOMMO_API_DOMAIN` when omitted.

```http
POST /gateway/auth/login
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","device_id":"…","device_name":"Chrome 1","device_info":"{…}"}
```

The docs sign-in form sends **`device_id`**, **`device_name`**, and **`device_info`** (79ai marketplace shape) so `/ai/me` returns full credit balances.

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

### Register (gateway)

Requires merchant env on the server (`GOMMO_ACCESS_TOKEN`, `GOMMO_MANAGER_ID`).

```http
POST /gateway/auth/register
Content-Type: application/json

{"email":"you@example.com","password":"YOUR_PASSWORD","phone":"+84…","name":"Optional name"}
```

### Login via proxy (Mode C)

Gateway mount: `POST /api/apps/go-mmo/auth/login` → `https://api.gommo.net/api/apps/go-mmo/auth/login`

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$body = "email=you@example.com&password=YOUR_PASSWORD&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

### Gateway REST auth (Mode B)

Required header for **jobs, upload, chat, audio** on `/gateway/*`:

```
Authorization: Bearer {access_token}
```

`domain` is **optional** — the gateway uses `GOMMO_API_DOMAIN` when omitted.

→ [Integration modes](./routing/integration-modes.md)
