---
title: Client SDKs
description: '@ai-gateway/client — TypeScript SDK for Gateway REST API'
---

# Client SDKs

Official TypeScript client for **Mode B** (`/gateway/*`, `/billing/*`).

Published on npm: [@ai-gateway/client@0.1.0](https://www.npmjs.com/package/@ai-gateway/client)

## Installation

| Language | Package | Status |
|----------|---------|--------|
| TypeScript / JavaScript | [`@ai-gateway/client`](https://www.npmjs.com/package/@ai-gateway/client) | **v0.1.0** on npm |
| Python | — | Use [OpenAPI](../reference/openapi.md) generate |
| Go | — | Planned |

```bash
npm install @ai-gateway/client
```

Requires **Node 18+** (native `fetch`) or pass custom `fetch` in options.

::: tip Contributors (this repo)
Source: `packages/gateway-client`. Local dev: `npm run client:build` then `npm install ./packages/gateway-client` in your app.
:::

## When to use Client SDKs

- **Backend / scripts** — typed calls instead of raw curl
- **Browser apps** — same origin or CORS-enabled gateway
- **Polling helpers** — `pollUntilDone`, `createAndPoll` when `wait: false`

For copy-paste recipes without a package, use [Cookbook](../cookbook/).

::: info Agent SDK
AI Gateway does **not** ship a separate Agent SDK yet. Multi-turn agents: use `client.chat` + your orchestration, or [MCP & agents](../mcp.md) for Cursor IDE tools.
:::

## Quick example

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

| Guide | Topics |
|-------|--------|
| [Overview](./typescript/) | Resources map |
| [Installation](./typescript/installation.md) | npm, env, baseUrl |
| [Authentication](./typescript/authentication.md) | login, Bearer token, me |
| [Models](./typescript/models.md) | list, catalog helpers |
| [Jobs](./typescript/jobs.md) | create, wait, poll |
| [Chat](./typescript/chat.md) | send, stream SSE |
| [Upload](./typescript/upload.md) | image, video multipart |
| [Audio](./typescript/audio.md) | voices, TTS, lists |
| [Billing](./typescript/billing.md) | PayOS topup |
| [Errors](./typescript/errors.md) | GatewayError, codes |

## Client SDKs vs Cookbook

| | **Client SDK** | **Cookbook** |
|---|----------------|--------------|
| Focus | Typed API surface | End-to-end tasks |
| Use when | Building an app | Learning / one-off scripts |
| Languages | TypeScript (npm) | curl + PowerShell |
| Poll helpers | Built-in | Manual loops |

## Next steps

- [Cookbook](../cookbook/) — task recipes
- [API Reference](../reference/media.md) — HTTP spec
- [Playground](/app/playground/)
