---
title: Portal smoke test
description: Checklist end-to-end cho developer portal tại /app/
---

# Portal smoke test

Chạy sau khi sửa UI portal (`docs/.vitepress/theme/`) hoặc gateway REST mà portal gọi.

## Điều kiện

- Đã đăng nhập (`gw_access_token` trên browser)
- `npm run docs:stack` (docs `:5173` + API `:3001`) hoặc gateway remote qua `GATEWAY_PROXY_TARGET`

```bash
npm run theme:test
npm run test:aggregate
```

## Overview (`/app/`)

- [ ] Hero: **Open Playground**, **Activity**, **Copy token**
- [ ] Widget Usage (7 ngày) tải; recent jobs click → Explore + modal job
- [ ] **Workspace**: Activity, Access token, BYOK, Files, Observability
- [ ] **Resources**: Quickstart, MCP, Authentication, **Portal smoke test** (trang này)

## Chat (`/app/chat/`)

- [ ] Banner số dư thấp khi credits &lt; ngưỡng
- [ ] Hint BYOK khi gateway có model map — link **Mở BYOK**
- [ ] Hint đổi khi chọn model BYOK (đã lưu provider key)

## Activity (`/app/activity/`)

Xem [Activity hub](./activity-hub.md). Kiểm tra nhanh:

- [ ] Overview → period, Refresh, Export CSV, Usage by type → Explore
- [ ] Top models → Explore `?model=`; tooltip cache; modal `?job=` mỗi dòng
- [ ] Explore → filter, Load more, Clear all filters
- [ ] Billing → link giữ `?period=`

## Access token (`/app/token/`)

- [ ] Tab **Gateway**; Copy token; Test connection → message xanh
- [ ] Last activity → Activity Explore (khi có job)

## Files (`/app/files/`)

- [ ] Upload → thông báo thành công; **Recent uploads** còn sau reload
- [ ] Copy URL / Copy fields

## BYOK (`/app/byok/`)

Xem [BYOK reference](/vi/reference/byok.md). Kiểm tra nhanh:

- [ ] Lưu key → message xanh (không flash cả trang; chỉ **Refreshing…**)
- [ ] Test / Xóa có confirm
- [ ] Tab Usage → link Activity; badge khi đã chat BYOK

## Observability (`/app/observability/`)

Xem [Observability reference](/vi/reference/observability.md). Kiểm tra nhanh:

- [ ] Stat cards → Activity / Credits
- [ ] Webhook thêm, test, xóa; Copy JSON payload

## Credits (`/app/credits/`)

Xem [Billing & credits](./billing-credits.md). Kiểm tra nhanh:

- [ ] Banner số dư thấp khi credits &lt; ngưỡng
- [ ] KPI: số dư, tổng đã nạp, số đơn, đơn gần nhất
- [ ] Quick links → Activity Billing, Job logs, Overview, Billing docs
- [ ] Gói nạp: gói featured **accent**, còn lại **primary**; modal VietQR
- [ ] Bảng lịch sử nạp; toggle đơn chờ cũ; **Làm mới** header reload gói + đơn

## Profile (`/app/profile/`)

- [ ] Pill **7d**; link Activity cùng period
- [ ] Recent jobs → modal job Explore

## Tự động

```bash
npm run theme:test
npm run test:aggregate
```
