---
title: Installation
description: Cài @ai-gateway/client từ npm
---

# Installation

## npm (khuyến nghị)

```bash
npm install @ai-gateway/client
```

Package: [@ai-gateway/client trên npm](https://www.npmjs.com/package/@ai-gateway/client) (hiện tại **v0.1.0**).

Pin version production:

```bash
npm install @ai-gateway/client@0.1.0
```

Kiểm tra registry:

```bash
npm view @ai-gateway/client version
```

## Từ monorepo (contributors)

Khi develop repo gateway:

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

| Option | Default | Mô tả |
|--------|---------|--------|
| `baseUrl` | `http://localhost:3001` | Gateway origin |
| `accessToken` | — | Gommo Bearer token |
| `fetch` | `globalThis.fetch` | Custom fetch (Node/Bun/Deno) |

## Verify

```typescript
const health = await client.health();
console.log(health.data?.ok); // true
```

Gateway phải chạy (`npm run dev`).
