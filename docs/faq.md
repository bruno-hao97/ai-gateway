---
title: FAQ
description: Frequently asked questions about AI Gateway
---

# FAQ

Common questions about integrating with Gommo and the optional AI Gateway.

::: info Upstream status
Catalog, jobs, and login call **Gommo public API** (`v2.api.gommo.net`, `api.gommo.net`). If upstream is down, `/models/` and Playground **Send** will fail — docs and UI still load. Retry when upstream recovers.
:::

## Getting started

<details>
<summary>What is AI Gateway vs calling Gommo directly?</summary>

**Public Gommo API (recommended):** call `https://v2.api.gommo.net` and `https://api.gommo.net` directly — see [Gommo public API](./reference/gommo-public-api.md). No gateway required.

**AI Gateway (optional):** self-host this repo for local dev, VietQR billing, BYOK, or JSON REST (`/gateway/*`, Mode B) and path proxy (Mode C). Not needed for standard media/chat integration.

</details>

<details>
<summary>What do I need to get started?</summary>

**Direct integration (recommended):**

- Gommo account (email + password + registration domain, e.g. `79ai.net`)
- HTTPS client — curl, PowerShell, or [Playground](/app/playground/)
- Follow [Quickstart](./quickstart.md)

**Optional local gateway:**

- Node.js 18+, `cp .env.example .env`, `npm run dev` → `http://localhost:3001`
- Docs: `npm run docs:dev` → `http://localhost:5173`

</details>

<details>
<summary>Where is the API playground?</summary>

[/app/playground/](/app/playground/) — sign in on the docs site. The **Endpoints** tab shows full public Gommo URLs per operation.

</details>

## Authentication

<details>
<summary>How do I get a user token?</summary>

`POST https://api.gommo.net/api/apps/go-mmo/auth/login` with `email`, `password`, `domain` (registration domain). Response: `access_token`. See [Authentication](./authentication.md).

</details>

<details>
<summary>Do I send domain on every call?</summary>

**Mode A (Direct — recommended):** include `domain` in every form body matching the user's registration domain.

**Mode B (self-host):** optional on `/gateway/*` — gateway uses `GOMMO_API_DOMAIN` from server env.

**Mode C (proxy):** include `domain` in form body.

</details>

<details>
<summary>What is the merchant token?</summary>

`GOMMO_ACCESS_TOKEN` in server `.env` — for `/admin/*` and legacy PayOS fulfillment only. Not required for default Gommo VietQR top-up or direct public API calls. Never in browser apps.

</details>

## Models & jobs

<details>
<summary>Why did my job fail with invalid ratio/mode?</summary>

You guessed parameters. Always list models first and use values from the catalog. See [Models](./models/).

</details>

<details>
<summary>How long does polling take?</summary>

**Direct API:** poll every **3.5s**, max **80** attempts (~5 min).

**Gateway `wait: true`:** same timing, handled server-side.

Video jobs often need 1–5 minutes.

</details>

<details>
<summary>Does Gommo send webhooks when a job completes?</summary>

No — client or gateway must poll job status.

</details>

## API & modes

<details>
<summary>Which integration mode should I use?</summary>

- **Mode A (Direct)** — **recommended** for new apps; call `v2.api.gommo.net` + `api.gommo.net`.
- **Mode B** — self-host gateway when you need billing, BYOK, or `wait: true`.
- **Mode C** — existing FE already using Gommo paths; minimal code change.

See [Integration modes](./routing/integration-modes.md).

</details>

<details>
<summary>What error format does the gateway REST use?</summary>

Only Mode B (self-host):

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

Direct Gommo returns upstream envelopes.

</details>

## Billing

<details>
<summary>How do I top up credits?</summary>

**Default:** Gommo VietQR — requires self-hosted gateway: `POST /billing/payment/create` (user Bearer), then poll `POST /billing/payment/sync` until `paid: true`. Portal: [/app/credits/](/app/credits/). Recipe: [Gommo topup](./cookbook/gommo-topup.md).

**Legacy (optional):** PayOS via `POST /billing/topup/create` when `PAYOS_*` and merchant env are configured.

</details>

<details>
<summary>Why does billing fail or return an error?</summary>

Check `GET /billing/status` on your self-hosted gateway — expect `billingMode: "gommo"` and `gommoPayment: true` for the default flow.

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
<summary>Is billing required to use Gommo APIs?</summary>

No — billing is optional topup on a self-hosted gateway. Users need Gommo credits (from upstream account or topup).

</details>

## MCP & Cursor {#mcp-cursor}

<details>
<summary>Which MCP should I use in Cursor?</summary>

**Recommended:** **[79ai remote MCP](./mcp/other-hosts.md)** — 10 tools, token from [/app/token/](/app/token/). JSON for Cursor, Claude, ChatGPT, and [other hosts](./mcp/other-hosts.md).

**Production apps:** HTTP to **Gommo public API** — see [Gommo public API](./reference/gommo-public-api.md). Not MCP.

**Optional:** [`@ai-gateway/mcp-server`](./mcp/self-hosted.md) only if IDE must call your own `GATEWAY_URL`.

</details>

<details>
<summary>What can 79ai MCP do?</summary>

All **10 tools**: account/credit, model catalog, image & video create, status & stream polling, task history, and notifications. See [tool reference](./mcp/tools.md) and [use cases & prompts](./mcp/use-cases.md).

</details>

<details>
<summary>Can I use 79ai MCP outside Cursor?</summary>

**Yes** — any MCP client that supports remote `url` + custom headers. See [Other MCP hosts](./mcp/other-hosts.md). ChatGPT/Gemini web apps cannot use MCP; use HTTP to Gommo directly instead.

</details>

<details>
<summary>Is the token from /app/token/ the same as 79ai MCP?</summary>

Yes. Login returns a **Gommo user `access_token`**. Use it in 79ai MCP headers (`Gommo-Token` and `Authorization: Bearer …`) and as `Authorization: Bearer …` for HTTP calls to `v2.api.gommo.net` and `api.gommo.net`.

</details>

<details>
<summary>Do I need to run the gateway for MCP?</summary>

**No** for [79ai MCP](./mcp/other-hosts.md) — tools call Gommo's hosted MCP directly.

**Yes** only for the optional [self-hosted MCP](./mcp/self-hosted.md) (`@ai-gateway/mcp-server` + `GATEWAY_URL`).

</details>

<details>
<summary>What is @ai-gateway/mcp-server?</summary>

An optional package for merchants who want Cursor tools to call **their** gateway URL instead of 79ai remote MCP. See [Self-hosted MCP](./mcp/self-hosted.md). Most users should use 79ai MCP or direct HTTP.

</details>

## Deploy & ops

<details>
<summary>When do I need CORS?</summary>

When a **browser app on another origin** calls a **self-hosted gateway** (e.g. `localhost:5175` → `localhost:3001`). Not needed for direct Gommo API calls or server-side clients.

Set `GATEWAY_CORS_ORIGIN` comma-separated origins.

See [Deploy & ops](./deploy/) and [Best practices](./best-practices/).

</details>

<details>
<summary>Is /portal available in production?</summary>

Off by default (`NODE_ENV=production`). Enable with `GATEWAY_PORTAL=true` only if you accept the risk.

</details>

## Still stuck?

→ [Report feedback](./report-feedback.md) · [Community](./community/)
