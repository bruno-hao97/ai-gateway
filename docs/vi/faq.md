---
title: FAQ
description: Câu hỏi thường gặp về AI Gateway
---

# FAQ

Câu hỏi phổ biến về AI Gateway và Gommo upstream.

## Bắt đầu

<details>
<summary>AI Gateway khác gì gọi Gommo trực tiếp?</summary>

**Direct (Mode A):** backend gọi `v2.api.gommo.net` và `api.gommo.net`.  
**Gateway:** một base URL — REST `/gateway/*` (Mode B) hoặc path proxy (Mode C). Ẩn URL upstream, tập trung env, poll tùy chọn `wait: true`, billing Gommo VietQR.

</details>

<details>
<summary>Cần gì để chạy local?</summary>

- Node.js 18+
- `cp .env.example .env` và set `GOMMO_API_DOMAIN`
- `npm install` && `npm run dev` → `http://localhost:3001`
- Docs: `npm run docs:dev` → `http://localhost:5173`
- Tùy chọn: credential user Gommo cho [Quickstart](./quickstart.md)

</details>

<details>
<summary>API playground ở đâu?</summary>

[/vi/app/playground/](/vi/app/playground/) — đăng nhập trên docs; playground nhúng portal và tự truyền token.

Dev: docs `:5173`, API gateway `:3001`.

</details>

## Authentication

<details>
<summary>Lấy user token thế nào?</summary>

`POST /api/apps/go-mmo/auth/login` với `email`, `password`, `domain` (domain đăng ký). Response: `access_token`. Xem [Authentication](./authentication.md).

</details>

<details>
<summary>Có cần gửi domain mọi call /gateway?</summary>

**Mode B:** tùy chọn — gateway dùng `GOMMO_API_DOMAIN` từ env server.  
**Mode C / Direct:** gửi `domain` trong form body trùng domain đăng ký user.

</details>

<details>
<summary>Merchant token là gì?</summary>

`GOMMO_ACCESS_TOKEN` trong `.env` server — cho `/admin/*` và fulfillment PayOS legacy. Không bắt buộc cho nạp Gommo VietQR mặc định. Không đưa vào browser.

</details>

## Models & jobs

<details>
<summary>Job fail vì ratio/mode không hợp lệ?</summary>

Bạn đoán tham số. Luôn list models trước và dùng giá trị từ catalog. Xem [Models](./models/).

</details>

<details>
<summary>Poll mất bao lâu?</summary>

Gateway **3.5s** interval, **80** lần (~4.7 phút max) khi `wait: true`. Video thường 1–5 phút.

</details>

<details>
<summary>Gommo có webhook khi job xong không?</summary>

Không — client hoặc gateway phải poll job status.

</details>

## API & modes

<details>
<summary>Mode B vs Mode C — chọn cái nào?</summary>

- **Mode B** — tích hợp mới, JSON, lỗi có cấu trúc, `wait` tùy chọn.
- **Mode C** — FE sẵn dùng path Gommo; đổi code tối thiểu.

Xem [Integration modes](./routing/integration-modes.md).

</details>

<details>
<summary>REST trả lỗi dạng gì?</summary>

```json
{ "success": false, "message": "…", "code": "VALIDATION_ERROR" }
```

</details>

## Billing

<details>
<summary>Nạp credit thế nào?</summary>

**Mặc định:** Gommo VietQR — `POST /billing/payment/create` (Bearer user), rồi poll `POST /billing/payment/sync` đến khi `paid: true`. Portal: [/vi/app/credits/](/vi/app/credits/). Recipe: [Gommo topup](./cookbook/gommo-topup.md).

**Legacy (tùy chọn):** PayOS qua `POST /billing/topup/create` khi đã cấu hình `PAYOS_*` và merchant. Xem [PayOS nạp credit (legacy)](./cookbook/payos-topup.md).

</details>

