---
title: OpenAPI
description: Spec OpenAPI tại /openapi.yaml — xem trên Swagger Editor
---

# OpenAPI

AI Gateway phát hành spec OpenAPI 3 tại **`/openapi.yaml`** (cùng host với API, ví dụ `http://localhost:3001/openapi.yaml`).

## Xem trên Swagger Editor

Mở [Swagger Editor](https://editor.swagger.io/?url=) và dán URL spec đã host:

```
https://your-api-host/openapi.yaml
```

Ví dụ local: `http://localhost:3001/openapi.yaml`

Swagger Editor tải spec và hiển thị schema, thử request trực tiếp (cần CORS nếu gọi từ browser).

## Nhóm path chính

| Prefix | Mục đích |
|--------|----------|
| `/health` | Health check — không auth |
| `/gateway/auth/*` | Đăng nhập, đăng ký — không cần Bearer |
| `/gateway/*` | REST wrap: models, jobs, upload, chat, audio — auth `Authorization: Bearer` user |
| `/billing/*` | Gommo VietQR (mặc định), PayOS legacy, packages, lịch sử đơn |
| `/admin/*` | Merchant balance, send credits, register user — auth `x-admin-key` (chỉ server) |

Chi tiết từng endpoint:

- [Media & jobs](./media.md)
- [Upload](./upload.md)
- [Chat](./chat.md)
- [Audio](./audio.md)
- [Billing (Gommo + PayOS legacy)](./billing.md)
- [Admin (chỉ server)](./admin.md)

Auth user: xem [Authentication](../authentication.md).
