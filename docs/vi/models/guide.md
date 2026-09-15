---
title: Hướng dẫn tích hợp
description: Catalog model Gommo — tích hợp qua public API
---

# Hướng dẫn tích hợp Models

Tích hợp qua [Gommo public API](../reference/gommo-public-api.md) trên **`https://v2.api.gommo.net`**. Auth: `Authorization: Bearer <access_token>`. Form body gồm **`domain`** (domain đăng ký, vd. `79ai.net`).

Gommo host catalog model. Mọi tích hợp media theo cùng flow:

1. **List models** theo [job type](./job-types.md)
2. **Chọn `model` / slug** và [parameters](./parameters.md) cho phép từ response
3. **Create job** — không đoán field
4. **Poll** — client poll mỗi **3.5s**, tối đa **80** lần (~5 phút)

Xem catalog live tại [tab Models](/vi/models/).

## List models (khuyến nghị)

```http
POST https://v2.api.gommo.net/ai/models?type=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

type=image&domain=79ai.net
```

Ví dụ request đầy đủ → [Media & jobs reference](../reference/media.md).

## Tạo job

Dùng model id từ catalog (field có thể là `model`, `slug`, hoặc `id_base` trong response):

```http
POST https://v2.api.gommo.net/ai/jobs/image/{model_id}
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default&prompt=A product photo on white background&ratio=16:9&mode=low&resolution=2k
```

Giá trị field phải lấy từ **models list của bạn** cho **model đó** — xem [Parameters](./parameters.md).

## Polling

Gommo không webhook khi job hoàn thành. Poll đến trạng thái terminal:

```http
POST https://v2.api.gommo.net/ai/jobs/{id_base}?media=image
Authorization: Bearer {access_token}
Content-Type: application/x-www-form-urlencoded

domain=79ai.net&project_id=default
```

| Cài đặt | Giá trị |
|---------|---------|
| Interval | **3500 ms** |
| Max attempts | **80** |
| Poll `media` | `image` \| `video` \| `music` (khớp job type) |

## Tùy chọn: self-host gateway (dev)

Repo này cũng expose JSON REST tại `{gateway}/gateway/*` (`wait: true`, tự điền `domain` tùy chọn). Chỉ dùng khi self-host — xem [Integration modes](../routing/integration-modes.md#mode-b-gateway-rest).

## Tiếp theo

→ [Job types](./job-types.md) · [Parameters](./parameters.md) · [Quickstart](../quickstart.md)
