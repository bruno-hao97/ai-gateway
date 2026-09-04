<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { ChatMessageMeta } from '../models/chat-storage';
import { buildMessageMetaRows, hasMessageMetaDetails } from '../models/chat-models';
import ChatIcon from './ChatIcon.vue';

const props = defineProps<{
  meta?: ChatMessageMeta;
  createdAt?: number;
  isVi?: boolean;
  disabled?: boolean;
}>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const metaOpen = ref(false);

const rows = computed(() => buildMessageMetaRows(props.meta, !!props.isVi));
const hasMeta = computed(() => hasMessageMetaDetails(props.meta));

const timeLabel = computed(() => {
  if (!props.createdAt) return '';
  try {
    return new Intl.DateTimeFormat(props.isVi ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(props.createdAt));
  } catch {
    return '';
  }
});

function toggleMenu() {
  if (props.disabled || !hasMeta.value) return;
  open.value = !open.value;
  if (!open.value) metaOpen.value = false;
}

function openMeta() {
  metaOpen.value = true;
}

function onDocClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) {
    open.value = false;
    metaOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div v-if="hasMeta" ref="root" class="or-chat-more-wrap">
    <button
      type="button"
      class="or-chat-msg-toolbar-btn"
      :class="{ active: open }"
      :disabled="disabled"
      :title="isVi ? 'Thêm' : 'More'"
      :aria-label="isVi ? 'Thêm' : 'More'"
      @click.stop="toggleMenu"
    >
      <ChatIcon name="more" />
    </button>

    <div v-if="open" class="or-chat-more-menu" @click.stop>
      <p v-if="timeLabel" class="or-chat-more-time">{{ timeLabel }}</p>

      <button type="button" class="or-chat-more-item" :class="{ active: metaOpen }" @click="openMeta">
        <ChatIcon name="chart" />
        <span>{{ isVi ? 'Metadata' : 'Metadata' }}</span>
      </button>

      <div v-if="metaOpen" class="or-chat-meta-panel">
        <div v-for="(row, i) in rows" :key="`${row.label}-${i}`" class="or-chat-meta-row">
          <span class="or-chat-meta-label">{{ row.label }}</span>
          <span class="or-chat-meta-value">{{ row.value }}</span>
        </div>
        <p class="or-chat-meta-foot">
          {{
            isVi
              ? 'Credits lấy từ số dư ví; tokens từ upstream. Xem Usage trong Profile để đối chiếu.'
              : 'Credits come from wallet balance; tokens from upstream. See Usage in Profile to reconcile.'
          }}
        </p>
      </div>
    </div>
  </div>
</template>
