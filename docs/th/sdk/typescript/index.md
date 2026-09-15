---
title: SDK TypeScript
description: ภาพรวม resources ของ @ai-gateway/client
---

# TypeScript SDK

`GatewayClient` มี resources แยก namespace:

```typescript
import { GatewayClient } from '@ai-gateway/client';

const client = new GatewayClient({
  baseUrl: 'http://localhost:3001',
  accessToken: '...',
});
```

| Resource | Methods |
|----------|---------|
| `client.auth` | `login()`, `me()` |
| `client.models` | `list({ type })` |
| `client.jobs` | `create()`, `poll()`, `createAndWait()`, `pollUntilDone()`, `createAndPoll()` |
| `client.chat` | `send()`, `stream()` |
| `client.upload` | `image()`, `video()` |
| `client.audio` | `searchVoices()`, `tts()`, `lists()` |
| `client.billing` | `status()`, `packages()`, `createTopup()`, `getOrder()` |
| `client.byok` | `status()`, `listCredentials()`, `createCredential()`, `linkGommoAccount()`, `usage()` *(beta)* — ดู [BYOK reference](/reference/byok) |
| `client` | `health()`, `setAccessToken()`, `getAccessToken()`, `baseUrl` |

Helpers ที่ export จาก package root:

- `parseModelsList`, `modelSlug`, `pickFirstRatio`
- `extractJobId`, `extractPollSnapshot`, `pollMediaForJobType`, `POLL_MEDIA`
- `classifyPollStatus`, `DEFAULT_POLL_INTERVAL_MS`, `DEFAULT_POLL_MAX_ATTEMPTS`
- `GatewayError`, `parseGatewayError`

ดู [Installation](./installation.md) เพื่อเริ่มต้น
