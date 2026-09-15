---
title: ???????
description: อัปโหลดภาพและวิดีโอ multipart
---

# Upload

## ภาพ

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

## วิดีโอ

```typescript
await client.upload.video({
  data: videoBuffer,
  fileName: 'clip.mp4',
  mimeType: 'video/mp4',
});
```

ใช้ `url` ที่คืนมาใน `fields` ของ job เมื่อ catalog โมเดลต้องการ input URL
