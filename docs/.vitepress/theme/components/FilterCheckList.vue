<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    items: string[];
    modelValue: string[];
    limit?: number;
  }>(),
  { limit: 6 },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const expanded = ref(false);

const hasMore = computed(() => props.items.length > props.limit);

const visibleItems = computed(() => {
  if (expanded.value || !hasMore.value) return props.items;
  return props.items.slice(0, props.limit);
});

function isChecked(item: string): boolean {
  return props.modelValue.includes(item);
}

function toggle(item: string) {
  const next = [...props.modelValue];
  const i = next.indexOf(item);
  if (i >= 0) next.splice(i, 1);
  else next.push(item);
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="or-filter-list">
    <label v-for="item in visibleItems" :key="item" class="or-check or-check--plain">
      <input type="checkbox" :checked="isChecked(item)" @change="toggle(item)" />
      <span class="or-filter-item-label">{{ item }}</span>
    </label>
    <button
      v-if="hasMore"
      type="button"
      class="or-more-btn"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Less…' : 'More…' }}
    </button>
  </div>
</template>
