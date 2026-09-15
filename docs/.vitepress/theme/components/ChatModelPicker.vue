<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { ChatModelOption } from '../models/chat-models';
import { modelPickerLabel } from '../models/chat-models';
import type { PortalLocale } from '../models/portal-locale';

const props = defineProps<{
  modelId: string;
  models: ChatModelOption[];
  disabled?: boolean;
  locale?: PortalLocale;
  isVi?: boolean;
  /** Gateway BYOK map — show badge on mapped chat models */
  byokModelIds?: string[];
}>();

const { locale: activeLocale, m } = usePortalCopy(
  computed(() => props.locale ?? (props.isVi ? 'vi' : 'en')),
);

const byokIdSet = computed(() => new Set(props.byokModelIds ?? []));

const emit = defineEmits<{
  'update:modelId': [value: string];
}>();

const open = ref(false);
const search = ref('');
const root = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);

const activeModel = computed(() => props.models.find((m) => m.id === props.modelId) ?? null);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.models;
  return props.models.filter((m) => {
    const hay = `${m.label} ${m.model} ${m.server}`.toLowerCase();
    return hay.includes(q);
  });
});

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) {
    search.value = '';
    void nextTick(() => searchRef.value?.focus());
  }
}

function select(id: string) {
  emit('update:modelId', id);
  open.value = false;
}

function isByokModel(id: string): boolean {
  return byokIdSet.value.has(id);
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
      <span class="or-chat-model-trigger-label">{{ modelPickerLabel(activeModel, activeLocale) }}</span>
      <span
        v-if="isByokModel(modelId)"
        class="or-chat-model-badge or-chat-model-badge--byok"
        :title="m('BYOK chat model — uses your provider key', 'Model chat BYOK — dùng provider key', 'โมเดลแชท BYOK — ใช้ provider key ของคุณ')"
      >
        BYOK
      </span>
      <span class="or-chat-model-trigger-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="or-chat-model-menu" role="listbox" @click.stop>
      <div class="or-chat-model-menu-head">
        <input
          ref="searchRef"
          v-model="search"
          type="search"
          class="or-chat-model-search"
          :placeholder="m('Search models…', 'Tìm model…', 'ค้นหาโมเดล…')"
          @keydown.esc.prevent="open = false"
        />
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
            <span class="or-chat-model-item-top">
              <span class="or-chat-model-item-label">{{ model.label }}</span>
              <span v-if="isByokModel(model.id)" class="or-chat-model-badges">
                <span
                  class="or-chat-model-badge or-chat-model-badge--byok"
                  :title="m('Chat BYOK', 'Chat BYOK', 'Chat BYOK')"
                >
                  BYOK
                </span>
              </span>
            </span>
          </button>
        </li>
        <li v-if="filtered.length === 0" class="or-chat-model-empty">
          {{ m('No models', 'Không có model', 'ไม่มีโมเดล') }}
        </li>
      </ul>
    </div>
  </div>
</template>
