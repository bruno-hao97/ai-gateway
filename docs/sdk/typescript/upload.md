---
title: Upload
description: Multipart image and video upload
---

# Upload

## Image

```typescript
import { readFile } from 'node:fs/promises';

const buffer = await readFile('./photo.png');
const res = await client.upload.image({
  data: buffer,
  fileName: 'photo.png',
  mimeType: 'image/png',
});
console.log(res.data?.url);
```

Browser:

```typescript
const file = inputElement.files![0];
await client.upload.image({ data: file, fileName: file.name, mimeType: file.type });
```

## Video

```typescript
await client.upload.video({
  data: videoBuffer,
  fileName: 'clip.mp4',
  mimeType: 'video/mp4',
});
```

Use returned `url` in job `fields` when the model catalog requires an input URL.
