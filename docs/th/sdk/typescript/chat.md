---
title: ???
description: Agent chat และ SSE streaming
---

# Chat

Upstream ต้องการ **`messages` ไม่ว่าง**

## Chat (JSON)

```typescript
const res = await client.chat.send({
  action: 'chat',
  query: 'Hello',
  messages: [{ role: 'user', text: 'Hello' }],
});
```

Optional: `sessionId` สำหรับหลายรอบ

## Stream (SSE)

```typescript
for await (const chunk of client.chat.stream({
  query: 'Tell a short story',
  messages: [{ role: 'user', text: 'Tell a short story' }],
})) {
  process.stdout.write(chunk);
}
```

## ตั้งโมเดล

```typescript
await client.chat.send({
  action: 'set_model',
  messages: [{ role: 'user', text: 'hi' }],
  model: 'gpt-5.5::cheap',
});
```

ดู [Chat reference](../../reference/chat.md)
