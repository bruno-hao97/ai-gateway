<script setup lang="ts">
defineProps<{
  name:
    | 'plus'
    | 'settings'
    | 'infinity'
    | 'send'
    | 'stop'
    | 'copy'
    | 'edit'
    | 'trash'
    | 'regenerate'
    | 'attach'
    | 'image'
    | 'link'
    | 'chevron-down'
    | 'thumb-up'
    | 'thumb-down'
    | 'search'
    | 'x'
    | 'more'
    | 'chart'
    | 'pin'
    | 'duplicate';
}>();
</script>

<template>
  <svg
    class="or-chat-icon"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </template>
    <template v-else-if="name === 'infinity'">
      <path
        d="M6 12c0-2.5 1.5-4 3.5-4s3 1.2 3.5 2.5c.5-1.3 1.5-2.5 3.5-2.5s3.5 1.5 3.5 4-1.5 4-3.5 4-3-1.2-3.5-2.5c-.5 1.3-1.5 2.5-3.5 2.5S6 14.5 6 12z"
      />
    </template>
    <template v-else-if="name === 'send'">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </template>
    <template v-else-if="name === 'stop'">
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </template>
    <template v-else-if="name === 'regenerate'">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </template>
    <template v-else-if="name === 'attach'">
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
      />
    </template>
    <template v-else-if="name === 'image'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="m21 15-5-5L5 21" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <template v-else-if="name === 'thumb-up'">
      <path d="M7 11v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
      <path d="M7 10V6a2 2 0 0 1 2-2h1l2 3 4 1.5V18h-6.5a2 2 0 0 1-1.6-.8L7 14" />
    </template>
    <template v-else-if="name === 'thumb-down'">
      <path d="M17 13v-8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3" />
      <path d="M17 14v4a2 2 0 0 1-2 2h-1l-2-3-4-1.5V6h6.5a2 2 0 0 1 1.6.8L17 10" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </template>
    <template v-else-if="name === 'x'">
      <path d="M18 6 6 18M6 6l12 12" />
    </template>
    <template v-else-if="name === 'more'">
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 19V5M8 19v-6M12 19V9M16 19v-4M20 19V7" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 17v5M9 3h6l1 7h4l-5 6v4H9v-4L4 10h4l1-7z" />
    </template>
    <template v-else-if="name === 'duplicate'">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
    </template>
  </svg>
</template>
