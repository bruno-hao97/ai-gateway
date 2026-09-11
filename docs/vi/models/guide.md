---
title: Hướng dẫn tích hợp
description: Catalog model Gommo qua AI Gateway
---

# Hướng dẫn tích hợp Models

::: tip Public API trước
Tích hợp qua [Gommo public API](../reference/gommo-public-api.md) — `GET https://v2.api.gommo.net/ai/models?type=…`. Gateway `/gateway/models` chỉ dùng khi dev local.
:::

Gommo host catalog model. Flow:

1. **List models** theo [job type](./job-types.md)
2. **Chọn `modelSlug`** và [parameters](./parameters.md) từ response
3. **Create job** — không đoán field
4. **Poll** — `wait: true` hoặc poll client

Xem catalog live tại [tab Models](/vi/models/).

## List models (Mode B)

**Bearer tùy chọn** — browse public. Tạo job vẫn cần auth.

```http
GET /gateway/models?type=image
```

Chi tiết → [Media reference](../reference/media.md).

## Tiếp theo

→ [Job types](./job-types.md) · [Parameters](./parameters.md) · [Quickstart](../quickstart.md)
