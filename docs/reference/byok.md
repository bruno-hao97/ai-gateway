---
title: BYOK (beta)
description: Hybrid Bring Your Own Key — provider keys for chat, Gommo accounts for media
---

# BYOK (beta)

::: warning Beta
BYOK is **not production-complete**. Use it for dev, staging, or self-hosted gateways where you accept the limits below. Billing, fallback, and provider behavior may change without a major version bump.
:::

**Production deploy:** follow the [BYOK production checklist](/guides/byok-production.md) (encryption key, persistent volumes, smoke test).

**BYOK** (Bring Your Own Key) on this gateway is **hybrid** — unlike OpenRouter-style chat-only BYOK:

| Workload | Auth / billing | Your setup |
|----------|----------------|------------|
| Chat (`POST /gateway/chat`, `POST /v1/chat/completions`) | Your **OpenAI / Anthropic** key when the model is in the gateway map | Add provider key in [BYOK](/app/byok/) |
| Media jobs, upload, audio | **Gommo credits** on your linked **primary** account | Link Gommo account in [BYOK](/app/byok/) |
| Platform fee (optional) | Accrued ledger + pre-check against session Gommo credits | Set `BYOK_PLATFORM_FEE_PERCENT` on the gateway host |

Chat does **not** bill your provider through Gommo. Media does **not** use your OpenAI/Anthropic key directly.

## Quick start

