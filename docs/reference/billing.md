# Billing (PayOS)

Tách khỏi `/gateway` — nạp credit qua PayOS, webhook PAID → cộng credit Gommo (internal `sendBalances`).

## Env

| Variable | Mục đích |
|----------|----------|
| `PAYOS_CLIENT_ID` | PayOS |
| `PAYOS_API_KEY` | PayOS |
| `PAYOS_CHECKSUM_KEY` | PayOS + verify webhook |
| `PAYOS_WEBHOOK_URL` | URL đăng ký my.payos.vn → `https://api…/billing/webhook/payos` |
| `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` | Sau thanh toán |
| `TOPUP_ORDERS_FILE` | JSON map orderCode → username (default `data/topup-orders.json`) |

Merchant: `GOMMO_ACCESS_TOKEN` (giống `/admin`).

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/billing/status` | — |
| GET | `/billing/packages` | — |
| POST | `/billing/topup/create` | `Authorization: Bearer` user |
| GET | `/billing/topup/orders/:orderCode` | — |
| GET/POST | `/billing/webhook/payos` | PayOS signature |

## Tạo đơn nạp

```bash
curl.exe -X POST "http://localhost:3001/billing/topup/create" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"gommo_user\",\"packageId\":\"basic-member\"}"
```

Response: PayOS checkout URL + `orderCode`. Order lưu `username` + `credits` — map webhook → Gommo user.

## Webhook flow

1. PayOS POST `/billing/webhook/payos` — verify signature
2. `status=PAID` → lookup order by `orderCode`
3. Internal `sendCreditsToUser()` (không qua `x-admin-key`)
4. Order → `credited`

## Gói credit

Xem `GET /billing/packages` hoặc `src/services/creditPackages.ts`.
