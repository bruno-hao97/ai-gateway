<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { ChatMessageMeta } from '../models/chat-storage';
import { hasMessageMetaDetails } from '../models/chat-models';
import type { PortalLocale } from '../models/portal-locale';
import ChatIcon from './ChatIcon.vue';
import ChatMetaPanel from './ChatMetaPanel.vue';

const props = defineProps<{
  meta?: ChatMessageMeta;
  createdAt?: number;
  locale?: PortalLocale;
  isVi?: boolean;
  disabled?: boolean;
}>();

const { m } = usePortalCopy(
  computed(() => props.locale ?? (props.isVi ? 'vi' : 'en')),
);

const dateLocale = computed(() => {
  const loc = props.locale ?? (props.isVi ? 'vi' : 'en');
  if (loc === 'vi') return 'vi-VN';
  if (loc === 'th') return 'th-TH';
  return 'en-US';
});

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const metaOpen = ref(false);

const hasMeta = computed(() => hasMessageMetaDetails(props.meta));

const timeLabel = computed(() => {
  if (!props.createdAt) return '';
  try {
    return new Intl.DateTimeFormat(dateLocale.value, {
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
      :title="m('More', 'Thêm', 'เพิ่มเติม')"
      :aria-label="m('More', 'Thêm', 'เพิ่มเติม')"
      @click.stop="toggleMenu"
    >
      <ChatIcon name="more" />
    </button>

    <div v-if="open" class="or-chat-more-menu" @click.stop>
      <p v-if="timeLabel" class="or-chat-more-time">{{ timeLabel }}</p>

      <button type="button" class="or-chat-more-item" :class="{ active: metaOpen }" @click="openMeta">
        <ChatIcon name="chart" />
        <span>{{ m('Metadata', 'Metadata', 'เมทาดาทา') }}</span>
      </button>

      <ChatMetaPanel v-if="metaOpen" :meta="meta" :locale="locale" />
    </div>
  </div>
</template>
