---
title: Authentication
description: User tokens, Bearer auth, admin keys, and session checks
---

# Authentication

## User token (Mode B & C)

End users log in to Gommo and receive an **`access_token`**. Use it for `/gateway/*` and proxy routes.

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
