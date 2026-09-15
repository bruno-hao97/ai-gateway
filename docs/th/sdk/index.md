---
title: SDK ????????
description: '@ai-gateway/client — TypeScript SDK สำหรับ Gateway REST API'
---

# Client SDKs

Official TypeScript client สำหรับ **Mode B** (`/gateway/*`, `/billing/*`)

เผยแพร่บน npm: [@ai-gateway/client@0.1.0](https://www.npmjs.com/package/@ai-gateway/client)

## การติดตั้ง

| ภาษา | Package | สถานะ |
|------|---------|--------|
| TypeScript / JavaScript | [`@ai-gateway/client`](https://www.npmjs.com/package/@ai-gateway/client) | **v0.1.0** บน npm |
| Python | — | ใช้ generate จาก [OpenAPI](../reference/openapi.md) |
| Go | — | วางแผน |

```bash
npm install @ai-gateway/client
```

ต้องการ **Node 18+** (`fetch` ในตัว) หรือส่ง custom `fetch` ใน options

::: tip ผู้มีส่วนร่วม (repo นี้)
ซอร์ส: `packages/gateway-client` Dev ในเครื่อง: `npm run client:build` แล้ว `npm install ./packages/gateway-client` ในแอป
:::

## เมื่อใช้ Client SDKs

- **Backend / scripts** — เรียกแบบ typed แทน curl ดิบ
- **Browser apps** — same origin หรือ gateway ที่เปิด CORS
- **Polling helpers** — `pollUntilDone`, `createAndPoll` เมื่อ `wait: false`

สำหรับสูตร copy-paste ไม่ใช้ package ดู [Cookbook](../cookbook/)

::: info Agent SDK
AI Gateway **ยังไม่** มี Agent SDK แยก Multi-turn agents: ใช้ `client.chat` + orchestration ของคุณ หรือ [MCP & agents](../mcp/) สำหรับ tools ใน Cursor IDE
:::

## ตัวอย่างเร็ว

```typescript
import {
  GatewayClient,
  modelSlug,
  parseModelsList,
  pickFirstRatio,
} from '@ai-gateway/client';

const client = new GatewayClient({
  baseUrl: 'http://localhost:3001',
  accessToken: process.env.GATEWAY_TOKEN,
});

const catalog = await client.models.list({ type: 'image' });
const models = parseModelsList(catalog);
const m = models[0];
const slug = modelSlug(m);
const ratio = pickFirstRatio(m);

const job = await client.jobs.createAndWait({
  type: 'image',
  modelSlug: slug,
  fields: { prompt: 'A red apple', ratio },
});

console.log(job.data?.resultUrl);
```

## TypeScript SDK

| คู่มือ | หัวข้อ |
|--------|--------|
| [Overview](./typescript/) | แผนที่ resources |
| [Installation](./typescript/installation.md) | npm, env, baseUrl |
| [Authentication](./typescript/authentication.md) | login, Bearer token, me |
| [Models](./typescript/models.md) | list, catalog helpers |
| [Jobs](./typescript/jobs.md) | create, wait, poll |
| [Chat](./typescript/chat.md) | send, stream SSE |
| [Upload](./typescript/upload.md) | image, video multipart |
| [Audio](./typescript/audio.md) | voices, TTS, lists |
| [Billing](./typescript/billing.md) | Gommo VietQR topup (+ PayOS legacy) |
| [Errors](./typescript/errors.md) | GatewayError, codes |

## Client SDKs vs Cookbook

| | **Client SDK** | **Cookbook** |
|---|----------------|--------------|
| โฟกัส | Typed API surface | งาน end-to-end |
| ใช้เมื่อ | สร้างแอป | เรียนรู้ / script ครั้งเดียว |
| ภาษา | TypeScript (npm) | curl + PowerShell |
| Poll helpers | ในตัว | loop เอง |

## ขั้นตอนถัดไป

- [Cookbook](../cookbook/) — สูตรงาน
- [API Reference](../reference/media.md) — HTTP spec
- [Playground](/app/playground/)
