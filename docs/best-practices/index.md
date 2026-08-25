---
title: Best practices
description: Integration patterns — polling, CORS, rate limits, and model parameters
---

# Best practices

Recommended patterns for reliable AI Gateway integrations — distilled from Gommo upstream behavior and gateway design.

## 1. Always list models before jobs

Never hard-code or guess `ratio`, `mode`, `resolution`, or `duration`.

```http
GET /gateway/models?type=image
Authorization: Bearer {token}
```

Use values from **that model's** response arrays. Wrong values cause upstream rejection or poor output.

→ [Models](../models.md) · [Media jobs](../features/media-jobs.md)

## 2. Choose polling strategy explicitly

| Strategy | When to use |
|----------|-------------|
| `wait: true` on create | Scripts, simple backends, agents — one HTTP round-trip |
| Client poll `GET /gateway/jobs/:id` | Long jobs, UI with progress bar, cancel support |
| Mode C / Direct | You implement 3.5s × 80 attempts (~5 min max) |

Gommo **does not webhook** job completion. Plan for timeouts and show users a retry path.

Default gateway poll: **3500 ms** interval, **80** max attempts.

## 3. Use Mode B for new clients

Prefer `/gateway/*` JSON unless you have a legacy Gommo FE:

- Structured errors (`code`, `message`)
- Optional `domain` injection from server
- Consistent auth (`Authorization: Bearer`)

→ [Choosing a mode](../routing/choosing-a-mode.md)

## 4. Keep secrets on the server

| Do | Don't |
|----|-------|
| Login from backend or use short-lived user tokens | Ship `GOMMO_ACCESS_TOKEN` to browser |
| Call `/admin` from cron/internal tools only | Expose `x-admin-key` in frontend |
| Store PayOS keys in deploy secrets | Commit `.env` |

→ [Privacy & security](../privacy/)

## 5. CORS only when needed

**No CORS required for:**

- Server-side clients (Node, Python, curl)
- Same-origin `/portal` playground (`localhost:3001/portal`)

**Set `GATEWAY_CORS_ORIGIN` when:**

- Browser SPA on another origin (e.g. `https://app.example.com`)
- Comma-separate multiple origins: `https://a.com,https://b.com`

Empty `GATEWAY_CORS_ORIGIN` = CORS middleware not mounted — browser cross-origin calls will fail (by design).

## 6. Respect rate limits

Per-IP defaults (configurable via env):

| Scope | Default | Env |
|-------|---------|-----|
| `/gateway/*` | 120 req / min | `GATEWAY_RATE_LIMIT_MAX` |
| `/admin/*` | 30 req / min | `ADMIN_RATE_LIMIT_MAX` |
| `/billing/*` | 60 req / min | `BILLING_RATE_LIMIT_MAX` |
| Window | 60 s | `GATEWAY_RATE_LIMIT_WINDOW_MS` |

On `429`, response:

```json
{ "success": false, "message": "Too many requests", "code": "RATE_LIMITED" }
```

Implement exponential backoff in clients; batch admin operations.

## 7. Chat: always send messages

Upstream requires non-empty `messages` for `action=chat`:

```json
{
  "action": "chat",
  "query": "Hello",
  "messages": [{ "role": "user", "text": "Hello" }]
}
```

For streaming, use `action=stream` and consume SSE — do not buffer the full response in gateway-facing clients.

→ [Chat](../features/chat.md)

## 8. Upload before job when needed

Image-to-video and edit flows:

1. Upload → get URL
2. Pass URL in job `fields` (field name from model catalog)
3. Create job with `wait` or poll

Respect **50 MB** body limit on proxy/upload routes.

## 9. Handle errors consistently

Check `success` and `code` on Mode B:

| Code | Typical action |
|------|----------------|
| `UNAUTHORIZED` | Refresh or re-login |
| `VALIDATION_ERROR` | Fix request body |
| `INSUFFICIENT_CREDITS` | Prompt topup or admin send |
| `UPSTREAM_ERROR` | Retry with backoff; check Gommo status |
| `RATE_LIMITED` | Back off |
| `NOT_CONFIGURED` | Fix server env (PayOS, admin, merchant) |

## 10. Health check before deploy

```bash
curl https://api.yourdomain.com/health
```

Verify `merchantConfigured` and `adminConfigured` match expectations before enabling billing or admin tools.

## 11. Separate billing from generation

Use `/billing/*` for PayOS topup — not `/gateway`. Keeps payment webhooks and credit fulfillment isolated from media/chat APIs.

## 12. Test with playground first

Same-origin dev tests avoid CORS setup:

[http://localhost:3001/portal/playground.html](http://localhost:3001/portal/playground.html)

Then integrate from your app with the same token flow as [Quickstart](../quickstart.md).

## Next

→ [Deploy & ops](../deploy/) · [Privacy](../privacy/) · [FAQ](../faq.md)
