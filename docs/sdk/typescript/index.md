---
title: TypeScript SDK
description: Resource overview for @ai-gateway/client
---

# TypeScript SDK

`GatewayClient` exposes namespaced resources:

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
| `client` | `health()`, `setAccessToken()`, `getAccessToken()`, `baseUrl` |

Helpers exported from package root:

- `parseModelsList`, `modelSlug`, `pickFirstRatio`
- `extractJobId`, `extractPollSnapshot`, `pollMediaForJobType`, `POLL_MEDIA`
- `classifyPollStatus`, `DEFAULT_POLL_INTERVAL_MS`, `DEFAULT_POLL_MAX_ATTEMPTS`
- `GatewayError`, `parseGatewayError`

See [Installation](./installation.md) to get started.
