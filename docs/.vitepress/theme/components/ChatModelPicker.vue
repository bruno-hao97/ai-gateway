<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { ChatModelOption } from '../models/chat-models';
import { modelPickerLabel, modelSubtitle } from '../models/chat-models';

const props = defineProps<{
  modelId: string;
  models: ChatModelOption[];
  disabled?: boolean;
  isVi?: boolean;
}>();

const emit = defineEmits<{
  'update:modelId': [value: string];
}>();

const open = ref(false);
const search = ref('');
const root = ref<HTMLElement | null>(null);

const activeModel = computed(() => props.models.find((m) => m.id === props.modelId) ?? null);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.models;
  return props.models.filter((m) => {
    const hay = `${m.label} ${m.model} ${m.server} ${m.description || ''}`.toLowerCase();
    return hay.includes(q);
  });
});

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) search.value = '';
}

function select(id: string) {
  emit('update:modelId', id);
  open.value = false;
  search.value = '';
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return;
  const el = root.value;
  if (el && !el.contains(e.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div ref="root" class="or-chat-model-picker">
    <button
      type="button"
      class="or-chat-model-trigger"
      :class="{ open, disabled }"
      :disabled="disabled"
      @click.stop="toggle"
    >
      <span class="or-chat-model-trigger-icon" aria-hidden="true">◈</span>
      <span class="or-chat-model-trigger-text">
        <span class="or-chat-model-trigger-label">{{ modelPickerLabel(activeModel, !!isVi) }}</span>
        <span v-if="activeModel" class="or-chat-model-trigger-sub">{{ modelSubtitle(activeModel) }}</span>
      </span>
      <span class="or-chat-model-trigger-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="or-chat-model-menu" role="listbox" @click.stop>
      <div class="or-chat-model-menu-head">
        <input
          v-model="search"
          type="search"
          class="or-chat-model-search"
          :placeholder="isVi ? 'Tìm model…' : 'Search models…'"
          @keydown.esc.prevent="open = false"
        />
        <span class="or-chat-model-count">{{ filtered.length }}</span>
      </div>
      <ul class="or-chat-model-list">
        <li v-for="model in filtered" :key="model.id">
          <button
            type="button"
            class="or-chat-model-item"
            :class="{ active: model.id === modelId }"
            role="option"
            :aria-selected="model.id === modelId"
            @click="select(model.id)"
          >
            <span class="or-chat-model-item-label">{{ model.label }}</span>
            <span class="or-chat-model-item-sub">{{ modelSubtitle(model) }}</span>
            <span v-if="model.description" class="or-chat-model-item-desc">{{ model.description }}</span>
          </button>
        </li>
        <li v-if="filtered.length === 0" class="or-chat-model-empty">
          {{ isVi ? 'Không có model' : 'No models' }}
        </li>
      </ul>
    </div>
  </div>
</template>
