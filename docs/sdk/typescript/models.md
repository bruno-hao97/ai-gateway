---
title: Models
description: List models catalog with @ai-gateway/client
---

# Models

```typescript
import { GatewayClient, parseModelsList, modelSlug, pickFirstRatio } from '@ai-gateway/client';

const client = new GatewayClient({ baseUrl, accessToken });

const envelope = await client.models.list({ type: 'image' });
const models = parseModelsList(envelope);

for (const m of models) {
  console.log(modelSlug(m), m.name, m.ratios);
}

const first = models[0];
const slug = modelSlug(first);
const ratio = pickFirstRatio(first); // never hard-code ratio
```

## Job types

`type` matches gateway job types: `image`, `video`, `music`, `tts`, `image-upscale`, `remove-bg`, `video-upscale`, …

::: warning
`ratio`, `mode`, `resolution`, `duration` must come from **this** model entry — see [Models guide](../../models.md).
:::
