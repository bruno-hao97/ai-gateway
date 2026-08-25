---
title: Jobs
description: Create and poll media jobs
---

# Jobs

## Create with server wait

```typescript
const job = await client.jobs.createAndWait({
  type: 'image',
  modelSlug: slug,
  fields: { prompt: 'A sunset', ratio },
});
console.log(job.data?.resultUrl);
```

Equivalent: `create({ ..., wait: true })`.

## Create async + client poll

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

## One-shot helper

```typescript
const { create, poll } = await client.jobs.createAndPoll({
  type: 'image',
  modelSlug: slug,
  fields: { prompt: 'Hello', ratio },
});
```

## Poll media by type

```typescript
client.jobs.pollMediaFor('remove-bg'); // 'image'
client.jobs.pollMediaFor('video-vfx'); // 'video'
```

Default poll: **3500ms** interval, **80** max attempts.

## Manual poll

```typescript
await client.jobs.poll({ id: jobId, media: 'video' });
```
