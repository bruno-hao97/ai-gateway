<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import ChatIcon from './ChatIcon.vue';

const props = defineProps<{
  pinned?: boolean;
  isVi?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pin: [];
  rename: [];
  duplicate: [];
  delete: [];
}>();

const root = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const open = ref(false);
const menuStyle = ref({ top: '0px', left: '0px' });

let scrollParent: HTMLElement | null = null;

function updatePosition() {
  const trigger = triggerRef.value;
  const menu = menuRef.value;
  if (!trigger || !menu) return;

  const rect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const gap = 6;
  const pad = 8;

  let top = rect.top;
  let left = rect.right + gap;

  if (left + menuRect.width > window.innerWidth - pad) {
    left = rect.left - menuRect.width - gap;
  }
  if (top + menuRect.height > window.innerHeight - pad) {
    top = Math.max(pad, rect.bottom - menuRect.height);
  }
  if (top < pad) top = pad;
  if (left < pad) left = pad;

  menuStyle.value = { top: `${top}px`, left: `${left}px` };
}

async function positionMenu() {
  await nextTick();
  updatePosition();
  requestAnimationFrame(updatePosition);
}

function bindListeners() {
  window.addEventListener('scroll', onScrollClose, true);
  window.addEventListener('resize', onViewportChange);
  scrollParent = triggerRef.value?.closest('.or-app-chat-rooms') ?? null;
  scrollParent?.addEventListener('scroll', onScrollClose, { passive: true });
}

function unbindListeners() {
  window.removeEventListener('scroll', onScrollClose, true);
  window.removeEventListener('resize', onViewportChange);
  scrollParent?.removeEventListener('scroll', onScrollClose);
  scrollParent = null;
}

function toggleMenu(e: MouseEvent) {
  e.stopPropagation();
  if (props.disabled) return;
  open.value = !open.value;
}

function run(action: 'pin' | 'rename' | 'duplicate' | 'delete') {
  open.value = false;
  emit(action);
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node;
  if (root.value?.contains(target) || menuRef.value?.contains(target)) return;
  open.value = false;
}

function onScrollClose() {
  open.value = false;
}

function onViewportChange() {
  if (open.value) updatePosition();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    e.preventDefault();
    open.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    void positionMenu();
    bindListeners();
  } else {
    unbindListeners();
  }
});

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKeydown);
  unbindListeners();
});
</script>

<template>
  <div ref="root" class="or-chat-room-menu-wrap">
    <button
      ref="triggerRef"
      type="button"
      class="or-app-chat-room-menu-btn"
      :class="{ active: open }"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-haspopup="true"
      :aria-label="isVi ? 'Tùy chọn phòng' : 'Room options'"
      @click="toggleMenu"
    >
      <ChatIcon name="more" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menuRef"
        class="or-chat-room-menu"
        :style="menuStyle"
        role="menu"
        @click.stop
      >
        <button type="button" class="or-chat-room-menu-item" role="menuitem" @click="run('pin')">
          <ChatIcon name="pin" />
          <span>{{ pinned ? (isVi ? 'Bỏ ghim' : 'Unpin') : isVi ? 'Ghim' : 'Pin' }}</span>
        </button>
        <button type="button" class="or-chat-room-menu-item" role="menuitem" @click="run('rename')">
          <ChatIcon name="edit" />
          <span>{{ isVi ? 'Đổi tên' : 'Rename' }}</span>
        </button>
        <button type="button" class="or-chat-room-menu-item" role="menuitem" @click="run('duplicate')">
          <ChatIcon name="duplicate" />
          <span>{{ isVi ? 'Nhân bản' : 'Duplicate' }}</span>
        </button>
        <button type="button" class="or-chat-room-menu-item is-danger" role="menuitem" @click="run('delete')">
          <ChatIcon name="trash" />
          <span>{{ isVi ? 'Xóa' : 'Delete' }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>
