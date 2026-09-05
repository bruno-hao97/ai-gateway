<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import type { ChatMessageMeta } from '../models/chat-storage';
import { hasMessageMetaDetails } from '../models/chat-models';
import ChatMetaPanel from './ChatMetaPanel.vue';

const props = defineProps<{
  meta?: ChatMessageMeta;
  isVi?: boolean;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const visible = ref(false);
const popStyle = ref<Record<string, string>>({});
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const canHover = computed(() => hasMessageMetaDetails(props.meta));

function updatePosition() {
  const el = triggerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const width = 17.5 * 16;
  const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
  popStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${rect.top - 8}px`,
    transform: 'translateY(-100%)',
    width: `${width}px`,
    zIndex: '120',
  };
}

function openPopover() {
  if (!canHover.value) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  updatePosition();
  visible.value = true;
}

function scheduleClose() {
  hideTimer = setTimeout(() => {
    visible.value = false;
    hideTimer = null;
  }, 120);
}

function cancelClose() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer);
});
</script>

<template>
  <span
    ref="triggerRef"
    class="or-chat-meta-hover-wrap"
    @mouseenter="openPopover"
    @mouseleave="scheduleClose"
    @focusin="openPopover"
    @focusout="scheduleClose"
  >
    <button
      type="button"
      class="or-chat-msg-toolbar-meta"
      :class="{ 'is-active': visible }"
      :tabindex="canHover ? 0 : -1"
      :aria-label="isVi ? 'Metadata — di chuột để xem chi tiết' : 'Metadata — hover for details'"
    >
      <slot />
    </button>
    <Teleport to="body">
      <div
        v-if="visible && canHover"
        class="or-chat-meta-hover-pop"
        :style="popStyle"
        @mouseenter="cancelClose"
        @mouseleave="scheduleClose"
      >
        <ChatMetaPanel :meta="meta" :is-vi="isVi" :title="isVi ? 'Metadata' : 'Metadata'" />
      </div>
    </Teleport>
  </span>
</template>
