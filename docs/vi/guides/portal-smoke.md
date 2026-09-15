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
npm run portal:smoke   # HTTP 200 + HTML (cần docs:stack)
```

## Overview (`/app/`)

- [ ] Hero: **Open Playground**, **Activity**, **Copy token**
- [ ] Widget Usage (7 ngày) tải; recent jobs click → Explore + modal job
- [ ] **Workspace**: Activity, Access token, Credits, BYOK, Files, Observability
- [ ] Pill **credits** header / sidebar → `/app/credits/`
- [ ] **Resources**: Quickstart, MCP, Authentication, **Portal smoke test** (trang này)

## Playground (`/app/playground/`)

Embed full-screen — không có sidebar/header app. Xem [API Playground](/vi/reference/playground.md).

- [ ] Hero Overview **Open Playground** → `/app/playground/`
- [ ] Iframe tải (mặc định **Create image**); không kẹt loading
- [ ] Đã login → playground nhận token (Connection OK / list models)
- [ ] **List models** → chọn model + ratio từ catalog
- [ ] **Image job** bật **wait** → có `resultUrl` / preview
- [ ] Sau **SUCCESS**, chuyển **REQUEST** / **ENDPOINTS** / **AI GUIDE** — tab giữ nguyên (poll không kéo về **RESULT**)
- [ ] URL đổi khi đổi worker (`?worker=create-video`, …)
- [ ] Link **Playground** từ [Models](/vi/models/) → `?model=` điền sẵn
- [ ] Tuỳ chọn: Observability **Local mirror** bật → có dòng job sau chạy

## Chat (`/app/chat/`)

- [ ] Banner số dư thấp khi credits &lt; ngưỡng
- [ ] Hint BYOK khi gateway có model map — link **Mở BYOK**
- [ ] Hint đổi khi chọn model BYOK (đã lưu provider key)
- [ ] Model picker có badge **BYOK** trên model map

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
- [ ] Job `wait: false` async + webhook → delivery sau poll nền (`data.background: true`)
- [ ] Tuỳ chọn live: `npm run observability:verify-background` — xem [Observability reference](/vi/reference/observability.md)

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
npm run portal:smoke
node scripts/verify-request-tab.mjs   # pin tab Playground (cần docs:stack)
npm run observability:verify-background   # job async + webhook live (cần token trong .env)
```
