# @ai-gateway/client

TypeScript client for [AI Gateway](https://github.com/bruno-hao97/ai-gateway) REST API.

**npm:** [@ai-gateway/client](https://www.npmjs.com/package/@ai-gateway/client) · current version **0.1.0**

## Install

```bash
npm install @ai-gateway/client
```

Requires **Node 18+** (native `fetch`) or any runtime with `fetch`.

### Contributors (monorepo)

```bash
npm run client:build
npm install ./packages/gateway-client
```

## Quick start

```typescript
import { GatewayClient, modelSlug, parseModelsList, pickFirstRatio } from '@ai-gateway/client';

const client = new GatewayClient({
  baseUrl: 'http://localhost:3001',
  accessToken: process.env.GATEWAY_TOKEN,
});

// Or login first
await client.auth.login({
  email: 'you@example.com',
  password: 'secret',
  domain: '79ai.net',
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

## Resources

| Property | Endpoints |
|----------|-----------|
| `client.auth` | login, me |
| `client.models` | list |
| `client.jobs` | create, poll, createAndWait, pollUntilDone |
| `client.chat` | send, stream (SSE) |
| `client.upload` | image, video |
| `client.audio` | searchVoices, tts, lists |
| `client.billing` | status, packages, createTopup, getOrder |

Docs: [Client SDKs](https://github.com/bruno-hao97/ai-gateway/blob/main/docs/sdk/index.md)

## License

MIT
