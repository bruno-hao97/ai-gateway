---
title: การติดตั้ง
description: ติดตั้ง @ai-gateway/client จาก npm
---

# การติดตั้ง

## npm (แนะนำ)

```bash
npm install @ai-gateway/client
```

Package: [@ai-gateway/client บน npm](https://www.npmjs.com/package/@ai-gateway/client) (ปัจจุบัน **v0.1.0**)

Pin เวอร์ชันใน production:

```bash
npm install @ai-gateway/client@0.1.0
```

ตรวจ registry:

```bash
npm view @ai-gateway/client version
```

## จาก monorepo นี้ (ผู้มีส่วนร่วม)

เมื่อพัฒนา gateway repo เอง:

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

| Option | Default | คำอธิบาย |
|--------|---------|----------|
| `baseUrl` | `http://localhost:3001` | Origin ของ gateway |
| `accessToken` | — | Gommo Bearer token |
| `fetch` | `globalThis.fetch` | Custom fetch (Node/Bun/Deno) |

## ตรวจสอบ

```typescript
const health = await client.health();
console.log(health.data?.ok); // true
```

Gateway ต้องทำงาน (`npm run dev`)
