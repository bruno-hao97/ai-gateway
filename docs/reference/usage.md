---
title: Usage history
description: Aggregated stats and per-job logs from Gommo usage-history
---

# Usage history

The docs dashboard **Profile → Usage** reads Gommo `POST /api/v2/usage-history` via gateway wrappers. Same data as 79ai usage history.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/gateway/usage/stats` | `Authorization: Bearer` |
| GET | `/gateway/usage/stats` | Bearer (query params) |
| POST | `/gateway/usage/logs` | Bearer |
| GET | `/gateway/usage/logs` | Bearer (query params) |

Upstream: `action=stats` or `action=logs` on `https://api.gommo.net/api/v2/usage-history`.

## POST stats (recommended)

Send **device fields in the form body** (browser apps). The docs site forwards `device_id`, `device_name`, `device_info` automatically.

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/stats" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&language=vi&device_id=UUID&device_name=Chrome%%201&device_info={...}"
```

| Field | Values |
|-------|--------|
| `period` | `7d`, `30d`, `90d` |
| `type` | `all`, `image`, `video`, `audio`, `music` |
| `language` | `vi` (stats) |

Response `data.summary`: `total`, `success`, `error`, `credit`, `refund`, `credit_net`, `by_type`.

## POST logs

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/logs" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&language=VI&page=1&limit=30&device_id=..."
```

| Field | Notes |
|-------|--------|
| `language` | `VI` for logs (uppercase) |
| `page` / `limit` | Pagination; `has_more` in response |

## Dashboard mapping

| UI card | Source |
|---------|--------|
| Net credits | `summary.credit_net` |
| Available credits | `POST /ai/me` → `balancesInfo.credits_ai` |
| Job history table | `action=logs` items |
| Daily summary | `action=stats` → `table[]` |

See also [OpenAPI](./openapi.md) and [Authentication](../authentication.md).
