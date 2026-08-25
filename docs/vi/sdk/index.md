---
title: Client SDKs
description: '@ai-gateway/client — TypeScript SDK cho Gateway REST API'
---

# Client SDKs

Client TypeScript chính thức cho **Mode B** (`/gateway/*`, `/billing/*`).

Đã publish npm: [@ai-gateway/client@0.1.0](https://www.npmjs.com/package/@ai-gateway/client)

## Cài đặt

| Ngôn ngữ | Package | Trạng thái |
|----------|---------|------------|
| TypeScript / JavaScript | [`@ai-gateway/client`](https://www.npmjs.com/package/@ai-gateway/client) | **v0.1.0** trên npm |
| Python | — | Dùng [OpenAPI](../reference/openapi.md) generate |
| Go | — | Dự kiến |

```bash
npm install @ai-gateway/client
```

Cần **Node 18+** hoặc truyền `fetch` tùy chỉnh.

::: tip Contributors (repo này)
Source: `packages/gateway-client`. Dev local: `npm run client:build` rồi `npm install ./packages/gateway-client`.
:::

## Khi nào dùng Client SDK

- **Backend / script** — gọi typed thay vì curl
- **Browser app** — cùng origin hoặc CORS
- **Poll helpers** — `pollUntilDone`, `createAndPoll`

Recipe không cần package: [Cookbook](../cookbook/).

## Ví dụ nhanh

```typescript
import { GatewayClient, modelSlug, parseModelsList, pickFirstRatio } from '@ai-gateway/client';

const client = new GatewayClient({
  baseUrl: 'http://localhost:3001',
  accessToken: process.env.GATEWAY_TOKEN,
});

const catalog = await client.models.list({ type: 'image' });
const models = parseModelsList(catalog);
const m = models[0];

const job = await client.jobs.createAndWait({
  type: 'image',
  modelSlug: modelSlug(m),
  fields: { prompt: 'A red apple', ratio: pickFirstRatio(m) },
});

console.log(job.data?.resultUrl);
```

## TypeScript SDK

| Guide | Nội dung |
|-------|----------|
| [Tổng quan](./typescript/) | Bản đồ resources |
| [Installation](./typescript/installation.md) | npm, env, baseUrl |
| [Authentication](./typescript/authentication.md) | login, Bearer, me |
| [Models](./typescript/models.md) | list, catalog helpers |
| [Jobs](./typescript/jobs.md) | create, wait, poll |
| [Chat](./typescript/chat.md) | send, stream SSE |
| [Upload](./typescript/upload.md) | image, video multipart |
| [Audio](./typescript/audio.md) | voices, TTS, lists |
| [Billing](./typescript/billing.md) | PayOS topup |
| [Errors](./typescript/errors.md) | GatewayError, codes |

## Tiếp theo

- [Cookbook](../cookbook/)
- [API Reference](../reference/media.md)
