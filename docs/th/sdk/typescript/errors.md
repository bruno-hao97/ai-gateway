---
title: Errors
description: GatewayError และรหัสข้อผิดพลาด
---

# Errors

Request ล้มเหลวจะ throw `GatewayError`:

```typescript
import { GatewayClient, GatewayError } from '@ai-gateway/client';

try {
  await client.jobs.create({ type: 'image', modelSlug: '', fields: {} });
} catch (err) {
  if (err instanceof GatewayError) {
    console.log(err.status);  // 400
    console.log(err.code);    // VALIDATION_ERROR
    console.log(err.message);
  }
}
```

## รหัสข้อผิดพลาด

| Code | สาเหตุทั่วไป |
|------|-------------|
| `UNAUTHORIZED` | ไม่มีหรือ Bearer token ไม่ถูกต้อง |
| `VALIDATION_ERROR` | body / query ไม่ถูกต้อง |
| `NOT_CONFIGURED` | env server ขาด (admin/merchant; PayOS เฉพาะ legacy topup) |
| `UPSTREAM_ERROR` | upstream Gommo ล้มเหลว |
| `INSUFFICIENT_CREDITS` | ยอด merchant / สำรอง topup |
| `INTERNAL_ERROR` | ข้อผิดพลาด server |

รูปแบบ JSON ของ gateway: `{ success: false, message, code }`
