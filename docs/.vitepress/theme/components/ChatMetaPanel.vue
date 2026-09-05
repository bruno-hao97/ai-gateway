<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessageMeta } from '../models/chat-storage';
import { buildMessageMetaRows } from '../models/chat-models';

const props = defineProps<{
  meta?: ChatMessageMeta;
  isVi?: boolean;
  title?: string;
}>();

const rows = computed(() => buildMessageMetaRows(props.meta, !!props.isVi));
</script>

<template>
  <div class="or-chat-meta-panel">
    <p v-if="title" class="or-chat-meta-panel-title">{{ title }}</p>
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
</template>
