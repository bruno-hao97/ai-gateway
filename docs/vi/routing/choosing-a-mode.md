---
title: Choosing a mode
description: Hướng dẫn chọn Direct vs REST vs Proxy
---

# Choosing a mode

Chọn mode một lần cho mỗi client. Có thể mix mode giữa các app — cùng token và catalog.

## Decision tree

```
Đã có FE Gommo dùng /v2 và /api/v2?
├─ CÓ → Mode C (chỉ đổi base URL)
└─ KHÔNG
    ├─ Muốn JSON, lỗi có cấu trúc, wait: true?
    │   ├─ CÓ → Mode B REST (/gateway/*)
    │   └─ KHÔNG
    │       └─ Backend gọi thẳng upstream được?
    │           ├─ CÓ → Mode A Direct
    │           └─ KHÔNG → Mode B
```

## Theo use case

| Use case | Khuyến nghị | Lý do |
|----------|-------------|-------|
| SPA/mobile qua backend | **Mode B** | JSON, `wait: true`, domain server |
| FE site-ai / Gommo legacy | **Mode C** | Đổi base URL tối thiểu |
| Script batch | **Mode B** | Poll và lỗi dễ xử lý |
| Không phụ thuộc gateway | **Mode A** | Direct; tự poll |
| Playground dev | **Mode B hoặc C** | `/portal` same-origin |
| Browser cross-origin | **Mode B** + CORS | `GATEWAY_CORS_ORIGIN` |
| Agent / automation | **Mode B** | `{ code, message }` |

## Trade-offs

### Mode A

**Ưu:** Không phụ thuộc gateway.  
**Nhược:** Hai hostname; tự poll; lộ URL upstream.

### Mode B

**Ưu:** Một prefix; JSON; poll built-in; domain server.  
**Nhược:** Khác shape Gommo raw — không drop-in FE legacy.

### Mode C

**Ưu:** Drop-in FE Gommo.  
**Nhược:** Client vẫn gửi `domain`; không có `wait: true`.

## Chuyển mode sau này

| Từ → Sang | Effort |
|-----------|--------|
| C → B | Trung bình — viết lại `/gateway/*` |
| A → B | Trung bình |
| B → C | Thấp cho media |
| Bất kỳ → A | Thấp |

Token và slug giữ nguyên.

## Checklist

- [ ] Đã list models và copy `ratio` từ response
- [ ] Biết `domain` gửi ở đâu (client vs env)
- [ ] Có chiến lược poll
- [ ] CORS nếu browser khác origin (Mode B)
- [ ] Merchant token không ở client

## Tiếp theo

→ [Integration modes](./integration-modes.md) · [Quickstart](../quickstart.md) · [FAQ](../faq.md)