1. **Add a provider key** — [BYOK → Providers](/app/byok/) → OpenAI or Anthropic → Save key → Test.
2. **Link a Gommo account** — [BYOK → Gommo accounts](/app/byok/) → domain (e.g. `79ai.net`) → **Link current session** → set **primary** for media.
3. **Call chat with a mapped model** — use a `model` id from [Supported chat models](#supported-chat-models) below (or from `GET /gateway/byok/status` → `supportedChatModels`).

If chat returns a model error, the gateway model is probably **not** in `config/byok-model-map.json` — ask your operator to add an entry.

## What works today

| Area | Status | Notes |
|------|--------|--------|
| OpenAI chat BYOK | **Beta** | `/gateway/chat`, `/v1/chat/completions` |
| Anthropic chat BYOK | **Beta** | Same routes when map entry uses `anthropic` |
| Gommo account link | **Beta** | Primary account for media/upload/audio |
| Shared fallback to Gommo | **Beta** | Per-key toggle; default from `BYOK_DEFAULT_SHARED_FALLBACK` |
| Platform fee ledger | **Beta** | Tracking + pre-check; not OpenRouter-equivalent billing |
| Usage tab | **Beta** | Last 7 days BYOK vs platform requests |

**Not covered:**

- BYOK for media/image/video/TTS (always Gommo)
- Automatic model map from catalog (operator edits JSON file)
- Multi-instance credential sync (file store on gateway host)
- Provider billing reconciliation with OpenAI/Anthropic invoices

## Supported chat models

The gateway operator maintains `config/byok-model-map.json` (override with `BYOK_MODEL_MAP_FILE`). Each entry maps a **gateway model id** to a provider + upstream model.

Default map (may differ on your host):

| Gateway model | Provider | Upstream model | Gommo server |
|---------------|----------|----------------|--------------|
| `gpt-4o` | openai | `gpt-4o` | cheap |
| `gpt-4o-mini` | openai | `gpt-4o-mini` | cheap |
| `gpt-5.5` | openai | `gpt-4o` | cheap |
| `claude-3-5-sonnet` | anthropic | `claude-3-5-sonnet-20241022` | cheap |
| `claude-3-5-haiku` | anthropic | `claude-3-5-haiku-20241022` | cheap |

Live list for your session:

```bash
curl.exe "http://localhost:3001/gateway/byok/status" ^
  -H "Authorization: Bearer USER_TOKEN"
```

Response field: `data.supportedChatModels[]` with `gatewayModelId`, `byokProvider`, `upstreamModel`, optional `gommoServer`.

Model field may include a server suffix: `gpt-4o::cheap` — see [Chat](./chat.md).

## Fallback behavior

Each provider key has **Fallback** (UI) = `sharedFallback`:

| Setting | When BYOK provider call fails |
|---------|-------------------------------|
| **Fallback on** | Gateway retries the same request using **Gommo session credits** (platform path) |
| **Fallback off** | Request fails with the provider error — no Gommo charge for that chat |

Default for new keys: `BYOK_DEFAULT_SHARED_FALLBACK` (default `true`).

## Platform fee (beta)

When `BYOK_PLATFORM_FEE_PERCENT` and/or `BYOK_PLATFORM_FEE_PER_REQUEST` is set on the gateway:

- Successful BYOK chat requests **accrue** fee credits in `data/byok-fee-ledger.json`
- Before BYOK, gateway checks **outstanding accrued fees + estimated fee** against your **session** Gommo credits on the request domain
- If insufficient → **`402 INSUFFICIENT_CREDITS`** — top up on [Credits](/app/credits/) (same as other gateway credit checks)

The BYOK page shows **Platform fee %**, **Accrued fees**, and **Platform credits** (session balance). Accrued fees are **ledger tracking** on the gateway host until settlement logic is expanded.

## Credential storage

- Provider secrets and linked Gommo tokens are **encrypted at rest** on the gateway (`BYOK_ENCRYPTION_KEY` required in production)
- Store file: `BYOK_STORE_FILE` (default `data/byok-store.json`)
- API returns **hints only** (e.g. `sk-…ab12`) — never the raw secret

## Management API

All routes require `Authorization: Bearer` (same user token as `/gateway/*`).

| Method | Path | Body / notes |
|--------|------|--------------|
| GET | `/gateway/byok/status` | Enabled, beta, fees, providers, `supportedChatModels`, primary Gommo |
| GET | `/gateway/byok/credentials?kind=provider\|gommo` | List credentials |
| POST | `/gateway/byok/credentials` | `{ "providerSlug", "secret", "label?", "sharedFallback?" }` |
| PATCH | `/gateway/byok/credentials/{id}` | `{ "label?", "sharedFallback?", "disabled?" }` |
| DELETE | `/gateway/byok/credentials/{id}` | — |
| POST | `/gateway/byok/credentials/{id}/test` | Validates key or Gommo link |
| POST | `/gateway/byok/gommo-accounts` | `{ "domain", "label?", "setPrimary?" }` — uses session token unless `access_token` supplied |
| PATCH | `/gateway/byok/gommo-accounts/{id}/primary` | Set primary for media |
| GET | `/gateway/byok/usage?days=7&limit=20` | BYOK vs platform summary + events |

TypeScript SDK: `client.byok.status()`, `createCredential()`, `linkGommoAccount()`, `usage()` — see [TypeScript SDK](/sdk/typescript/).

### Link Gommo account example

```bash
curl.exe -X POST "http://localhost:3001/gateway/byok/gommo-accounts" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"domain\":\"79ai.net\",\"label\":\"my-site\",\"setPrimary\":true}"
```

Uses your **current session token** for that domain unless you pass `access_token` in the body (server-side integrations only).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `BYOK_ENABLED` | `true` | Master switch |
| `BYOK_BETA` | `true` | Portal/API beta labels |
| `BYOK_ENCRYPTION_KEY` | — | Required for production encryption |
| `BYOK_STORE_FILE` | `data/byok-store.json` | Credential store |
| `BYOK_MODEL_MAP_FILE` | `config/byok-model-map.json` | Chat model routing |
| `BYOK_DEFAULT_SHARED_FALLBACK` | `true` | Default fallback for new keys |
| `BYOK_PLATFORM_FEE_PERCENT` | `0` | Token-based fee % |
| `BYOK_PLATFORM_FEE_PER_REQUEST` | `0` | Minimum per-request fee credits |
| `BYOK_PLATFORM_FEE_MIN_CREDITS` | `0` | Floor per fee calculation |
| `BYOK_FEE_LEDGER_FILE` | `data/byok-fee-ledger.json` | Fee accrual ledger |
| `BYOK_PROVIDERS` | `openai,anthropic` | Enabled provider slugs |

## UI

Manage keys and accounts at [BYOK](/app/byok/) (sidebar **Developer → BYOK**, badge **beta**). The on-page callout and quick-start steps mirror this document.

### Smoke test checklist

Manual (logged in, `npm run docs:stack`):

- [ ] **Providers** → save key → green success message
- [ ] **Test** on a key → success or red error (not silent)
- [ ] **Delete** → confirm dialog → credential removed
- [ ] **Gommo** → link session → primary badge
- [ ] **Usage** tab → event rows show OK/Error badges; **Activity** link works
- [ ] Footer quick links: Chat, Chat API, Access token, Activity

See also [Chat](./chat.md), [Media & jobs](./media.md), and [Authentication](/authentication).
