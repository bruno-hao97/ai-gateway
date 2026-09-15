<script setup lang="ts">
import { computed } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { ChatMessageMeta } from '../models/chat-storage';
import { buildMessageMetaRows } from '../models/chat-models';
import type { PortalLocale } from '../models/portal-locale';

const props = defineProps<{
  meta?: ChatMessageMeta;
  locale?: PortalLocale;
  isVi?: boolean;
  title?: string;
}>();

const { m } = usePortalCopy(
  computed(() => props.locale ?? (props.isVi ? 'vi' : 'en')),
);

const activeLocale = computed(() => props.locale ?? (props.isVi ? 'vi' : 'en'));

const rows = computed(() => buildMessageMetaRows(props.meta, activeLocale.value));
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
        m(
          'Credits come from wallet balance; tokens from upstream. See Usage in Profile to reconcile.',
          'Credits lấy từ số dư ví; tokens từ upstream. Xem Usage trong Profile để đối chiếu.',
          'เครดิตมาจากยอดคงเหลือ; โทเค็นจาก upstream — ดู Usage ใน Profile เพื่อตรวจสอบ',
        )
      }}
    </p>
  </div>
</template>
