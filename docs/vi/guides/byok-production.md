---
title: BYOK production checklist
description: Triển khai BYOK hybrid an toàn — mã hóa, persistence, model map, smoke test
---

# BYOK production checklist

Dùng sau [BYOK reference](/vi/reference/byok.md) khi chuyển từ dev/staging sang gateway **production self-host / single-instance**.

::: warning Beta
BYOK vẫn **beta** — checklist giảm rủi ro vận hành; không gỡ giới hạn beta (file store, fee ledger, sửa model map thủ công).
:::

## 1. Encryption key (bắt buộc)

Production **phải** set `BYOK_ENCRYPTION_KEY` khi `BYOK_ENABLED=true` (mặc định). Gateway **không start** nếu thiếu khi `NODE_ENV=production`.

Tạo key 32 byte:

```bash
npm run byok:generate-key
# hoặc: openssl rand -base64 32
```

Set trên host (secrets Railway/Fly, Docker env — không commit):

```env
NODE_ENV=production
BYOK_ENCRYPTION_KEY=<paste-base64-key>
```

**Cũng dùng cho:** hàng đợi poll Observability (`data/observability-background-polls.json`).

::: danger Xoay key
Đổi `BYOK_ENCRYPTION_KEY` làm invalid dữ liệu mã hóa trong `byok-store.json` và poll queue. Cần kế hoạch migrate hoặc lưu lại credential sau khi xoay key.
:::

## 2. Volume persistence

Mount hoặc backup các path trên gateway:

| File | Mục đích |
|------|----------|
| `data/byok-store.json` | Key provider + token Gommo (mã hóa) |
| `data/byok-usage.jsonl` | Sự kiện usage BYOK |
| `data/byok-fee-ledger.json` | Phí platform (nếu bật fee) |
| `config/byok-model-map.json` | Route model chat |

**Một instance:** file store OK. **Nhiều replica:** share file (NFS/EFS) **hoặc** một instance gateway cho BYOK.

## 3. Environment

| Biến | Ghi chú production |
|------|---------------------|
| `BYOK_ENCRYPTION_KEY` | **Bắt buộc** |
| `BYOK_STORE_FILE` | Path trên disk persistent |
| `BYOK_MODEL_MAP_FILE` | Commit trong image hoặc mount volume |
| Các biến khác | Xem [BYOK reference](/vi/reference/byok.md) |

Xem [Deploy](/vi/deploy/) cho `GATEWAY_CORS_ORIGIN`, `ADMIN_API_KEY`, `GOMMO_*`.

## 4. Model map

1. Sửa `config/byok-model-map.json`.
2. Mỗi entry: `gatewayModelId` → provider + upstream model.
3. Restart sau khi đổi map.
4. Verify: `GET /gateway/byok/status` → `supportedChatModels`.

## 5. Portal + CORS

- Portal `/app/byok/` cần docs build với `VITE_GATEWAY_URL` → API production.
- Origin khác API → `GATEWAY_CORS_ORIGIN`.

## 6. Smoke test (production)

Đã login trên portal deploy:

- [ ] **Providers** → lưu key → Test OK
- [ ] **Gommo** → link → primary
- [ ] **Chat** → model BYOK → tin nhắn OK; Usage tab có event
- [ ] **Media** → job ảnh vẫn dùng credit Gommo
- [ ] Restart gateway → key vẫn dùng được

```bash
npm run test:byok
```

## 7. Backup & recovery

- Backup định kỳ: `byok-store.json`, usage, fee ledger, model map.
- Restore: stop → restore file → **cùng** `BYOK_ENCRYPTION_KEY` → start.

## 8. Monitoring

- Log `402` khi thiếu credit (platform fee).
- `GET /health` — `byokEnabled`, `byokBeta`.

## Liên quan

- [BYOK reference](/vi/reference/byok.md)
- [Portal smoke test](/vi/guides/portal-smoke.md)
- [Deploy](/vi/deploy/)
