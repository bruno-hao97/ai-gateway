---
title: Best practices
description: Poll, CORS, rate limit, tham số model
---

# Best practices

Pattern khuyến nghị khi tích hợp AI Gateway.

## 1. Luôn list models trước job

Không hard-code hoặc đoán `ratio`, `mode`, `resolution`, `duration`.

```http
GET /gateway/models?type=image
Authorization: Bearer {token}
```

→ [Models](../models/) · [Media jobs](../features/media-jobs.md)

## 2. Chọn chiến lược poll rõ ràng

| Chiến lược | Khi dùng |
|------------|----------|
| `wait: true` | Script, backend đơn giản |
| Client poll | UI progress, job dài |
| Mode C / Direct | Tự implement 3.5s × 80 lần |

Gommo **không webhook**. Mặc định gateway: **3500 ms**, **80** lần.

## 3. Mode B cho client mới

JSON `/gateway/*`, lỗi có cấu trúc, domain inject server.

→ [Choosing a mode](../routing/choosing-a-mode.md)

## 4. Secret ở server

| Nên | Không |
|-----|-------|
| Token user ngắn hạn | `GOMMO_ACCESS_TOKEN` trên browser |
| `/admin` từ tool nội bộ | `x-admin-key` trên FE |
| PayOS key trên platform | Commit `.env` |

→ [Privacy](../privacy/)

## 5. CORS khi cần

**Không cần CORS:** server-side, `/portal` same-origin.

**Cần `GATEWAY_CORS_ORIGIN`:** SPA browser origin khác.

Rỗng = CORS không mount — cross-origin browser fail (by design).

## 6. Rate limit

| Scope | Mặc định | Env |
|-------|----------|-----|
| `/gateway/*` | 120/phút/IP | `GATEWAY_RATE_LIMIT_MAX` |
| `/admin/*` | 30/phút/IP | `ADMIN_RATE_LIMIT_MAX` |
| `/billing/*` | 60/phút/IP | `BILLING_RATE_LIMIT_MAX` |

`429` → `{ "code": "RATE_LIMITED" }`. Backoff phía client.

## 7. Chat: messages không rỗng

```json
{
  "action": "chat",
  "query": "Xin chào",
  "messages": [{ "role": "user", "text": "Xin chào" }]
}
```

Stream: `action=stream`, consume SSE.

## 8. Upload trước job

Upload → URL → truyền vào `fields` job. Giới hạn body **50 MB**.

## 9. Xử lý lỗi

| Code | Hành động |
|------|-----------|
| `UNAUTHORIZED` | Login lại |
| `VALIDATION_ERROR` | Sửa body |
| `INSUFFICIENT_CREDITS` | Topup |
| `UPSTREAM_ERROR` | Retry |
| `RATE_LIMITED` | Backoff |
| `NOT_CONFIGURED` | Sửa env server |

## 10. Health check trước deploy

```bash
curl https://api.yourdomain.com/health
```

## 11. Billing tách generation

PayOS ở `/billing/*`, không gắn dưới `/gateway`.

## 12. Test playground trước

[/vi/app/playground/](/vi/app/playground/) — đăng nhập trên docs.

## Tiếp theo

→ [Deploy](../deploy/) · [FAQ](../faq.md)
