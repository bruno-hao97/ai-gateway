<script setup lang="ts">
import { computed } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { ChatMessageMeta } from '../models/chat-storage';
import type { PortalLocale } from '../models/portal-locale';
import ChatIcon from './ChatIcon.vue';
import ChatMessageMoreMenu from './ChatMessageMoreMenu.vue';
import ChatMetaHover from './ChatMetaHover.vue';

const props = defineProps<{
  role: 'user' | 'assistant';
  actionsLocked?: boolean;
  metaSummary?: string;
  messageMeta?: ChatMessageMeta;
  createdAt?: number;
  locale?: PortalLocale;
  isVi?: boolean;
}>();

const { m } = usePortalCopy(
  computed(() => props.locale ?? (props.isVi ? 'vi' : 'en')),
);

const emit = defineEmits<{
  copy: [];
  edit: [];
  delete: [];
  regenerate: [];
}>();
</script>

<template>
  <div class="or-chat-msg-toolbar" :class="role">
    <div class="or-chat-msg-toolbar-actions">
      <button
        v-if="role === 'assistant' && !actionsLocked"
        type="button"
        class="or-chat-msg-toolbar-btn"
        :title="m('Regenerate', 'Tạo lại', 'สร้างใหม่')"
        :aria-label="m('Regenerate', 'Tạo lại', 'สร้างใหม่')"
        @click="emit('regenerate')"
      >
        <ChatIcon name="regenerate" />
      </button>
      <button
        type="button"
        class="or-chat-msg-toolbar-btn"
        :title="m('Copy', 'Sao chép', 'คัดลอก')"
        :aria-label="m('Copy', 'Sao chép', 'คัดลอก')"
        @click="emit('copy')"
      >
        <ChatIcon name="copy" />
      </button>
      <button
        v-if="role === 'user' && !actionsLocked"
        type="button"
        class="or-chat-msg-toolbar-btn"
        :title="m('Edit', 'Sửa', 'แก้ไข')"
        :aria-label="m('Edit', 'Sửa', 'แก้ไข')"
        @click="emit('edit')"
      >
        <ChatIcon name="edit" />
      </button>
      <button
        v-if="!actionsLocked"
        type="button"
        class="or-chat-msg-toolbar-btn or-chat-msg-toolbar-btn-danger"
        :title="m('Delete', 'Xóa', 'ลบ')"
        :aria-label="m('Delete', 'Xóa', 'ลบ')"
        @click="emit('delete')"
      >
        <ChatIcon name="trash" />
      </button>
      <ChatMessageMoreMenu
        v-if="role === 'assistant'"
        :meta="messageMeta"
        :created-at="createdAt"
        :locale="locale"
        :disabled="actionsLocked"
      />
    </div>
    <ChatMetaHover
      v-if="role === 'assistant' && metaSummary && messageMeta"
      :meta="messageMeta"
      :locale="locale"
    >
      {{ metaSummary }}
    </ChatMetaHover>
    <span v-else-if="metaSummary" class="or-chat-msg-toolbar-meta is-static">{{ metaSummary }}</span>
  </div>
</template>
