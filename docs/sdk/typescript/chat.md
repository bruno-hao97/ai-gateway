---
title: Chat
description: Agent chat and SSE streaming
---

# Chat

Upstream requires **non-empty `messages`**.

## Chat (JSON)

```typescript
const res = await client.chat.send({
  action: 'chat',
  query: 'Hello',
  messages: [{ role: 'user', text: 'Hello' }],
});
```

Optional: `sessionId` for multi-turn.

## Stream (SSE)

```typescript
for await (const chunk of client.chat.stream({
  query: 'Tell a short story',
  messages: [{ role: 'user', text: 'Tell a short story' }],
})) {
  process.stdout.write(chunk);
}
```

## Set model

```typescript
await client.chat.send({
  action: 'set_model',
  messages: [{ role: 'user', text: 'hi' }],
  model: 'gpt-5.5::cheap',
});
```

See [Chat reference](../../reference/chat.md).
