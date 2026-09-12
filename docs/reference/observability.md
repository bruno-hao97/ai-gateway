---
title: Observability (beta)
description: Usage hub, local mirror, and outbound job webhooks — current scope and limits
---

# Observability (beta)

::: warning Beta
Observability is **not production-complete**. Use it for dev, staging, or self-hosted gateways where you accept the limits below. Behavior may change without a major version bump.
:::

The **Observability** app page (`/app/observability/`) is a hub for:

| Area | Status | Notes |
|------|--------|--------|
| Gommo usage stats & logs | **Stable** | Same data as Profile → Usage / Logs via `/gateway/usage/*` |
| Local session mirror | **Beta** | Browser `localStorage` only (Playground / Chat) |
| Outbound webhooks | **Beta** | Gateway → your HTTPS URL on selected job events |
| Langfuse, OTEL, Datadog, Sentry | **Not built** | Shown as “Coming soon” in the UI |

Gommo upstream **still does not** push job completion. Gateway webhooks are an **optional add-on** on top of gateway REST — they do not replace `wait: true` or client polling for async media jobs.

## What works today

### Usage & logs (stable)

Aggregated stats and per-job rows from Gommo `usage-history`, wrapped at:

- `GET` / `POST` `/gateway/usage/stats`
- `GET` / `POST` `/gateway/usage/logs`

See [Usage history](./usage.md).

### Local session mirror (beta)

When enabled on the Observability page, Playground and Chat append lightweight job rows to **this browser’s** `localStorage`. Nothing is sent to your webhook endpoints or a server-side log store.

### Outbound webhooks (beta)

Register up to **5** HTTPS endpoints per account (default). The gateway POSTs JSON when:

| Trigger | Event | When |
|---------|-------|------|
| `POST /gateway/jobs/{type}` with **`wait: true`** | `job.completed` or `job.failed` | After gateway poll finishes (~3.5s × up to 80 attempts) |
| `POST /gateway/jobs/{type}` with **`wait: false`** | `job.completed` only | **Only if** the create response already includes a result URL (instant/sync path) |
| `POST /gateway/observability/webhooks/{id}/test` | `webhook.test` | Manual test from UI or API |

Supported `{type}` values match [Media & jobs](./media.md) (`image`, `video`, `tts`, `music`, `avatar-lipsync`, tool types, etc.).

**Not covered (no webhook today):**

- Async jobs submitted with `wait: false` that finish later (no background poller)
- Chat (`/gateway/chat/*`, BYOK chat)
- Audio routes, upload-only calls, raw `/v2` or `/ai` proxy traffic
- Billing, credits, login events

**Delivery semantics:**

- Fire-and-forget — **no retry queue**
- 10s timeout per delivery (configurable via `OBSERVABILITY_DELIVERY_TIMEOUT_MS`)
- Webhook config stored in a **local JSON file** on the gateway host (`data/observability-webhooks.json`) — not replicated across multiple gateway instances unless you share that file
- HTTPS required; `http://` allowed only for `localhost` / `127.0.0.1` (dev)

## Webhook management API

All routes require `Authorization: Bearer` (same user token as `/gateway/*`).

| Method | Path | Body |
|--------|------|------|
| GET | `/gateway/observability/webhooks` | — |
| POST | `/gateway/observability/webhooks` | `{ "url", "label?", "secret?" }` |
| PATCH | `/gateway/observability/webhooks/{id}` | `{ "enabled?", "label?" }` |
| DELETE | `/gateway/observability/webhooks/{id}` | — |
| POST | `/gateway/observability/webhooks/{id}/test` | — |

### Create example

```bash
curl.exe -X POST "http://localhost:3001/gateway/observability/webhooks" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://example.com/hooks/gateway\",\"label\":\"staging\",\"secret\":\"whsec_...\"}"
```

Secrets are encrypted at rest on the gateway (same crypto as BYOK). The API never returns the raw secret — only a hint such as `whsec_…ab12`.

## Event payload

`POST` to your URL with JSON body:

```json
{
  "type": "job.completed",
  "timestamp": "2026-09-12T02:00:00.000Z",
  "data": {
    "jobType": "image",
    "modelSlug": "flux-schnell",
    "jobId": "abc123",
    "resultUrl": "https://…",
    "coverUrl": "https://…",
    "status": "success"
  }
}
```

`job.failed` includes `status: "failed"` and optional `error`.

Headers:

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `User-Agent` | `ai-gateway-observability/1.0` |
| `X-Gateway-Event` | Event type (`job.completed`, `job.failed`, `webhook.test`) |
| `X-Gateway-Timestamp` | Same ISO timestamp as body |
| `X-Gateway-Signature` | HMAC-SHA256 hex of `{timestamp}.{rawBody}` when a signing secret is set |

Verify on your receiver:

```text
expected = HMAC_SHA256(secret, timestamp + "." + rawRequestBody)
```

Compare to `X-Gateway-Signature` with a constant-time compare.

## Environment

| Variable | Default |
|----------|---------|
| `OBSERVABILITY_STORE_FILE` | `data/observability-webhooks.json` |
| `OBSERVABILITY_MAX_WEBHOOKS` | `5` |
| `OBSERVABILITY_DELIVERY_TIMEOUT_MS` | `10000` |

## Recommended integration pattern

For reliable job notifications in production **today**:

1. Prefer **`wait: true`** on `POST /gateway/jobs/{type}` and handle the HTTP response, **or**
2. Poll job status client-side (3.5s interval, ~80 attempts) as documented in [integration modes](../routing/integration-modes.md), **and optionally**
3. Add a beta webhook as a **secondary** signal when using `wait: true` or instant `wait: false` results.

Do **not** rely on webhooks alone for async `wait: false` jobs until a future release adds background delivery.

## UI

Manage webhooks at [Observability](/app/observability/) (sidebar **Developer → Observability**, badge **beta**). The on-page callout lists the same limits in plain language.

See also [Usage history](./usage.md) and [Media & jobs](./media.md).
