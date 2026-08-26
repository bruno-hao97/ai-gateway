---
title: Hướng dẫn tích hợp
description: Catalog model Gommo qua AI Gateway
---

# Hướng dẫn tích hợp Models

AI Gateway không host model weights — **proxy catalog Gommo**. Flow:

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
