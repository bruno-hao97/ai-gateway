---
title: Choosing a mode
description: Decision guide — Direct vs REST vs Proxy for your integration
---

# Choosing a mode

Pick the integration mode once per client surface. All modes share the same tokens and catalog.

## Decision tree

```
Do you already have a Gommo frontend using /v2 and /api/v2 paths?
├─ YES → Mode C (change base URL to gateway only)
└─ NO
    ├─ Can you call Gommo upstream directly (recommended)?
    │   ├─ YES → Mode A Direct (v2.api.gommo.net + api.gommo.net)
    │   └─ NO
    │       └─ Do you need billing, BYOK, or wait: true on a self-hosted server?
    │           ├─ YES → Mode B REST (/gateway/*)
    │           └─ NO → Mode A Direct (simplest — no gateway dependency)
```

## By use case

| Use case | Recommended | Why |
|----------|-------------|-----|
| **New app or backend** | **Mode A** | Public API, no gateway dependency |
| Mobile app (via your backend) | **Mode A** | Direct upstream; you control poll |
| Internal batch scripts | **Mode A** or **Mode B** | A = no infra; B = `wait: true` on self-host |
| Existing site-ai / Gommo FE client | **Mode C** | Minimal code change — swap base URL |
| Service needing gateway billing / BYOK | **Mode B** | VietQR, BYOK, JSON errors |
| Browser playground (dev) | **Mode A** or **B/C** | Playground shows public URLs; dev may proxy |
| Cross-origin browser + self-host | **Mode B** + `GATEWAY_CORS_ORIGIN` | REST + CORS on gateway |
| LLM agent / automation | **Mode A** or **79ai MCP** | Direct HTTP or hosted MCP tools |

## Trade-offs

### Mode A — Direct (recommended)

**Pros:** No gateway dependency; lowest latency; official Gommo hosts.  
**Cons:** Two hostnames in client config; manual polling; `domain` in every form.

### Mode B — REST

**Pros:** One path prefix; JSON; built-in poll; optional domain injection; billing/BYOK.  
**Cons:** Requires self-hosted gateway; different API shape from raw Gommo.

### Mode C — Proxy

**Pros:** Drop-in for existing Gommo clients; preserves upstream envelopes.  
**Cons:** Client still sends `domain`; no `wait: true`; you implement polling like Mode A.

## Can I switch later?

| From → To | Effort |
|-----------|--------|
| A → B | Medium — point to gateway, adopt JSON bodies |
| C → B | Medium — rewrite calls to `/gateway/*` JSON |
| B → A | Low — use public hosts, form bodies + client poll |
| B → C | Low for media — map REST back to `/v2` paths |

Tokens and model slugs stay the same across modes.

## Checklist before you commit

- [ ] Listed models for your job `type` and copied `ratio` from response
- [ ] Confirmed where `domain` is sent (client form for Mode A)
- [ ] Planned polling strategy (client poll 3.5s / 80 attempts, or gateway `wait: true`)
- [ ] CORS configured only if browser calls self-hosted gateway (Mode B)
- [ ] Merchant token **not** in client (only user Bearer)

## Next

→ [Gommo public API](../reference/gommo-public-api.md) · [Integration modes](./integration-modes.md) · [Quickstart](../quickstart.md)
