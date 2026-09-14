---
title: BYOK (beta)
description: Hybrid Bring Your Own Key — key provider cho chat, Gommo account cho media
---

# BYOK (beta)

::: warning Beta
BYOK **chưa sẵn sàng production**. Dùng cho dev, staging hoặc gateway self-host khi bạn chấp nhận giới hạn bên dưới. Billing, fallback và hành vi provider có thể đổi mà không cần major version.
:::

**BYOK** trên gateway này là **hybrid** — khác OpenRouter (chỉ chat BYOK):

| Workload | Auth / billing | Bạn cần làm |
|----------|----------------|-------------|
| Chat (`POST /gateway/chat`, `POST /v1/chat/completions`) | **Key OpenAI / Anthropic** khi model có trong map gateway | Thêm key tại [BYOK](/vi/app/byok/) |
| Media jobs, upload, audio | **Credit Gommo** trên account **primary** đã link | Link Gommo tại [BYOK](/vi/app/byok/) |
| Phí platform (tuỳ chọn) | Ledger tích lũy + pre-check credit Gommo session | Operator set `BYOK_PLATFORM_FEE_PERCENT` trên host |

Chat **không** bill provider qua Gommo. Media **không** dùng key OpenAI/Anthropic trực tiếp.

## Bắt đầu nhanh

