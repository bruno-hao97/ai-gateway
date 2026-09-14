---
title: Lịch sử usage
description: Thống kê và log job từ Gommo usage-history
---

# Lịch sử usage

Portal **[Activity hub](/vi/app/activity/)** (và preview usage trên Profile) đọc `POST /api/v2/usage-history` qua gateway — cùng nguồn với lịch sử 79ai.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/gateway/usage/stats` | `Authorization: Bearer` |
| GET | `/gateway/usage/stats` | Bearer (query) |
| POST | `/gateway/usage/logs` | Bearer |
| GET | `/gateway/usage/logs` | Bearer (query) |
| POST | `/gateway/usage/aggregate` | Bearer |
| GET | `/gateway/usage/aggregate` | Bearer (query) |

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

## POST aggregate (top models)

Gateway paginate `action=logs` và gom theo `model` (tối đa 50 trang × 100 dòng).

| Field | Ghi chú |
|-------|---------|
| `groupBy` | `model` (bắt buộc) |
| `top` | 1–20, mặc định `5` |
| `maxPages` | 1–100, mặc định `50` |
| `refresh` | `1` / `true` — bỏ qua cache bộ nhớ, quét lại logs |

Response: `scanned_jobs`, `truncated`, `items[]` (`model`, `count`, `credit`, `percent`), `from_cache` tùy chọn khi gateway trả từ cache bộ nhớ (TTL mặc định 10 phút, `USAGE_AGGREGATE_CACHE_TTL_MS`).

## Map UI

| UI | Nguồn |
|----|--------|
| KPI Overview (Activity) | `action=stats` → `summary` |
| Top models (Overview) | `POST /gateway/usage/aggregate` |
| Biểu đồ / bảng ngày (Trends) | `action=stats` → `chart`, `table[]` |
| Danh sách job (Explore) | `action=logs` |
| Credit thực | `summary.credit_net` |
| Credits khả dụng | `/ai/me` → `balancesInfo.credits_ai` |

Xem [Activity hub](../guides/activity-hub.md), [OpenAPI](./openapi.md) và [Authentication](../authentication.md).
