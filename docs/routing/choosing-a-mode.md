---
title: Choosing a mode
description: Decision guide — Direct vs REST vs Proxy for your integration
---

# Choosing a mode

Pick the integration mode once per client surface. You can mix modes across different apps (e.g. Mode C for legacy web, Mode B for a new admin tool) — they share the same tokens and catalog.

## Decision tree

```
Do you already have a Gommo frontend using /v2 and /api/v2 paths?
├─ YES → Mode C (change base URL to gateway only)
└─ NO
    ├─ Do you want JSON, structured errors, and optional wait: true?
    │   ├─ YES → Mode B REST (/gateway/*)
    │   └─ NO
    │       └─ Can you call Gommo upstream directly (trusted backend)?
    │           ├─ YES → Mode A Direct
    │           └─ NO → Mode B (simplest path through gateway)
```

## By use case

| Use case | Recommended | Why |
|----------|-------------|-----|
| New SPA or mobile app (via your backend) | **Mode B** | JSON, `wait: true`, domain on server |
| Existing site-ai / Gommo FE client | **Mode C** | Minimal code change — swap base URL |
| Internal batch scripts | **Mode B** | Easier error handling and polling |
| Service that must not depend on gateway | **Mode A** | Direct upstream; you implement poll |
| Browser playground (dev) | **Mode B or C** | Same-origin `/portal` — no CORS |
| Cross-origin browser app | **Mode B** + `GATEWAY_CORS_ORIGIN` | REST + CORS config on gateway |
| LLM agent / automation | **Mode B** | Structured `{ code, message }` for retries |

## Trade-offs

### Mode A — Direct

**Pros:** No gateway dependency; lowest latency hop count.  
**Cons:** Two hostnames in client config; manual polling; expose upstream URLs; `domain` in every form.

### Mode B — REST

**Pros:** One path prefix; JSON; built-in poll; optional domain injection; consistent errors.  
**Cons:** Different API shape from raw Gommo — not drop-in for legacy FE.

### Mode C — Proxy

**Pros:** Drop-in for existing Gommo clients; preserves upstream envelopes.  
**Cons:** Client still sends `domain`; no `wait: true`; you implement polling like Mode A.

## Can I switch later?

| From → To | Effort |
|-----------|--------|
| C → B | Medium — rewrite calls to `/gateway/*` JSON |
| A → B | Medium — point to gateway, adopt JSON bodies |
| B → C | Low for media — map REST back to `/v2` paths |
| Any → A | Low — remove gateway from URL config |

Tokens and model slugs stay the same across modes.

## Checklist before you commit

- [ ] Listed models for your job `type` and copied `ratio` from response
- [ ] Confirmed where `domain` is sent (client vs server env)
- [ ] Planned polling strategy (`wait: true` vs client poll)
- [ ] CORS configured if browser is on another origin (Mode B)
- [ ] Merchant token **not** in client (only user Bearer)

## Next

→ [Integration modes](./integration-modes.md) · [Quickstart](../quickstart.md) · [FAQ](../faq.md)
