---
title: Lịch sử usage
description: Thống kê và log job từ Gommo usage-history
---

# Lịch sử usage

Dashboard docs **Profile → Usage** đọc `POST /api/v2/usage-history` qua gateway — cùng nguồn với lịch sử 79ai.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/gateway/usage/stats` | `Authorization: Bearer` |
| GET | `/gateway/usage/stats` | Bearer (query) |
| POST | `/gateway/usage/logs` | Bearer |
| GET | `/gateway/usage/logs` | Bearer (query) |

Upstream: `action=stats` hoặc `action=logs` trên `https://api.gommo.net/api/v2/usage-history`.

## POST stats

Gửi **device** trong form body (`device_id`, `device_name`, `device_info`). Trang docs tự điền.

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/stats" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&language=vi&device_id=UUID&device_name=Chrome%%201&device_info={...}"
```

| Field | Giá trị |
|-------|---------|
| `period` | `7d`, `30d`, `90d` |
| `type` | `all`, `image`, `video`, `audio`, `music` |
| `language` | `vi` (stats) |

Response `data.summary`: `total`, `credit_net`, `by_type`, …

## POST logs

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/logs" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&language=VI&page=1&limit=30"
```

`language=VI` cho logs. Phân trang: `page`, `limit`, `has_more`.

## Map UI

| Card | Nguồn |
|------|--------|
| Credit thực | `summary.credit_net` |
| Credits khả dụng | `/ai/me` → `balancesInfo.credits_ai` |
| Lịch sử job | `action=logs` |
| Tổng hợp ngày | `action=stats` → `table[]` |

Xem thêm [OpenAPI](./openapi.md) và [Authentication](../authentication.md).
