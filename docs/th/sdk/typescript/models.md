---
title: ?????
description: รายการ catalog โมเดลด้วย @ai-gateway/client
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
const ratio = pickFirstRatio(first); // ห้าม hard-code ratio
```

## ประเภท job

`type` ตรงกับประเภท job ของ gateway: `image`, `video`, `music`, `tts`, `image-upscale`, `remove-bg`, `video-upscale`, …

::: warning
`ratio`, `mode`, `resolution`, `duration` ต้องมาจากรายการโมเดล **นี้** — ดู [Models guide](../../models/)
:::
