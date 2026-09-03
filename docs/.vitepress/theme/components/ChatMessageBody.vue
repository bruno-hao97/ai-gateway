<script setup lang="ts">
import { computed } from 'vue';
import { renderChatMarkdown } from '../models/chat-markdown';

const props = defineProps<{
  text: string;
  markdown?: boolean;
}>();

const html = computed(() => (props.markdown ? renderChatMarkdown(props.text) : ''));
</script>

<template>
  <span v-if="!markdown" class="or-app-chat-bubble-text">{{ text }}</span>
  <span v-else class="or-app-chat-bubble-text or-chat-md" v-html="html" />
</template>
