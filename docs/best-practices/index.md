---
title: Best practices
description: Integration patterns — polling, auth, and model parameters on Gommo
---

# Best practices

Recommended patterns for reliable **Gommo public API** integrations.

## 1. Always list models before jobs

Never hard-code or guess `ratio`, `mode`, `resolution`, or `duration`.

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

Use values from **that model's** response arrays. Wrong values cause upstream rejection or poor output.

→ [Models](../models/) · [Media jobs](../features/media-jobs.md)

## 2. Poll explicitly

| Strategy | When to use |
|----------|-------------|
| Client poll `POST …/ai/jobs/{id}?media=…` | All direct integrations — **3500 ms** × **80** max |
| UI with progress | Same poll loop; show status from response |
| Self-host `wait: true` | Optional gateway JSON — one HTTP round-trip |

Gommo **does not webhook** job completion by default. Plan for timeouts and show users a retry path.

## 3. Prefer direct public API

Call **`v2.api.gommo.net`** and **`api.gommo.net`** from your backend or trusted client. Self-host [AI Gateway](../routing/integration-modes.md) only when you need portal billing, BYOK, or JSON REST wrapper.

## 4. Keep secrets on the server

| Do | Don't |
|----|-------|
| Login from backend or use short-lived user tokens | Ship `GOMMO_ACCESS_TOKEN` to browser |
| Store merchant keys in deploy secrets only | Commit `.env` |
| Use user Bearer for generation | Expose admin keys in frontend |

→ [Privacy & security](../privacy/)

## 5. CORS when browser calls Gommo cross-origin

Direct browser calls to `v2.api.gommo.net` require Gommo CORS policy. Typical pattern: **your backend** proxies user token to Gommo.

Same-origin docs [Playground](/app/playground/) uses site proxy for dev convenience.

## 6. Chat: always send messages

Upstream requires non-empty `messages` for chat:

```
POST https://api.gommo.net/api/v2/chat
Content-Type: application/x-www-form-urlencoded

access_token=…&domain=79ai.net&action=chat&query=Hello&messages=[…]
```

For streaming, use `action=stream` and consume SSE.

→ [Chat](../features/chat.md)

## 7. Upload before job when needed

Image-to-video and edit flows:

1. `POST https://v2.api.gommo.net/ai/upload/image` (or video) → get URL
2. Pass URL in job form (field name from model catalog)
3. Create job and poll

## 8. Handle upstream errors

Check `success`, `message`, and HTTP status. Do not retry unchanged credentials on auth failures.

| Symptom | Typical action |
|---------|----------------|
| Token / domain errors | Re-login; verify registration domain |
| Validation | Fix form fields from catalog |
| Insufficient credits | Top up via platform payment |
| Rate limit | Back off |

## 9. Separate billing from generation

Credit top-up uses **`api.gommo.net`** payment endpoints. This docs site may expose `/billing/*` when self-hosted — see [Billing & credits](../guides/billing-credits.md).

## 10. Test with playground first

[/app/playground/](/app/playground/) — **Endpoints** tab shows full public URLs per operation.

Then integrate from your app with the same token flow as [Quickstart](../quickstart.md).

## Next

→ [Principles](../principles.md) · [Privacy](../privacy/) · [FAQ](../faq.md)
