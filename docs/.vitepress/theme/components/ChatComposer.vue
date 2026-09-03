<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { ChatModelOption } from '../models/chat-models';
import { readChatSettings, writeChatSettings, type ChatSettings } from '../models/chat-settings';

const props = defineProps<{
  input: string;
  streaming: boolean;
  isVi: boolean;
  activeModel: ChatModelOption | null;
  pendingCount: number;
  imageGenMode?: boolean;
}>();

const emit = defineEmits<{
  'update:input': [value: string];
  send: [];
  stop: [];
  attachImage: [];
  enableImageGen: [];
  cancelImageGen: [];
  exportBackup: [];
  importBackup: [];
  settingsChange: [settings: ChatSettings];
}>();

const plusOpen = ref(false);
const toolsOpen = ref(false);
const memoryOpen = ref(false);
const root = ref<HTMLElement | null>(null);
const settings = ref<ChatSettings>(readChatSettings());

const memoryUnlimited = computed({
  get: () => settings.value.memoryMode === 'all',
  set: (on: boolean) => {
    settings.value = { ...settings.value, memoryMode: on ? 'all' : 'limited' };
    persistSettings();
  },
});

const memoryTurns = computed({
  get: () => settings.value.memoryTurns,
  set: (n: number) => {
    settings.value = { ...settings.value, memoryTurns: Math.min(200, Math.max(2, n)) };
    persistSettings();
  },
});

const canWebSearch = computed(() => props.activeModel?.webSearch === true);
const canWebFetch = computed(() => props.activeModel?.webFetch === true);
const streamCapable = computed(
  () => props.activeModel?.chatApiMode === 'stream' || settings.value.preferStream,
);
const toolsNeedStream = computed(() => streamCapable.value);

function persistSettings() {
  writeChatSettings(settings.value);
  emit('settingsChange', { ...settings.value });
}

function toggleWebSearch() {
  if (!canWebSearch.value) return;
  settings.value = { ...settings.value, webSearch: !settings.value.webSearch };
  persistSettings();
}

function toggleWebFetch() {
  if (!canWebFetch.value) return;
  settings.value = { ...settings.value, webFetch: !settings.value.webFetch };
  persistSettings();
}

function togglePreferStream() {
  settings.value = { ...settings.value, preferStream: !settings.value.preferStream };
  persistSettings();
}

function closeMenus() {
  plusOpen.value = false;
  toolsOpen.value = false;
  memoryOpen.value = false;
}

function onDocClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) closeMenus();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!props.streaming) emit('send');
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <footer ref="root" class="or-chat-composer-wrap">
    <div v-if="imageGenMode" class="or-chat-composer-mode-hint">
      <span>{{ isVi ? 'Chế độ tạo ảnh — mô tả prompt rồi gửi' : 'Image generation — describe your prompt and send' }}</span>
      <button type="button" class="or-chat-composer-mode-exit" @click="emit('cancelImageGen')">×</button>
    </div>
    <div v-else-if="pendingCount" class="or-chat-composer-pending-hint">
      {{ isVi ? `${pendingCount} ảnh đính kèm` : `${pendingCount} image(s) attached` }}
    </div>

    <div class="or-chat-composer-box">
      <div class="or-chat-composer-tools">
        <div class="or-chat-composer-tool-wrap">
          <button
            type="button"
            class="or-chat-composer-icon"
            :disabled="streaming"
            :aria-label="isVi ? 'Thêm' : 'Add'"
            @click.stop="plusOpen = !plusOpen; toolsOpen = false; memoryOpen = false"
          >
            +
          </button>
          <div v-if="plusOpen" class="or-chat-composer-pop" @click.stop>
            <button type="button" class="or-chat-composer-pop-item" @click="emit('attachImage'); closeMenus()">
              {{ isVi ? 'Đính kèm ảnh' : 'Attach image' }}
            </button>
            <button type="button" class="or-chat-composer-pop-item" @click="emit('enableImageGen'); closeMenus()">
              {{ isVi ? 'Tạo ảnh (job)' : 'Generate image' }}
            </button>
            <button type="button" class="or-chat-composer-pop-item" @click="emit('exportBackup'); closeMenus()">
              Export backup
            </button>
            <button type="button" class="or-chat-composer-pop-item" @click="emit('importBackup'); closeMenus()">
              Import backup
            </button>
          </div>
        </div>

        <div class="or-chat-composer-tool-wrap">
          <button
            type="button"
            class="or-chat-composer-icon"
            :class="{ active: toolsOpen || settings.webSearch || settings.webFetch }"
            :disabled="streaming"
            :aria-label="isVi ? 'Công cụ' : 'Tools'"
            @click.stop="toolsOpen = !toolsOpen; plusOpen = false; memoryOpen = false"
          >
            ⚙
          </button>
          <div v-if="toolsOpen" class="or-chat-composer-pop or-chat-composer-pop-wide" @click.stop>
            <p class="or-chat-composer-pop-title">{{ isVi ? 'Công cụ server' : 'Server tools' }}</p>
            <p v-if="!streamCapable" class="or-chat-composer-pop-hint">
              {{ isVi ? 'Bật “Stream” trong ∞ hoặc chọn model stream.' : 'Enable “Stream” in ∞ or pick a stream model.' }}
            </p>
            <label class="or-chat-tool-row" :class="{ disabled: !canWebSearch || !toolsNeedStream }">
              <span>
                <strong>{{ isVi ? 'Tìm web' : 'Web search' }}</strong>
                <small>{{ isVi ? 'Thông tin mới' : 'Current information' }}</small>
              </span>
              <input
                type="checkbox"
                :checked="settings.webSearch"
                :disabled="!canWebSearch || !toolsNeedStream || streaming"
                @change="toggleWebSearch"
              />
            </label>
            <label class="or-chat-tool-row" :class="{ disabled: !canWebFetch || !toolsNeedStream }">
              <span>
                <strong>{{ isVi ? 'Lấy URL' : 'Web fetch' }}</strong>
                <small>{{ isVi ? 'Đọc nội dung trang' : 'Fetch page content' }}</small>
              </span>
              <input
                type="checkbox"
                :checked="settings.webFetch"
                :disabled="!canWebFetch || !toolsNeedStream || streaming"
                @change="toggleWebFetch"
              />
            </label>
          </div>
        </div>

        <div class="or-chat-composer-tool-wrap">
          <button
            type="button"
            class="or-chat-composer-icon"
            :class="{ active: memoryOpen || settings.memoryMode === 'limited' || settings.preferStream }"
            :disabled="streaming"
            :aria-label="isVi ? 'Bộ nhớ chat' : 'Chat memory'"
            @click.stop="memoryOpen = !memoryOpen; plusOpen = false; toolsOpen = false"
          >
            ∞
          </button>
          <div v-if="memoryOpen" class="or-chat-composer-pop or-chat-composer-pop-wide" @click.stop>
            <div class="or-chat-memory-head">
              <p class="or-chat-composer-pop-title">{{ isVi ? 'Bộ nhớ chat' : 'Chat memory' }}</p>
              <label class="or-chat-memory-toggle">
                <span>∞</span>
                <input v-model="memoryUnlimited" type="checkbox" :disabled="streaming" />
              </label>
            </div>
            <input
              v-model.number="memoryTurns"
              type="range"
              class="or-chat-memory-slider"
              min="2"
              max="80"
              step="1"
              :disabled="memoryUnlimited || streaming"
            />
            <p class="or-chat-composer-pop-hint">
              {{
                memoryUnlimited
                  ? isVi
                    ? 'Gửi toàn bộ lịch sử mỗi lần.'
                    : 'Sends all messages each request.'
                  : isVi
                    ? `Gửi tối đa ${memoryTurns} lượt user gần nhất.`
                    : `Sends up to ${memoryTurns} recent user turns.`
              }}
            </p>
            <label class="or-chat-tool-row">
              <span>
                <strong>{{ isVi ? 'Stream từng token' : 'Stream tokens' }}</strong>
                <small>{{ isVi ? 'Gõ dần thay vì chờ một cục' : 'Typewriter effect vs one-shot JSON' }}</small>
              </span>
              <input
                type="checkbox"
                :checked="settings.preferStream"
                :disabled="streaming"
                @change="togglePreferStream"
              />
            </label>
          </div>
        </div>
      </div>

      <textarea
        :value="input"
        class="or-chat-composer-input"
        rows="1"
        :placeholder="
          imageGenMode
            ? isVi
              ? 'Mô tả ảnh muốn tạo…'
              : 'Describe the image to generate…'
            : isVi
              ? 'Hỏi bất cứ điều gì…'
              : 'Ask anything…'
        "
        :disabled="streaming"
        @input="emit('update:input', ($event.target as HTMLTextAreaElement).value)"
        @keydown="onKeydown"
      />

      <div class="or-chat-composer-actions">
        <button
          v-if="streaming"
          type="button"
          class="or-chat-composer-stop"
          :aria-label="isVi ? 'Dừng' : 'Stop'"
          @click="emit('stop')"
        >
          ■
        </button>
        <button
          v-else
          type="button"
          class="or-chat-composer-send"
          :disabled="!input.trim() && !pendingCount"
          :aria-label="isVi ? 'Gửi' : 'Send'"
          @click="emit('send')"
        >
          ↑
        </button>
      </div>
    </div>

    <p class="or-chat-composer-disclaimer">
      {{
        isVi
          ? 'Phản hồi do AI tạo — có thể không chính xác. Hãy kiểm tra trước khi tin.'
          : 'Responses are AI-generated and can be inaccurate. Review outputs before relying on them.'
      }}
    </p>
  </footer>
</template>
