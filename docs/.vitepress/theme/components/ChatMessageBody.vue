<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { renderChatMarkdown } from '../models/chat-markdown';

const props = defineProps<{
  text: string;
  markdown?: boolean;
  streaming?: boolean;
  isVi?: boolean;
}>();

const root = ref<HTMLElement | null>(null);

const html = computed(() => (props.markdown ? renderChatMarkdown(props.text) : ''));

async function onCopyCodeClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('[data-copy-code]');
  if (!btn || !root.value?.contains(btn)) return;
  const wrap = btn.closest('.or-chat-md-pre-wrap');
  const code = wrap?.querySelector('code');
  const text = code?.textContent ?? '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.textContent = 'Copied';
    window.setTimeout(() => {
      btn.textContent = prev || 'Copy';
    }, 1200);
  } catch {
    /* ignore */
  }
}

onMounted(() => root.value?.addEventListener('click', onCopyCodeClick));
onUnmounted(() => root.value?.removeEventListener('click', onCopyCodeClick));
</script>

<template>
  <div ref="root" class="or-app-chat-bubble-content" :class="{ 'is-streaming': streaming && markdown }">
    <span v-if="!markdown" class="or-app-chat-bubble-text">{{ text }}</span>
    <div v-else class="or-app-chat-bubble-text or-chat-md" v-html="html" />
    <span v-if="streaming && markdown" class="or-chat-stream-cursor" aria-hidden="true" />
  </div>
</template>
