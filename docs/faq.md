---
title: FAQ
description: Frequently asked questions about AI Gateway
---

# FAQ

Common questions about AI Gateway and Gommo upstream.

## Getting started

<details>
<summary>What is AI Gateway vs calling Gommo directly?</summary>

**Direct (Mode A):** your backend calls `v2.api.gommo.net` and `api.gommo.net`.  
**Gateway:** one base URL — REST `/gateway/*` (Mode B) or path proxy (Mode C). Hides upstream URLs, centralizes env, optional `wait: true` polling, Gommo VietQR billing.

</details>

<details>
<summary>What do I need to run locally?</summary>

- Node.js 18+
- `cp .env.example .env` and set `GOMMO_API_DOMAIN`
- `npm install` && `npm run dev` → `http://localhost:3001`
- Docs: `npm run docs:dev` → `http://localhost:5173`
- Optional: Gommo user credentials for [Quickstart](./quickstart.md)

</details>

<details>
<summary>Where is the API playground?</summary>

[/app/playground/](/app/playground/) — sign in on the docs site. The playground embeds the portal UI and passes your token automatically.

Dev: docs at `:5173`, gateway API at `:3001`.

</details>

## Authentication

<details>
<summary>How do I get a user token?</summary>

`POST /api/apps/go-mmo/auth/login` with `email`, `password`, `domain` (registration domain). Response: `access_token`. See [Authentication](./authentication.md).

</details>

<details>
<summary>Do I send domain on every /gateway call?</summary>

**Mode B:** optional — gateway uses `GOMMO_API_DOMAIN` from server env.  
**Mode C / Direct:** include `domain` in form body matching the user’s registration domain.

</details>

<details>
<summary>What is the merchant token?</summary>

`GOMMO_ACCESS_TOKEN` in server `.env` — for `/admin/*` and legacy PayOS fulfillment only. Not required for default Gommo VietQR top-up. Never in browser apps.

</details>

## Models & jobs

<details>
<summary>Why did my job fail with invalid ratio/mode?</summary>

You guessed parameters. Always list models first and use values from the catalog. See [Models](./models/).

</details>

<details>
<summary>How long does polling take?</summary>

Gateway uses **3.5s** interval, **80** attempts (~4.7 min max) when `wait: true`. Video jobs often need 1–5 minutes.

</details>

<details>
<summary>Does Gommo send webhooks when a job completes?</summary>

No — client or gateway must poll job status.

</details>

## API & modes

<details>
<summary>Mode B vs Mode C — which should I use?</summary>

- **Mode B** — new integrations, JSON, structured errors, optional `wait`.
- **Mode C** — existing FE already using Gommo paths; minimal code change.

See [Integration modes](./routing/integration-modes.md).

</details>

<details>
<summary>What error format does REST use?</summary>

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

</details>

## Billing

<details>
<summary>How do I top up credits?</summary>

**Default:** Gommo VietQR — `POST /billing/payment/create` (user Bearer), then poll `POST /billing/payment/sync` until `paid: true`. Portal: [/app/credits/](/app/credits/). Recipe: [Gommo topup](./cookbook/gommo-topup.md).

**Legacy (optional):** PayOS via `POST /billing/topup/create` when `PAYOS_*` and merchant env are configured. See [PayOS topup (legacy)](./cookbook/payos-topup.md).

</details>

<details>
<summary>Why does billing fail or return an error?</summary>

Check `GET /billing/status` — expect `billingMode: "gommo"` and `gommoPayment: true` for the default flow.

Common issues:

- Bearer token does not match `username` in the request body
- Invalid `packageId`
- Legacy PayOS: `payosConfigured` or `merchantReady` is false

</details>

<details>
<summary>Why does /billing/topup/create return 503?</summary>

That path is **legacy PayOS only**. PayOS or merchant env is not configured. For new integrations use `POST /billing/payment/create` instead. Check `GET /billing/status`.

</details>

<details>
<summary>Is billing required to use /gateway?</summary>

No — billing is optional topup. Users need Gommo credits (from upstream account or topup).

</details>

## MCP & Cursor

<details>
<summary>Can I use Cursor gommo_* MCP instead of this gateway?</summary>

Cursor's built-in `gommo_*` tools call Gommo **directly** — not your deployed gateway. For IDE agents on **your** platform, use the official [`@ai-gateway/mcp-server`](./mcp/setup-cursor.md). For production apps, use HTTP `/gateway/*`. See [MCP & agents](./mcp/).

</details>

## Deploy & ops

<details>
<summary>When do I need CORS?</summary>

When a **browser app on another origin** calls the API (e.g. `localhost:5175`). Not needed for `/portal` or server-side clients.

Set `GATEWAY_CORS_ORIGIN` comma-separated origins.

See [Deploy & ops](./deploy/) and [Best practices](./best-practices/).

</details>

<details>
<summary>Is /portal available in production?</summary>

Off by default (`NODE_ENV=production`). Enable with `GATEWAY_PORTAL=true` only if you accept the risk.

</details>

## Still stuck?

→ [Report feedback](./report-feedback.md) · [Community](./community/)
