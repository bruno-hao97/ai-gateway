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
**Gateway:** một base URL — REST `/gateway/*` (Mode B) hoặc path proxy (Mode C). Ẩn URL upstream, tập trung env, poll tùy chọn `wait: true`, billing PayOS.

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

Chỉ dev: **http://localhost:3001/portal/** — cùng origin API, không cần CORS.

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

`GOMMO_ACCESS_TOKEN` trong `.env` server — cho `/admin/*` và fulfillment billing. Không đưa vào browser.

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
<summary>/billing/topup/create trả 503?</summary>

PayOS hoặc merchant env chưa cấu hình. Kiểm tra `GET /billing/status`.

</details>

<details>
<summary>Billing bắt buộc để dùng /gateway?</summary>

Không — billing là nạp tùy chọn. User cần credit Gommo (tài khoản upstream hoặc topup).

</details>

## MCP & Cursor

<details>
<summary>Dùng Cursor gommo_* MCP thay gateway được không?</summary>

MCP tools trong Cursor cho **hỗ trợ IDE**, không phải API production. Xem [MCP & agents](./mcp.md).

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