<details>
<summary>Billing lỗi hoặc trả lỗi — kiểm tra gì?</summary>

Gọi `GET /billing/status` — flow mặc định cần `billingMode: "gommo"` và `gommoPayment: true`.

Lỗi thường gặp:

- Bearer không khớp `username` trong body
- `packageId` không hợp lệ
- PayOS legacy: `payosConfigured` hoặc `merchantReady` là false

</details>

<details>
<summary>/billing/topup/create trả 503?</summary>

Path này chỉ dành cho **PayOS legacy**. PayOS hoặc merchant env chưa cấu hình. Tích hợp mới nên dùng `POST /billing/payment/create`. Kiểm tra `GET /billing/status`.

</details>

<details>
<summary>Billing bắt buộc để dùng /gateway?</summary>

Không — billing là nạp tùy chọn. User cần credit Gommo (tài khoản upstream hoặc topup).

</details>

## MCP & Cursor {#mcp-cursor}

<details>
<summary>Nên dùng MCP nào trong Cursor?</summary>

**Khuyên dùng:** **[79ai remote MCP](./mcp/other-hosts.md)** — 10 tools, token [/vi/app/token/](/vi/app/token/). JSON cho Cursor, Claude, ChatGPT và [host khác](/vi/mcp/other-hosts.md).

**App production:** HTTP [`/gateway/*`](/vi/routing/endpoint-map.md).

**Tùy chọn:** [Self-hosted](/vi/mcp/self-hosted.md) khi IDE phải gọi `GATEWAY_URL` riêng.

</details>

<details>
<summary>79ai MCP làm được gì?</summary>

**10 tools:** tài khoản/credit, catalog, tạo ảnh/video, poll status/stream, lịch sử job, thông báo. Xem [tools](/vi/mcp/tools.md) và [use cases](/vi/mcp/use-cases.md).

</details>

<details>
<summary>Dùng 79ai MCP ngoài Cursor được không?</summary>

**Có** — client MCP hỗ trợ remote `url` + headers. [Host khác](/vi/mcp/other-hosts.md). ChatGPT/Gemini web không dùng MCP — dùng HTTP.

</details>

<details>
<summary>Token /app/token/ có dùng được 79ai MCP không?</summary>

Có. Đăng nhập/đăng ký trả **`access_token` user Gommo**. Dùng trong header 79ai MCP (`Gommo-Token` + `Authorization: Bearer …`) và `Authorization: Bearer …` cho HTTP `/gateway/*` trong app.

</details>

<details>
<summary>Có cần chạy gateway để dùng MCP?</summary>

**Không** với [79ai MCP](/vi/mcp/other-hosts.md) — tool gọi MCP host sẵn của Gommo.

**Có** chỉ với [self-hosted MCP](/vi/mcp/self-hosted.md) (`@ai-gateway/mcp-server` + `GATEWAY_URL`).

</details>

<details>
<summary>@ai-gateway/mcp-server là gì?</summary>

Package tùy chọn cho merchant muốn tool Cursor gọi **gateway URL riêng** thay vì 79ai remote MCP. Xem [Self-hosted](/vi/mcp/self-hosted.md). Đa số user dùng 79ai MCP.

</details>

## Deploy & ops

<details>
<summary>Khi nào cần CORS?</summary>

Khi **browser app origin khác** gọi API (vd. `localhost:5175`). Không cần cho `/portal` hoặc client server-side.

Set `GATEWAY_CORS_ORIGIN` nhiều origin, phân cách dấu phẩy.

Xem [Deploy (VI)](./deploy/) và [Best practices (VI)](./best-practices/).

</details>

<details>
<summary>/portal có trên production không?</summary>

Mặc định tắt (`NODE_ENV=production`). Bật `GATEWAY_PORTAL=true` nếu chấp nhận rủi ro.

</details>

## Vẫn kẹt?

→ [Góp ý](./report-feedback.md) · [Community](./community/)
