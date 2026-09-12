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

Ví dụ:

- Overview 30 ngày: `/vi/app/activity/`
- Trends 90 ngày: `/vi/app/activity/?tab=trends&period=90d`
- Explore một model: `/vi/app/activity/?tab=explore&model=imagegen_2_0&period=30d`

Click **Top models** trên Overview để sang Explore với filter model tương ứng.

## API

Biểu đồ portal gọi gateway — xem [Lịch sử usage](/vi/reference/usage.md):

- `POST /gateway/usage/stats` — tổng hợp và chart
- `POST /gateway/usage/logs` — danh sách job phân trang
- `POST /gateway/usage/aggregate` — top models phía server (`groupBy=model`)

Xem thêm [Billing & credits](./billing-credits.md) và [Authentication](/vi/authentication.md).
