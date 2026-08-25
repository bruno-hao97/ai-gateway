---
title: Installation
description: Install @ai-gateway/client from npm
---

# Installation

## npm (recommended)

```bash
npm install @ai-gateway/client
```

Package: [@ai-gateway/client on npm](https://www.npmjs.com/package/@ai-gateway/client) (current **v0.1.0**).

Pin a version in production:

```bash
npm install @ai-gateway/client@0.1.0
```

Verify registry:

```bash
npm view @ai-gateway/client version
```

## From this monorepo (contributors)

When developing the gateway repo itself:

```bash
npm run client:build
npm install ./packages/gateway-client
```

## Environment

```typescript
import { GatewayClient } from '@ai-gateway/client';

const client = new GatewayClient({
  baseUrl: process.env.GATEWAY_URL ?? 'http://localhost:3001',
  accessToken: process.env.GATEWAY_TOKEN,
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `baseUrl` | `http://localhost:3001` | Gateway origin |
| `accessToken` | — | Gommo Bearer token |
| `fetch` | `globalThis.fetch` | Custom fetch (Node/Bun/Deno) |

## Verify

```typescript
const health = await client.health();
console.log(health.data?.ok); // true
```

Gateway must be running (`npm run dev`).
