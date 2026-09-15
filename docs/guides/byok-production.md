---
title: BYOK production checklist
description: Deploy hybrid BYOK safely — encryption, persistence, model map, and smoke tests
---

# BYOK production checklist

Use after [BYOK reference](/reference/byok.md) when moving from dev/staging to a **self-hosted or single-instance production** gateway.

::: warning Beta
BYOK remains **beta** — this checklist reduces operational risk; it does not remove beta limits (file store, fee ledger, model map edits).
:::

## 1. Encryption key (required)

Production **must** set `BYOK_ENCRYPTION_KEY` when `BYOK_ENABLED=true` (default). The gateway **refuses to start** without it when `NODE_ENV=production`.

Generate a 32-byte key:

```bash
npm run byok:generate-key
# or: openssl rand -base64 32
```

Set on the host (Railway/Fly secrets, Docker env, never commit):

```env
NODE_ENV=production
BYOK_ENCRYPTION_KEY=<paste-base64-key>
```

**Also used by:** Observability background poll queue (`data/observability-background-polls.json`) — same key material as BYOK credentials.

::: danger Rotating keys
Changing `BYOK_ENCRYPTION_KEY` invalidates existing encrypted data in `byok-store.json` and observability poll queue. Plan migration or re-save credentials after rotation.
:::

## 2. Persistent volumes

Mount or back up these paths on the gateway host:

| File | Purpose |
|------|---------|
| `data/byok-store.json` | Encrypted provider keys + linked Gommo tokens |
| `data/byok-usage.jsonl` | BYOK usage events (append-only) |
| `data/byok-fee-ledger.json` | Platform fee accrual (if fees enabled) |
| `config/byok-model-map.json` | Chat model routing (or `BYOK_MODEL_MAP_FILE`) |

**Single instance:** file store is fine. **Multiple replicas:** share the same files via NFS/EFS **or** run one gateway instance for BYOK until a shared store exists.

## 3. Environment

| Variable | Production notes |
|----------|------------------|
| `BYOK_ENABLED` | `true` (default) — set `false` to disable entirely |
| `BYOK_ENCRYPTION_KEY` | **Required** — see above |
| `BYOK_STORE_FILE` | Absolute path on persistent disk |
| `BYOK_MODEL_MAP_FILE` | Commit map in image or mount config volume |
| `BYOK_BETA` | `true` (default) — portal shows beta badge |
| `BYOK_DEFAULT_SHARED_FALLBACK` | `true` = Gommo fallback when provider fails |
| `BYOK_PLATFORM_FEE_*` | Optional — see [BYOK reference](/reference/byok.md#platform-fee-beta) |
| `BYOK_PROVIDERS` | Default `openai,anthropic` |

See [Deploy](/deploy/) for `GATEWAY_CORS_ORIGIN`, `ADMIN_API_KEY`, merchant `GOMMO_*`.

## 4. Model map

1. Edit `config/byok-model-map.json` (or custom `BYOK_MODEL_MAP_FILE`).
2. Each entry: `gatewayModelId` → `provider` + `upstreamModel` (+ optional `gommoServer`).
3. Redeploy or restart after map changes.
4. Verify: `GET /gateway/byok/status` → `supportedChatModels`.

Users must pick models from that list in Chat / API — do not guess upstream model ids.

## 5. Portal + CORS

- Browser portal at `/app/byok/` needs docs built with `VITE_GATEWAY_URL` pointing to your API — see [Deploy § Docs](/deploy/#docs-deploy).
- If portal is on a different origin than API, set `GATEWAY_CORS_ORIGIN`.
- `GATEWAY_PORTAL=true` only if you serve `/portal` from the API host (unusual in prod; prefer static docs site).

## 6. Smoke test (production)

Logged in on your deployed portal (or staging with `NODE_ENV=production`):

- [ ] **Providers** → save OpenAI/Anthropic key → green message → **Test** OK
- [ ] **Gommo** → link session → set **primary** for media
- [ ] **Chat** (`/app/chat/`) → BYOK-mapped model → message succeeds; usage row on BYOK **Usage** tab
- [ ] **Media** → image job still uses Gommo credits (linked primary account)
- [ ] **Delete** provider key → confirm → removed
- [ ] Restart gateway → keys still work (store file persisted)

Automated (CI, no live provider call):

```bash
npm run test:byok
```

## 7. Backup & recovery

- **Backup:** copy `byok-store.json`, `byok-usage.jsonl`, `byok-fee-ledger.json`, and model map on a schedule.
- **Restore:** stop gateway → restore files → same `BYOK_ENCRYPTION_KEY` → start.
- **Leak response:** rotate provider keys at OpenAI/Anthropic, delete credential via API/UI, issue new gateway encryption key only with full re-encryption plan.

## 8. Monitoring

- Log `402 INSUFFICIENT_CREDITS` on BYOK chat (platform fee pre-check).
- Alert on repeated provider errors in `byok-usage.jsonl` or BYOK Usage tab.
- `GET /health` — `byokEnabled` / `byokBeta` in response data.

## Related

- [BYOK reference](/reference/byok.md)
- [Chat](/reference/chat.md)
- [Portal smoke test](/guides/portal-smoke.md) — BYOK section
- [Deploy](/deploy/)
