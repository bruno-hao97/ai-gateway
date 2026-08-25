---
title: Audio
description: Voices, TTS, and history lists
---

# Audio

## Search voices

```typescript
const voices = await client.audio.searchVoices({
  server: 'elevenlabs_cheap',
  page: 0,
});
```

## Text-to-speech

```typescript
const tts = await client.audio.tts({
  text: 'Hello from SDK',
  voice_id: 'VOICE_ID',
  server: 'elevenlabs_cheap',
  model: 'eleven_multilingual_v2',
});
console.log(tts.data?.fileUrl);
```

## History

```typescript
await client.audio.lists('default');
```

See [Audio reference](../../reference/audio.md).