1. **Thêm provider key** — [BYOK → Providers](/vi/app/byok/) → OpenAI hoặc Anthropic → Lưu key → Test.
2. **Link Gommo account** — [BYOK → Gommo accounts](/vi/app/byok/) → domain (vd. `79ai.net`) → **Link current session** → đặt **primary** cho media.
3. **Gọi chat với model đã map** — dùng `model` từ [Model chat hỗ trợ](#model-chat-hỗ-trợ) (hoặc `GET /gateway/byok/status` → `supportedChatModels`).

Nếu chat báo lỗi model, có thể model **chưa** có trong `config/byok-model-map.json` — nhờ operator gateway thêm entry.

## Phạm vi hiện tại

| Khu vực | Trạng thái | Ghi chú |
|---------|------------|---------|
| Chat BYOK OpenAI | **Beta** | `/gateway/chat`, `/v1/chat/completions` |
| Chat BYOK Anthropic | **Beta** | Cùng route khi map dùng `anthropic` |
| Link Gommo account | **Beta** | Primary cho media/upload/audio |
| Fallback sang Gommo | **Beta** | Bật/tắt theo key; mặc định `BYOK_DEFAULT_SHARED_FALLBACK` |
| Ledger phí platform | **Beta** | Theo dõi + pre-check; chưa tương đương OpenRouter |
| Tab Usage | **Beta** | 7 ngày BYOK vs platform |

**Chưa hỗ trợ:**

- BYOK cho media/image/video/TTS (luôn qua Gommo)
- Tự map model từ catalog (operator sửa file JSON)
- Sync credential multi-instance (file trên host gateway)
- Đối soát bill provider với hoá đơn OpenAI/Anthropic

## Model chat hỗ trợ

Operator duy trì `config/byok-model-map.json` (override `BYOK_MODEL_MAP_FILE`). Mỗi entry map **gateway model id** → provider + upstream model.

Map mặc định (host của bạn có thể khác):

| Gateway model | Provider | Upstream model | Gommo server |
|---------------|----------|----------------|--------------|
| `gpt-4o` | openai | `gpt-4o` | cheap |
| `gpt-4o-mini` | openai | `gpt-4o-mini` | cheap |
| `gpt-5.5` | openai | `gpt-4o` | cheap |
| `claude-3-5-sonnet` | anthropic | `claude-3-5-sonnet-20241022` | cheap |
| `claude-3-5-haiku` | anthropic | `claude-3-5-haiku-20241022` | cheap |

Danh sách live cho session:

```bash
curl.exe "http://localhost:3001/gateway/byok/status" ^
  -H "Authorization: Bearer USER_TOKEN"
```

Field: `data.supportedChatModels[]` gồm `gatewayModelId`, `byokProvider`, `upstreamModel`, tuỳ chọn `gommoServer`.

Trường model có thể kèm server: `gpt-4o::cheap` — xem [Chat](/vi/reference/chat).

## Fallback

Mỗi provider key có **Fallback** (UI) = `sharedFallback`:

| Cài đặt | Khi gọi BYOK provider lỗi |
|---------|---------------------------|
| **Fallback bật** | Gateway thử lại bằng **credit Gommo session** (platform) |
| **Fallback tắt** | Trả lỗi provider — không trừ credit Gommo cho chat đó |

Mặc định key mới: `BYOK_DEFAULT_SHARED_FALLBACK` (default `true`).

## Phí platform (beta)

Khi gateway set `BYOK_PLATFORM_FEE_PERCENT` và/hoặc `BYOK_PLATFORM_FEE_PER_REQUEST`:

- Request chat BYOK thành công **tích lũy** phí vào `data/byok-fee-ledger.json`
- Trước BYOK, gateway kiểm **phí tích lũy + ước tính** với **credit Gommo session** trên domain request
- Không đủ → **`402 INSUFFICIENT_CREDITS`** — nạp tại [Credits](/vi/app/credits/)

Trang BYOK hiển thị **Phí platform %**, **Phí tích lũy**, **Credit platform** (số dư session). Phí tích lũy là **ledger trên host** — chưa settlement đầy đủ như billing production.

## Lưu credential

- Secret provider và token Gommo được **mã hoá at rest** (`BYOK_ENCRYPTION_KEY` bắt buộc production)
- File store: `BYOK_STORE_FILE` (default `data/byok-store.json`)
- API chỉ trả **hint** — không trả secret thô

## API quản lý

Mọi route cần `Authorization: Bearer` (cùng token `/gateway/*`).

| Method | Path | Body / ghi chú |
|--------|------|----------------|
| GET | `/gateway/byok/status` | enabled, beta, phí, providers, `supportedChatModels`, primary Gommo |
| GET | `/gateway/byok/credentials?kind=provider\|gommo` | Danh sách credential |
| POST | `/gateway/byok/credentials` | `{ "providerSlug", "secret", "label?", "sharedFallback?" }` |
| PATCH | `/gateway/byok/credentials/{id}` | `{ "label?", "sharedFallback?", "disabled?" }` |
| DELETE | `/gateway/byok/credentials/{id}` | — |
| POST | `/gateway/byok/credentials/{id}/test` | Kiểm tra key hoặc link Gommo |
| POST | `/gateway/byok/gommo-accounts` | `{ "domain", "label?", "setPrimary?" }` — dùng session token trừ khi có `access_token` |
| PATCH | `/gateway/byok/gommo-accounts/{id}/primary` | Đặt primary cho media |
| GET | `/gateway/byok/usage?days=7&limit=20` | Tổng hợp BYOK vs platform + events |

SDK TypeScript: `client.byok.status()`, `createCredential()`, `linkGommoAccount()`, `usage()` — xem [TypeScript SDK](/vi/sdk/typescript/).

### Ví dụ link Gommo

```bash
curl.exe -X POST "http://localhost:3001/gateway/byok/gommo-accounts" ^
  -H "Authorization: Bearer USER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"domain\":\"79ai.net\",\"label\":\"my-site\",\"setPrimary\":true}"
```

Dùng **session token hiện tại** cho domain đó trừ khi body có `access_token` (tích hợp server-side).

## Biến môi trường

| Biến | Default | Mục đích |
|------|---------|----------|
| `BYOK_ENABLED` | `true` | Bật/tắt BYOK |
| `BYOK_BETA` | `true` | Nhãn beta portal/API |
| `BYOK_ENCRYPTION_KEY` | — | Bắt buộc production |
| `BYOK_STORE_FILE` | `data/byok-store.json` | Store credential |
| `BYOK_MODEL_MAP_FILE` | `config/byok-model-map.json` | Routing chat |
| `BYOK_DEFAULT_SHARED_FALLBACK` | `true` | Fallback mặc định key mới |
| `BYOK_PLATFORM_FEE_PERCENT` | `0` | % phí theo token |
| `BYOK_PLATFORM_FEE_PER_REQUEST` | `0` | Phí tối thiểu/request |
| `BYOK_PLATFORM_FEE_MIN_CREDITS` | `0` | Sàn mỗi lần tính phí |
| `BYOK_FEE_LEDGER_FILE` | `data/byok-fee-ledger.json` | Ledger phí |
| `BYOK_PROVIDERS` | `openai,anthropic` | Provider slug bật |

## UI

Quản lý tại [BYOK](/vi/app/byok/) (sidebar **Developer → BYOK**, badge **beta**). Callout và quick-start trên trang khớp tài liệu này.

### Smoke test checklist

Thủ công (đã đăng nhập, `npm run docs:stack`):

- [ ] **Providers** → lưu key → thông báo xanh
- [ ] **Test** key → thành công hoặc lỗi đỏ
- [ ] **Xóa** → confirm → credential bị xóa
- [ ] **Gommo** → link session → badge primary
- [ ] Tab **Usage** → badge OK/Lỗi; link **Activity**
- [ ] Quick links: Chat, Chat API, Access token, Activity

Xem thêm [Chat](/vi/reference/chat), [Media & jobs](/vi/reference/media), [Authentication](/vi/authentication).
