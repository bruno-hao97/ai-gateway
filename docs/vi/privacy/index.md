---
title: Privacy & security
description: Credential, secret, logging và bảo mật webhook PayOS
---

# Privacy & security

AI Gateway là **nền tảng API** — user xác thực bằng token Gommo; server giữ merchant và admin secret.

## Ranh giới tin cậy

```
Browser / mobile          Server (gateway)              Gommo upstream
─────────────────         ────────────────              ──────────────
User password      →      proxy login            →      api.gommo.net
User access_token  →      Bearer /gateway/*      →      v2 + platform
                          GOMMO_ACCESS_TOKEN     →      /admin, billing fulfill
                          ADMIN_API_KEY          →      bảo vệ /admin/*
                          PayOS keys             →      verify webhook
```

**Quy tắc:** secret cột server **không bao giờ** đưa ra browser, mobile, hoặc repo public.

## Loại credential

| Credential | Vị trí | Client thấy? | Dùng cho |
|------------|--------|--------------|----------|
| User `access_token` | Client (sau login) | Có — Bearer | `/gateway/*`, proxy |
| Mật khẩu user | Form login | Không lưu lâu dài | Login một lần |
| `GOMMO_ACCESS_TOKEN` | Server env | **Không** | `/admin/*`, fulfill PayOS |
| `ADMIN_API_KEY` | Server env | **Không** | `x-admin-key` trên `/admin/*` |
| PayOS keys | Server env | **Không** | Order + webhook |

→ [Authentication](../authentication.md)

## `/gateway` không expose

Mode B REST **không** trả hoặc nhận merchant token, admin key, PayOS secret.

Billing topup dùng **user Bearer** — fulfill merchant **nội bộ** gateway.

## `/admin` chỉ server

Cần `x-admin-key: {ADMIN_API_KEY}`. Không embed key trong frontend.

Thiếu `ADMIN_API_KEY` → `503 NOT_CONFIGURED`.

::: danger Không đưa vào FE
Không embed `ADMIN_API_KEY` hoặc `GOMMO_ACCESS_TOKEN` trong SPA/mobile bundle.
:::

## Bảo mật webhook PayOS

1. Client `POST /billing/topup/create` (user Bearer).
2. User thanh toán PayOS.
3. PayOS POST `/billing/webhook/payos` kèm chữ ký.
4. Gateway verify **checksum** (`PAYOS_CHECKSUM_KEY`).
5. `PAID` → gửi credit nội bộ.

- Webhook URL phải **HTTPS public**.
- Đăng ký URL trên [PayOS dashboard](https://my.payos.vn).

→ [Billing & credits](../guides/billing-credits.md)

## Logging

**Nên log:** method, path, status, error `code`.

**Không log:** merchant/admin/PayOS secret, password, full Authorization header prod.

## CORS và browser

CORS **tắt mặc định**. Bật bằng `GATEWAY_CORS_ORIGIN` — chỉ origin được liệt kê.

Token user trong browser là trách nhiệm app — HTTPS, logout an toàn.

## Portal production

`/portal/` **tắt** khi `NODE_ENV=production` trừ `GATEWAY_PORTAL=true`.

## Vệ sinh env

| Thực hành | Lý do |
|-----------|-------|
| Không commit `.env` | Tránh lộ secret |
| Dùng secrets platform prod | Rotate dễ |
| Rotate token nếu lỡ lộ | Giảm thiệt hại |

## Buffer merchant

Sau `sendBalances`, merchant Gommo cần **> 500.000 credits**. Env `TOPUP_MERCHANT_BUFFER_CREDITS` (mặc định 300k).

## Báo lỗi bảo mật

→ [Góp ý](../report-feedback.md) — ghi **security**; không dán token public.

## Tiếp theo

→ [Best practices](../best-practices/) · [Deploy](../deploy/)
