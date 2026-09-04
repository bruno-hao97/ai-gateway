<script setup lang="ts">
import type { ChatMessageMeta } from '../models/chat-storage';
import ChatIcon from './ChatIcon.vue';
import ChatMessageMoreMenu from './ChatMessageMoreMenu.vue';

defineProps<{
  role: 'user' | 'assistant';
  actionsLocked?: boolean;
  metaSummary?: string;
  messageMeta?: ChatMessageMeta;
  createdAt?: number;
  isVi?: boolean;
}>();

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
        :title="isVi ? 'Tạo lại' : 'Regenerate'"
        :aria-label="isVi ? 'Tạo lại' : 'Regenerate'"
        @click="emit('regenerate')"
      >
        <ChatIcon name="regenerate" />
      </button>
      <button
        type="button"
        class="or-chat-msg-toolbar-btn"
        :title="isVi ? 'Sao chép' : 'Copy'"
        :aria-label="isVi ? 'Sao chép' : 'Copy'"
        @click="emit('copy')"
      >
        <ChatIcon name="copy" />
      </button>
      <button
        v-if="role === 'user' && !actionsLocked"
        type="button"
        class="or-chat-msg-toolbar-btn"
        :title="isVi ? 'Sửa' : 'Edit'"
        :aria-label="isVi ? 'Sửa' : 'Edit'"
        @click="emit('edit')"
      >
        <ChatIcon name="edit" />
      </button>
      <button
        v-if="!actionsLocked"
        type="button"
        class="or-chat-msg-toolbar-btn or-chat-msg-toolbar-btn-danger"
        :title="isVi ? 'Xóa' : 'Delete'"
        :aria-label="isVi ? 'Xóa' : 'Delete'"
        @click="emit('delete')"
      >
        <ChatIcon name="trash" />
      </button>
      <ChatMessageMoreMenu
        v-if="role === 'assistant'"
        :meta="messageMeta"
        :created-at="createdAt"
        :is-vi="isVi"
        :disabled="actionsLocked"
      />
    </div>
    <span v-if="metaSummary" class="or-chat-msg-toolbar-meta">{{ metaSummary }}</span>
  </div>
</template>
