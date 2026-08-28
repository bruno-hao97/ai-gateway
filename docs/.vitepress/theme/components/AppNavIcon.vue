<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <svg
    class="or-app-nav-icon"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- home -->
    <template v-if="name === 'home'">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
    </template>
    <!-- key -->
    <template v-else-if="name === 'key'">
      <circle cx="8" cy="15" r="4" />
      <path d="m14 9 6-6M16 5l2 2" />
    </template>
    <!-- terminal -->
    <template v-else-if="name === 'terminal'">
      <path d="M4 17h16M6 12l4-4-4-4M11 16h7" />
    </template>
    <!-- grid -->
    <template v-else-if="name === 'grid'">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </template>
    <!-- compare -->
    <template v-else-if="name === 'compare'">
      <path d="M8 3v18M16 3v18M3 8h5M3 16h5M16 8h5M16 16h5" />
    </template>
    <!-- book -->
    <template v-else-if="name === 'book'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </template>
    <!-- user -->
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </template>
    <!-- wallet -->
    <template v-else-if="name === 'wallet'">
      <path d="M3 7h18v12H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <path d="M3 7V6a2 2 0 0 1 2-2h14M17 13h4" />
    </template>
    <!-- activity -->
    <template v-else-if="name === 'activity'">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </template>
    <!-- logs -->
    <template v-else-if="name === 'logs'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" />
      <path d="M10 9h4M10 13h4" />
    </template>
    <!-- chevron -->
    <template v-else-if="name === 'chevron'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <!-- fallback -->
    <circle v-else cx="12" cy="12" r="2" />
  </svg>
</template>
