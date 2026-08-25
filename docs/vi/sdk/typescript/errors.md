---
title: Errors
description: GatewayError and error codes
---

# Errors

Failed requests throw `GatewayError`:

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

## Error codes

| Code | Typical cause |
|------|----------------|
| `UNAUTHORIZED` | Missing or invalid Bearer token |
| `VALIDATION_ERROR` | Bad body / query |
| `NOT_CONFIGURED` | PayOS or merchant not set on server |
| `UPSTREAM_ERROR` | Gommo upstream failure |
| `INSUFFICIENT_CREDITS` | Merchant balance / topup reserve |
| `INTERNAL_ERROR` | Server error |

Gateway JSON shape: `{ success: false, message, code }`.
