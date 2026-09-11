---
title: Changelog
description: Cập nhật tài liệu và nền tảng AI Gateway
---

# Changelog

Thay đổi đáng chú ý trên docs, portal và gateway REST.

## 2026-03-11

### Docs

- Tìm kiếm local, **Sửa trên GitHub**, link GitHub trên nav
- Diagram routing ASCII trên [Nguyên tắc](./principles.md) và [Routing](./routing/) (gỡ Mermaid — lỗi `fastdom` ESM trong dev)
- Mục **Chọn lộ trình** trên [Quickstart](./quickstart.md)
- Style prose cho bảng, callout và code block

### Playground (portal)

- Tab Request: URL public đầy đủ, preview JSON body, mẫu response structure
- Ghim tab khi poll job (giữ Request / Endpoints trong lúc poll)

---

::: info Phụ thuộc upstream
Job media, catalog và login cần **Gommo public API** (`v2.api.gommo.net`, `api.gommo.net`). Khi upstream sập, docs và UI vẫn dùng được; call API live sẽ fail đến khi dịch vụ hồi.
:::
