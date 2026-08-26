<script setup lang="ts">
defineProps<{
  name: 'modalities' | 'categories' | 'params' | 'pricing' | 'providers';
}>();
</script>

<template>
  <svg
    class="or-sidebar-icon"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Input modalities: 2×2 grid -->
    <template v-if="name === 'modalities'">
      <rect x="2" y="2" width="5" height="5" rx="0.75" stroke="currentColor" stroke-width="1.25" />
      <rect x="9" y="2" width="5" height="5" rx="0.75" stroke="currentColor" stroke-width="1.25" />
      <rect x="2" y="9" width="5" height="5" rx="0.75" stroke="currentColor" stroke-width="1.25" />
      <rect x="9" y="9" width="5" height="5" rx="0.75" stroke="currentColor" stroke-width="1.25" />
    </template>

    <!-- Categories: stacked layers -->
    <template v-else-if="name === 'categories'">
      <path
        d="M2 10.5L8 13.5L14 10.5"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M2 7.5L8 10.5L14 7.5"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M2 4.5L8 7.5L14 4.5L8 1.5L2 4.5Z"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linejoin="round"
      />
    </template>

    <!-- Supported parameters: code -->
    <template v-else-if="name === 'params'">
      <path
        d="M5.5 4.5L2.5 8L5.5 11.5"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M10.5 4.5L13.5 8L10.5 11.5"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <!-- Credits pricing: coin -->
    <template v-else-if="name === 'pricing'">
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" stroke-width="1.25" />
      <path
        d="M8 4.75V11.25M6.25 6.25H9C9.75 6.25 10.25 6.75 10.25 7.5C10.25 8.25 9.75 8.75 9 8.75H7M7 8.75H9.25C10 8.75 10.5 9.25 10.5 10C10.5 10.75 10 11.25 9.25 11.25H6.25"
        stroke="currentColor"
        stroke-width="1.1"
        stroke-linecap="round"
      />
    </template>

    <!-- Providers: nodes -->
    <template v-else-if="name === 'providers'">
      <circle cx="4" cy="5" r="1.5" stroke="currentColor" stroke-width="1.25" />
      <circle cx="12" cy="5" r="1.5" stroke="currentColor" stroke-width="1.25" />
      <circle cx="8" cy="11" r="1.5" stroke="currentColor" stroke-width="1.25" />
      <path d="M5.2 6.1L6.8 9.9M10.8 6.1L9.2 9.9" stroke="currentColor" stroke-width="1.25" />
    </template>
  </svg>
</template>
