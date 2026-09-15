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
| `POST /gateway/jobs/{type}` với **`wait: false`** | `job.completed` hoặc `job.failed` | **Tức thì** khi create có result URL; **poll nền** (~3.5s × 80) khi async và tài khoản có webhook job (`background: true` trong payload) |
| `POST /gateway/observability/webhooks/{id}/test` | `webhook.test` | Test thủ công từ UI hoặc API |

`{type}` giống [Media & jobs](./media.md) (`image`, `video`, `tts`, `music`, …).

**Chưa hỗ trợ (không webhook):**

- Job async `wait: false` khi tài khoản **chưa** đăng ký webhook job (không poll nền)
- Chat (`/gateway/chat/*`, BYOK chat)
- Audio, upload thuần, proxy `/v2` / `/ai`
- Billing, credit, login

**Cơ chế gửi:**

- **Retry** khi lỗi mạng hoặc HTTP ≠ 2xx — mặc định **3 lần** (`OBSERVABILITY_DELIVERY_RETRY_COUNT=2` retry sau lần đầu, backoff tuyến tính `OBSERVABILITY_DELIVERY_RETRY_DELAY_MS`)
- Timeout 10s / lần gửi (`OBSERVABILITY_DELIVERY_TIMEOUT_MS`)
- Cấu hình lưu **file JSON local** trên gateway (`data/observability-webhooks.json`) — không replicate giữa nhiều instance trừ khi bạn share file
- Hàng đợi poll nền job `wait=false` lưu tại `data/observability-background-polls.json` (token user mã hóa — cùng key BYOK); **resume** khi gateway restart
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
| `OBSERVABILITY_BACKGROUND_POLL` | `true` — poll server cho job async `wait: false` khi owner có webhook |

## Gợi ý tích hợp

Để nhận kết quả job **tin cậy** hôm nay:

1. Ưu tiên **`wait: true`** trên `POST /gateway/jobs/{type}` và xử lý response HTTP, **hoặc**
2. Poll client (3.5s, ~80 lần) như [integration modes](../routing/integration-modes.md), **tuỳ chọn**
3. Thêm webhook beta như tín hiệu **phụ** — gồm delivery nền cho `wait: false` khi đã cấu hình webhook.

Delivery nền cùng giới hạn poll gateway (không retry queue, file store single-instance). Production quan trọng vẫn nên `wait: true` hoặc poll client.

## UI

Quản lý webhook: [Observability](/vi/app/observability/) (sidebar **Developer → Observability**, badge **beta**). Callout trên trang liệt kê cùng giới hạn.

### Verify background tự động (live)

Cần gateway chạy, Bearer user và credit cho một job ảnh nhỏ:

```bash
# .env: OBSERVABILITY_VERIFY_TOKEN=<access_token từ /ai/login>
# (hoặc GATEWAY_VERIFY_TOKEN / BILLING_VERIFY_TOKEN)
npm run observability:verify-background
```

Script: receiver local → đăng ký webhook → `POST /gateway/jobs/image` `wait: false` → đợi event `data.background: true` → xóa webhook.

Thoát **SKIP** nếu model trả kết quả ngay (sync). Chọn `ratio` / `resolution` / `mode` từ catalog (không đoán). Env tuỳ chọn: `OBSERVABILITY_VERIFY_GATEWAY_URL`, `OBSERVABILITY_VERIFY_MODEL_SLUG`, `OBSERVABILITY_VERIFY_TIMEOUT_MS` (mặc định 6 phút).

### Smoke test checklist

Thủ công (đã đăng nhập, `npm run docs:stack`):

- [ ] Stat cards → Activity Trends, Explore, Credits
- [ ] Thêm webhook → thông báo thành công; hiển thị `n/5`
- [ ] **Test** → thông báo thành công; badge delivery cập nhật OK/Lỗi
- [ ] **Xóa** → hộp thoại xác nhận; webhook bị xóa
- [ ] Mở **Ví dụ payload** → **Copy JSON** hoạt động
- [ ] Đủ 5 webhook → form bị disable + hint giới hạn
- [ ] Tuỳ chọn live: `npm run observability:verify-background` (xem trên)

Xem thêm [Lịch sử usage](./usage.md) và [Media & jobs](./media.md).
