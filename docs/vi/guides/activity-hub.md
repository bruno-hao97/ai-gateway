---
title: Activity hub
description: Phân tích usage, khám phá job và billing trong developer portal
---

# Activity hub

Mở **[Activity](/vi/app/activity/)** trong portal để xem analytics usage (cùng nguồn Gommo `usage-history` với preview trên Profile).

## Các tab

| Tab | Mục đích |
|-----|----------|
| **Overview** | KPI, biểu đồ, top models, job gần đây |
| **Trends** | Biểu đồ credit/kết quả + bảng tổng hợp theo ngày |
| **Explore** | Log job có tìm kiếm; click dòng để xem chi tiết |
| **Billing** | Đơn nạp credit và link nhanh sang Credits |

## Tham số URL

Chia sẻ hoặc bookmark view bằng query:

| Param | Giá trị | Mặc định |
|-------|---------|----------|
| `tab` | `trends`, `explore`, `billing` | Overview (bỏ param) |
| `period` | `7d`, `30d`, `90d` | `30d` |
| `model` | Slug model | Chỉ Explore; lọc danh sách job |
| `job` | `id_base` job | Chỉ Explore; mở modal chi tiết job |
| `type` | `image`, `video`, `audio`, `music` | Chỉ Explore; lọc theo loại job |
| `q` | Từ khóa tìm | Chỉ Explore; lọc model/prompt (client-side, quét tối đa 30 trang log) |

Ví dụ:

- Overview 30 ngày: `/vi/app/activity/`
- Trends 90 ngày: `/vi/app/activity/?tab=trends&period=90d`
- Explore một model: `/vi/app/activity/?tab=explore&model=imagegen_2_0&period=30d`
- Explore job video: `/vi/app/activity/?tab=explore&type=video&period=30d`
- Tìm kiếm + loại: `/vi/app/activity/?tab=explore&type=video&q=cat`

Click **Top models** trên Overview để sang Explore với filter model tương ứng. **Copy link** trong modal job để chia sẻ URL `?job=`. **Xuất CSV** trên Overview tải tối đa 1.000 job theo period đang chọn.

Trên Explore, bộ lọc active hiện chip (model, type, search). Tìm kiếm (`q`) tự quét thêm trang log (tối đa 30 trang) trước khi báo không có kết quả.

## API

Biểu đồ portal gọi gateway — xem [Lịch sử usage](/vi/reference/usage.md):

- `POST /gateway/usage/stats` — tổng hợp và chart
- `POST /gateway/usage/logs` — danh sách job phân trang
- `POST /gateway/usage/aggregate` — top models phía server (`groupBy=model`)

Xem thêm [Billing & credits](./billing-credits.md) và [Authentication](/vi/authentication.md).

## Smoke test checklist

Sau khi sửa Activity hub hoặc API usage:

```bash
npm run theme:test
npm run test:aggregate
```

Thủ công (đã login, `npm run docs:stack`):

- [ ] Overview → đổi period → KPI/chart cập nhật; **Làm mới** bỏ cache top models (`from_cache` không còn trong Network → `usage/aggregate`)
- [ ] **Xuất CSV** chọn loại → tên file có suffix type khi không phải “Tất cả”
- [ ] **Theo loại job** → click label → Explore có `?type=`
- [ ] Top models → Explore có `?model=`
- [ ] Tab Billing → link giữ `?period=`; Observability mở đúng
- [ ] Explore → chip filter + `?type=` / `?q=`; **Xóa tất cả bộ lọc** khi trống
- [ ] Click job → modal; **Copy link** mỗi job `?job=` khác nhau
- [ ] `npm run theme:test` — pass hết
