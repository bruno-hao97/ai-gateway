---
title: ประวัติการใช้งาน
description: สถิติรวมและ log ต่อ job จาก Gommo usage-history
---

# ประวัติการใช้งาน

**[Activity hub](/app/activity/)** ใน docs portal (และตัวอย่าง usage ใน Profile) อ่าน Gommo `POST /api/v2/usage-history` ผ่าน gateway wrappers ข้อมูลเดียวกับ usage history ของ 79ai

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/gateway/usage/stats` | `Authorization: Bearer` |
| GET | `/gateway/usage/stats` | Bearer (query params) |
| POST | `/gateway/usage/logs` | Bearer |
| GET | `/gateway/usage/logs` | Bearer (query params) |
| POST | `/gateway/usage/aggregate` | Bearer |
| GET | `/gateway/usage/aggregate` | Bearer (query params) |

Upstream: `action=stats` หรือ `action=logs` บน `https://api.gommo.net/api/v2/usage-history`

## POST stats (แนะนำ)

ส่ง **ฟิลด์ device ใน form body** (แอป browser) docs site ส่งต่อ `device_id`, `device_name`, `device_info` อัตโนมัติ

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/stats" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&language=vi&device_id=UUID&device_name=Chrome%%201&device_info={...}"
```

| Field | ค่า |
|-------|-----|
| `period` | `7d`, `30d`, `90d` |
| `type` | `all`, `image`, `video`, `audio`, `music` |
| `language` | `vi` (stats) |

Response `data.summary`: `total`, `success`, `error`, `credit`, `refund`, `credit_net`, `by_type`

## POST logs

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/logs" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&language=VI&page=1&limit=30&device_id=..."
```

| Field | หมายเหตุ |
|-------|----------|
| `language` | `VI` สำหรับ logs (ตัวพิมพ์ใหญ่) |
| `page` / `limit` | Pagination; `has_more` ใน response |

## POST aggregate (โมเดลยอดนิยม)

Server paginate `action=logs` และจัดกลุ่มตาม `model` (สูงสุด 50 หน้า × 100 แถว)

```bash
curl.exe -X POST "http://localhost:3001/gateway/usage/aggregate" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "domain=79ai.net&period=30d&type=all&groupBy=model&top=5&device_id=..."
```

| Field | หมายเหตุ |
|-------|----------|
| `groupBy` | `model` (จำเป็น) |
| `top` | 1–20, default `5` |
| `maxPages` | 1–100, default `50` (ขีด scan) |
| `refresh` | `1` / `true` — ข้าม in-memory cache และ scan logs ใหม่ |

Response `data`: `scanned_jobs`, `pages_scanned`, `truncated`, `items[]` (`model`, `count`, `credit`, `percent`), optional `from_cache` เมื่อจาก gateway memory cache (TTL เริ่มต้น 10 นาที, `USAGE_AGGREGATE_CACHE_TTL_MS`)

## แมปกับ dashboard

| UI | แหล่งข้อมูล |
|----|------------|
| Activity Overview KPIs | `action=stats` → `summary` |
| Top models (Overview) | `POST /gateway/usage/aggregate` |
| Trends charts / daily table | `action=stats` → `chart`, `table[]` |
| Explore job list | รายการ `action=logs` |
| Net credits | `summary.credit_net` |
| Available credits | `POST /ai/me` → `balancesInfo.credits_ai` |

ดู [Activity hub](../guides/activity-hub.md), [OpenAPI](./openapi.md) และ [Authentication](../authentication.md)
