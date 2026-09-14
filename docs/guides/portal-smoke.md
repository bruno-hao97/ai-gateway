---
title: Portal smoke test
description: End-to-end checklist for the developer portal UI at /app/
---

# Portal smoke test

Run after changes to portal UI (`docs/.vitepress/theme/`) or gateway REST used by the portal.

## Prerequisites

- Logged in (`gw_access_token` in browser)
- `npm run docs:stack` (docs `:5173` + API `:3001`) or remote gateway via `GATEWAY_PROXY_TARGET`

```bash
npm run theme:test
npm run test:aggregate
```

## Overview (`/app/`)

- [ ] Hero: **Open Playground**, **Activity**, **Copy token**
- [ ] Usage widget (7 days) loads; recent jobs clickable → Explore + job modal
- [ ] **Workspace** cards: Activity, Access token, Credits, BYOK, Files, Observability
- [ ] **Resources**: Quickstart, MCP, Authentication, **Portal smoke test** (this page)

## Chat (`/app/chat/`)

- [ ] Low-credit banner when balance &lt; threshold
- [ ] BYOK hint when gateway has mapped chat models — link **Open BYOK**
- [ ] Hint updates when selecting a BYOK-mapped model (with provider key saved)

## Activity (`/app/activity/`)

See [Activity hub](./activity-hub.md) for URL params. Quick pass:

- [ ] Overview → period, Refresh, Export CSV, Usage by type → Explore
- [ ] Top models → Explore `?model=`; cache tooltip; job modal `?job=` per row
- [ ] Explore → filters, Load more, Clear all filters
- [ ] Billing → links keep `?period=`

## Access token (`/app/token/`)

- [ ] Tab **Gateway** snippet; Copy token; Test connection success message
- [ ] Last activity link → Activity Explore (when jobs exist)

## Files (`/app/files/`)

- [ ] Upload → success message; **Recent uploads** persists after reload
- [ ] Copy URL / Copy fields

## BYOK (`/app/byok/`)

See [BYOK reference](/reference/byok.md). Quick pass:

- [ ] Save key → green message (no full-page flash; **Refreshing…** only)
- [ ] Test / Delete with confirm
- [ ] Usage tab → Activity link; event badges when chat BYOK ran

## Observability (`/app/observability/`)

See [Observability reference](/reference/observability.md). Quick pass:

- [ ] Stat cards → Activity / Credits
- [ ] Webhook add, test, delete; payload Copy JSON

## Credits (`/app/credits/`)

See [Billing & credits](./billing-credits.md). Quick pass:

- [ ] Low-balance banner when credits &lt; threshold
- [ ] KPI row: balance, total topped up, order count, last order
- [ ] Quick links → Activity Billing, Job logs, Overview, Billing docs
- [ ] Package grid: featured **accent**, others **primary**; VietQR checkout modal
- [ ] Top-up history table; stale pending toggle; header **Refresh** reloads packages + orders

## Profile (`/app/profile/`)

- [ ] Usage **7d** pill; links to Activity with same period
- [ ] Recent jobs → Explore job modal

## Automated

```bash
npm run theme:test    # URL helpers, usage normalize
npm run test:aggregate  # usage aggregate cache (Activity Overview)
```
