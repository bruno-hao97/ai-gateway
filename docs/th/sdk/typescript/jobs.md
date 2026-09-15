---
title: ???
description: สร้างและ poll media jobs
---

# Jobs

## สร้างพร้อมรอที่ server

```typescript
const job = await client.jobs.createAndWait({
  type: 'image',
  modelSlug: slug,
  fields: { prompt: 'A sunset', ratio },
});
console.log(job.data?.resultUrl);
```

เทียบเท่า: `create({ ..., wait: true })`

## สร้าง async + poll ที่ client

```typescript
import { extractJobId } from '@ai-gateway/client';

const created = await client.jobs.create({
  type: 'image',
  modelSlug: slug,
  fields: { prompt: 'A sunset', ratio },
  wait: false,
});

const jobId = extractJobId(created)!;
const result = await client.jobs.pollUntilDone(jobId, 'image', {
  onProgress: (attempt, snap) => console.log(attempt, snap.status),
});
console.log(result.resultUrl);
```

## Helper ครั้งเดียว

```typescript
const { create, poll } = await client.jobs.createAndPoll({
  type: 'image',
  modelSlug: slug,
  fields: { prompt: 'Hello', ratio },
});
```

## Poll media ตามประเภท

```typescript
client.jobs.pollMediaFor('remove-bg'); // 'image'
client.jobs.pollMediaFor('video-vfx'); // 'video'
```

Poll เริ่มต้น: interval **3500ms**, สูงสุด **80** ครั้ง

## Poll เอง

```typescript
await client.jobs.poll({ id: jobId, media: 'video' });
```
