---
title: Observability (beta)
description: Hub usage, mirror local và webhook job — phạm vi và giới hạn hiện tại
---

# Observability (beta)

::: warning Beta
Observability **chưa hoàn chỉnh cho production**. Dùng cho dev, staging hoặc gateway self-host khi chấp nhận các giới hạn dưới đây. Hành vi có thể thay đổi mà không cần major version.
:::

Trang app **Observability** (`/app/observability/`) gom:

| Khu vực | Trạng thái | Ghi chú |
|---------|------------|---------|
| Thống kê & log job Gommo | **Ổn định** | Cùng nguồn Profile → Usage / Logs qua `/gateway/usage/*` |
| Local session mirror | **Beta** | Chỉ `localStorage` trình duyệt (Playground / Chat) |
| Webhook outbound | **Beta** | Gateway → URL HTTPS của bạn khi có event job |
| Langfuse, OTEL, Datadog, Sentry | **Chưa làm** | UI “Sắp có” |

Gommo upstream **vẫn không** push khi job xong. Webhook gateway là **tùy chọn** trên REST gateway — **không thay** `wait: true` hoặc poll client cho job media async.

## Khả năng hiện tại

### Usage & logs (ổn định)

Thống kê và từng dòng job từ Gommo `usage-history`, bọc tại:

- `GET` / `POST` `/gateway/usage/stats`
- `GET` / `POST` `/gateway/usage/logs`

Xem [Lịch sử usage](./usage.md).

### Local session mirror (beta)

Bật trên trang Observability: Playground và Chat ghi job nhẹ vào **localStorage trình duyệt này**. Không gửi webhook hay log server.

### Webhook outbound (beta)

Tối đa **5** endpoint HTTPS / tài khoản (mặc định). Gateway POST JSON khi:

| Kích hoạt | Event | Thời điểm |
|-----------|-------|------------|
| `POST /gateway/jobs/{type}` với **`wait: true`** | `job.completed` hoặc `job.failed` | Sau khi gateway poll xong (~3.5s × tối đa 80 lần) |
| `POST /gateway/jobs/{type}` với **`wait: false`** | `job.completed` only | **Chỉ khi** response create đã có result URL (đường sync/tức thì) |
| `POST /gateway/observability/webhooks/{id}/test` | `webhook.test` | Test thủ công từ UI hoặc API |

`{type}` giống [Media & jobs](./media.md) (`image`, `video`, `tts`, `music`, …).

**Chưa hỗ trợ (không webhook):**

- Job async `wait: false` hoàn thành sau (không có poller nền)
- Chat (`/gateway/chat/*`, BYOK chat)
- Audio, upload thuần, proxy `/v2` / `/ai`
- Billing, credit, login

**Cơ chế gửi:**

- Fire-and-forget — **không retry queue**
- Timeout 10s / lần gửi (`OBSERVABILITY_DELIVERY_TIMEOUT_MS`)
- Cấu hình lưu **file JSON local** trên gateway (`data/observability-webhooks.json`) — không replicate giữa nhiều instance trừ khi bạn share file
- Bắt buộc HTTPS; `http://` chỉ `localhost` / `127.0.0.1` (dev)

## API quản lý webhook

Cần `Authorization: Bearer` (token user như `/gateway/*`).

| Method | Path | Body |
|--------|------|------|
| GET | `/gateway/observability/webhooks` | — |
| POST | `/gateway/observability/webhooks` | `{ "url", "label?", "secret?" }` |
| PATCH | `/gateway/observability/webhooks/{id}` | `{ "enabled?", "label?" }` |
| DELETE | `/gateway/observability/webhooks/{id}` | — |
| POST | `/gateway/observability/webhooks/{id}/test` | — |

### Ví dụ tạo

```bash
curl.exe -X POST "http://localhost:3001/gateway/observability/webhooks" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://example.com/hooks/gateway\",\"label\":\"staging\",\"secret\":\"whsec_...\"}"
```

Secret được mã hóa trên gateway (cùng crypto BYOK). API không trả secret thô — chỉ hint kiểu `whsec_…ab12`.

## Payload event

`POST` JSON:

```json
{
  "type": "job.completed",
  "timestamp": "2026-09-12T02:00:00.000Z",
  "data": {
    "jobType": "image",
    "modelSlug": "flux-schnell",
    "jobId": "abc123",
    "resultUrl": "https://…",
    "coverUrl": "https://…",
    "status": "success"
  }
}
```

`job.failed` có `status: "failed"` và `error` (nếu có).

Header:

| Header | Giá trị |
|--------|---------|
| `Content-Type` | `application/json` |
| `User-Agent` | `ai-gateway-observability/1.0` |
| `X-Gateway-Event` | Loại event |
| `X-Gateway-Timestamp` | ISO timestamp trong body |
| `X-Gateway-Signature` | HMAC-SHA256 hex của `{timestamp}.{rawBody}` khi có signing secret |

Xác minh:

```text
expected = HMAC_SHA256(secret, timestamp + "." + rawRequestBody)
```

So sánh với `X-Gateway-Signature` (constant-time).

## Biến môi trường

| Biến | Mặc định |
|------|----------|
| `OBSERVABILITY_STORE_FILE` | `data/observability-webhooks.json` |
| `OBSERVABILITY_MAX_WEBHOOKS` | `5` |
| `OBSERVABILITY_DELIVERY_TIMEOUT_MS` | `10000` |

## Gợi ý tích hợp

Để nhận kết quả job **tin cậy** hôm nay:

1. Ưu tiên **`wait: true`** trên `POST /gateway/jobs/{type}` và xử lý response HTTP, **hoặc**
2. Poll client (3.5s, ~80 lần) như [integration modes](../routing/integration-modes.md), **tuỳ chọn**
3. Thêm webhook beta như tín hiệu **phụ** khi dùng `wait: true` hoặc kết quả tức thì `wait: false`.

**Không** chỉ dựa webhook cho job async `wait: false` cho đến khi có delivery nền.

## UI

Quản lý webhook: [Observability](/vi/app/observability/) (sidebar **Developer → Observability**, badge **beta**). Callout trên trang liệt kê cùng giới hạn.

Xem thêm [Lịch sử usage](./usage.md) và [Media & jobs](./media.md).
