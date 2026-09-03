<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useData } from 'vitepress';
import ChatMessageBody from './ChatMessageBody.vue';
import ChatModelPicker from './ChatModelPicker.vue';
import {
  chatAppPath,
  createChatSession,
  deleteChatSession,
  downloadChatBackup,
  getChatSession,
  groupSessionsByDate,
  importChatBackup,
  listChatSessions,
  loadChatMessages,
  purgeRemoteChatSessions,
  saveChatMessages,
  titleFromMessage,
  touchChatSession,
  type ChatAttachment,
  type ChatMessage,
  type ChatSession,
} from '../models/chat-storage';
import { sendAgentChat, uploadChatImage } from '../models/chat-api';
import {
  fetchChatModels,
  findChatModel,
  modelSubtitle,
  readLastChatModelId,
  writeLastChatModelId,
  type ChatModelOption,
} from '../models/chat-models';
import { fetchMe } from '../models/user-api';

const props = defineProps<{
  onCreditsRefresh?: () => void | Promise<void>;
}>();

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : '') as '' | '/vi');

const GROUP_LABELS = computed(() =>
  isVi.value
    ? { today: 'Hôm nay', yesterday: 'Hôm qua', older: 'Cũ hơn' }
    : { today: 'Today', yesterday: 'Yesterday', older: 'Older' },
);

const sessions = ref<ChatSession[]>([]);
const activeSessionId = ref('');
const messages = ref<ChatMessage[]>([]);
const search = ref('');
const input = ref('');
const streaming = ref(false);
const error = ref('');
const messagesEnd = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const pendingAttachments = ref<ChatAttachment[]>([]);
const chatModels = ref<ChatModelOption[]>([]);
const defaultModelId = ref('auto-router');
const modelsLoading = ref(true);

const activeSession = computed(() =>
  activeSessionId.value ? getChatSession(activeSessionId.value) : null,
);

const activeModelId = computed({
  get() {
    const session = activeSession.value;
    if (session?.modelId) return session.modelId;
    return defaultModelId.value;
  },
  set(modelId: string) {
    const sessionId = activeSessionId.value;
    if (!sessionId || !modelId) return;
    touchChatSession(sessionId, { modelId });
    writeLastChatModelId(modelId);
    refreshSessions();
  },
});

const activeModel = computed(() => findChatModel(chatModels.value, activeModelId.value));
const assistantLabel = computed(() => activeModel.value?.label || 'Assistant');

const filteredSessions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return sessions.value;
  return sessions.value.filter((s) => s.title.toLowerCase().includes(q));
});

const sessionGroups = computed(() => groupSessionsByDate(filteredSessions.value));
const dateGroupKeys = computed(() => ['today', 'yesterday', 'older'] as const);

function readSessionFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('session')?.trim() || '';
}

function navigateToSession(sessionId: string, replace = false) {
  const url = chatAppPath(prefix.value, sessionId);
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  activeSessionId.value = sessionId;
  messages.value = loadChatMessages(sessionId);
}

function refreshSessions() {
  sessions.value = listChatSessions();
}

function resolveModelForNewSession(): string {
  const last = readLastChatModelId();
  if (last && findChatModel(chatModels.value, last)) return last;
  return defaultModelId.value;
}

function ensureSessionModel(sessionId: string) {
  const session = getChatSession(sessionId);
  if (!session || session.modelId) return;
  touchChatSession(sessionId, { modelId: resolveModelForNewSession() });
  refreshSessions();
}

function ensureSession() {
  refreshSessions();
  const fromUrl = readSessionFromLocation();
  if (fromUrl && getChatSession(fromUrl)) {
    activeSessionId.value = fromUrl;
    messages.value = loadChatMessages(fromUrl);
    ensureSessionModel(fromUrl);
    return;
  }
  const existing = sessions.value[0];
  if (existing) {
    navigateToSession(existing.id, true);
    ensureSessionModel(existing.id);
    return;
  }
  const created = createChatSession(resolveModelForNewSession());
  refreshSessions();
  navigateToSession(created.id, true);
}

function handleNewChat() {
  const created = createChatSession(resolveModelForNewSession());
  refreshSessions();
  navigateToSession(created.id);
}

function handleSelect(sessionId: string) {
  navigateToSession(sessionId);
}

function handleDelete(sessionId: string) {
  deleteChatSession(sessionId);
  refreshSessions();
  if (activeSessionId.value !== sessionId) return;
  const remaining = listChatSessions();
  if (remaining[0]) navigateToSession(remaining[0].id, true);
  else {
    const created = createChatSession(resolveModelForNewSession());
    refreshSessions();
    navigateToSession(created.id, true);
  }
}

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' });
  });
}

watch(messages, scrollToBottom, { deep: true });
watch(streaming, scrollToBottom);

function buildUpstreamMessages(history: ChatMessage[]) {
  return history.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    text: m.text,
    attachments: (m.attachments ?? []) as unknown[],
  }));
}

function hasAttachments(history: ChatMessage[]): boolean {
  return history.some((m) => (m.attachments?.length ?? 0) > 0);
}

async function loadChatModelCatalog() {
  modelsLoading.value = true;
  try {
    const catalog = await fetchChatModels();
    chatModels.value = catalog.models;
    defaultModelId.value = catalog.defaultId;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load chat models';
  } finally {
    modelsLoading.value = false;
  }
}

function handleExportBackup() {
  downloadChatBackup();
}

function handleImportClick() {
  importInput.value?.click();
}

async function handleImportFile(e: Event) {
  const inputEl = e.target as HTMLInputElement;
  const file = inputEl.files?.[0];
  inputEl.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const count = importChatBackup(text);
    refreshSessions();
    ensureSession();
    error.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Import failed';
  }
}

function openImagePicker() {
  fileInput.value?.click();
}

async function handleImageSelected(e: Event) {
  const inputEl = e.target as HTMLInputElement;
  const file = inputEl.files?.[0];
  inputEl.value = '';
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const url = await uploadChatImage(file);
    pendingAttachments.value = [
      ...pendingAttachments.value,
      { type: 'image', url, name: file.name },
    ];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload failed';
  }
}

function removePendingAttachment(index: number) {
  pendingAttachments.value = pendingAttachments.value.filter((_, i) => i !== index);
}

async function runTurn(history: ChatMessage[], userMsg: ChatMessage, assistantId: string) {
  const sessionId = activeSessionId.value;
  const model = activeModel.value;
  const upstreamHistory = buildUpstreamMessages(history);
  const useStream = hasAttachments(history);

  streaming.value = true;

  try {
    const reply = await sendAgentChat(
      {
        sessionId,
        query: userMsg.text,
        messages: upstreamHistory,
        agentId: model?.agentId,
        server: model?.server,
        model: model?.model,
        useStream,
      },
      (partial) => {
        messages.value = messages.value.map((m) =>
          m.id === assistantId ? { ...m, text: partial } : m,
        );
      },
    );

    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: reply } : m,
    );
    saveChatMessages(sessionId, messages.value);

    await fetchMe().catch(() => undefined);
    await props.onCreditsRefresh?.();
    touchChatSession(sessionId);
    refreshSessions();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    error.value = message;
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: `Error: ${message}` } : m,
    );
    saveChatMessages(sessionId, messages.value);
  } finally {
    streaming.value = false;
  }
}

async function handleSend() {
  const text = input.value.trim();
  const sessionId = activeSessionId.value;
  if ((!text && pendingAttachments.value.length === 0) || !sessionId || streaming.value) return;

  error.value = '';
  const attachments = [...pendingAttachments.value];
  pendingAttachments.value = [];
  input.value = '';

  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    text: text || (isVi.value ? '(ảnh đính kèm)' : '(image attached)'),
    createdAt: Date.now(),
    attachments: attachments.length ? attachments : undefined,
  };
  const history = [...messages.value, userMsg];
  messages.value = history;
  saveChatMessages(sessionId, history);
  touchChatSession(sessionId, { title: titleFromMessage(userMsg.text) });
  refreshSessions();

  const assistantId = crypto.randomUUID();
  messages.value = [
    ...history,
    { id: assistantId, role: 'assistant', text: '', createdAt: Date.now() },
  ];
  saveChatMessages(sessionId, messages.value);

  await runTurn(history, userMsg, assistantId);
}

async function handleRegenerate(assistantMessageId: string) {
  const sessionId = activeSessionId.value;
  if (!sessionId || streaming.value) return;
  const idx = messages.value.findIndex((m) => m.id === assistantMessageId);
  if (idx < 1) return;
  const userMsg = messages.value[idx - 1];
  if (userMsg.role !== 'user') return;

  const history = messages.value.slice(0, idx);
  messages.value = history;
  saveChatMessages(sessionId, history);

  const assistantId = crypto.randomUUID();
  messages.value = [
    ...history,
    { id: assistantId, role: 'assistant', text: '', createdAt: Date.now() },
  ];
  saveChatMessages(sessionId, messages.value);

  await runTurn(history, userMsg, assistantId);
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void handleSend();
  }
}

async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

function onPopState() {
  const id = readSessionFromLocation();
  if (id && getChatSession(id)) {
    activeSessionId.value = id;
    messages.value = loadChatMessages(id);
  }
}

onMounted(() => {
  purgeRemoteChatSessions();
  void loadChatModelCatalog().finally(() => ensureSession());
  window.addEventListener('popstate', onPopState);
});

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState);
});
</script>

<template>
  <div class="or-app-chat">
    <aside class="or-app-chat-sidebar">
      <div class="or-app-chat-sidebar-head">
        <h2 class="or-app-chat-sidebar-title">Chat</h2>
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-chat-new" @click="handleNewChat">
          {{ isVi ? '+ Chat mới' : '+ New chat' }}
        </button>
        <input
          v-model="search"
          type="search"
          class="or-app-chat-search"
          :placeholder="isVi ? 'Tìm phòng chat…' : 'Search chats…'"
        />
      </div>

      <div class="or-app-chat-rooms">
        <template v-if="filteredSessions.length === 0">
          <p class="or-app-chat-empty">{{ isVi ? 'Chưa có chat' : 'No chats yet' }}</p>
        </template>
        <template v-else>
          <div v-for="key in dateGroupKeys" :key="key">
            <template v-if="sessionGroups[key].length">
              <p class="or-app-chat-group">{{ GROUP_LABELS[key] }}</p>
              <ul class="or-app-chat-room-list">
                <li v-for="session in sessionGroups[key]" :key="session.id">
                  <div
                    class="or-app-chat-room"
                    :class="{ active: session.id === activeSessionId }"
                  >
                    <button
                      type="button"
                      class="or-app-chat-room-btn"
                      @click="handleSelect(session.id)"
                    >
                      {{ session.title }}
                    </button>
                    <button
                      type="button"
                      class="or-app-chat-room-delete"
                      :aria-label="isVi ? 'Xóa' : 'Delete'"
                      @click="handleDelete(session.id)"
                    >
                      ×
                    </button>
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </template>
      </div>

      <div class="or-app-chat-sidebar-actions">
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-chat-side-btn" @click="handleExportBackup">
          Export
        </button>
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-chat-side-btn" @click="handleImportClick">
          Import
        </button>
        <input ref="importInput" type="file" accept="application/json,.json" hidden @change="handleImportFile" />
      </div>
      <p v-if="activeModel" class="or-app-chat-sidebar-foot">{{ modelSubtitle(activeModel) }}</p>
    </aside>

    <div class="or-app-chat-main">
      <header class="or-app-chat-toolbar">
        <ChatModelPicker
          v-model:model-id="activeModelId"
          :models="chatModels"
          :disabled="streaming || modelsLoading || chatModels.length === 0"
          :is-vi="isVi"
        />
        <h3 class="or-app-chat-thread-title">{{ activeSession?.title || 'Chat' }}</h3>
      </header>

      <div v-if="error" class="or-app-alert or-app-chat-error">{{ error }}</div>

      <div class="or-app-chat-messages">
        <template v-if="messages.length === 0">
          <div class="or-app-chat-welcome">
            <p class="or-app-chat-welcome-title">{{ isVi ? 'Hỏi bất cứ điều gì' : 'Ask anything' }}</p>
            <p class="or-app-chat-welcome-desc">
              {{
                isVi
                  ? 'Chọn model, đính kèm ảnh, hoặc export/import backup local.'
                  : 'Pick a model, attach images, or export/import local backup.'
              }}
            </p>
          </div>
        </template>
        <template v-else>
          <div
            v-for="message in messages"
            :key="message.id"
            class="or-app-chat-msg"
            :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
          >
            <p v-if="message.role === 'assistant'" class="or-app-chat-msg-label">{{ assistantLabel }}</p>
            <div class="or-app-chat-bubble">
              <div v-if="message.attachments?.length" class="or-app-chat-attachments">
                <img
                  v-for="(att, i) in message.attachments"
                  :key="`${message.id}-att-${i}`"
                  :src="att.url"
                  :alt="att.name || 'attachment'"
                  class="or-app-chat-attachment-img"
                />
              </div>
              <div v-if="message.text || (streaming && message.role === 'assistant')" class="or-app-chat-bubble-row">
                <ChatMessageBody
                  :text="message.text || (streaming ? '…' : '')"
                  :markdown="message.role === 'assistant'"
                />
                <div v-if="message.text" class="or-app-chat-msg-actions">
                  <button
                    type="button"
                    class="or-app-chat-action"
                    :aria-label="isVi ? 'Sao chép' : 'Copy'"
                    @click="copyMessage(message.text)"
                  >
                    ⧉
                  </button>
                  <button
                    v-if="message.role === 'assistant' && !streaming"
                    type="button"
                    class="or-app-chat-action"
                    :aria-label="isVi ? 'Tạo lại' : 'Regenerate'"
                    @click="handleRegenerate(message.id)"
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div ref="messagesEnd" />
      </div>

      <footer class="or-app-chat-composer-wrap">
        <div v-if="pendingAttachments.length" class="or-app-chat-pending">
          <div v-for="(att, i) in pendingAttachments" :key="`pending-${i}`" class="or-app-chat-pending-item">
            <img :src="att.url" :alt="att.name" class="or-app-chat-pending-img" />
            <button type="button" class="or-app-chat-pending-remove" @click="removePendingAttachment(i)">×</button>
          </div>
        </div>
        <div class="or-app-chat-composer">
          <button
            type="button"
            class="or-app-btn or-app-btn-ghost or-app-chat-attach"
            :disabled="streaming"
            :aria-label="isVi ? 'Đính kèm ảnh' : 'Attach image'"
            @click="openImagePicker"
          >
            🖼
          </button>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleImageSelected" />
          <textarea
            v-model="input"
            class="or-app-chat-input"
            rows="1"
            :placeholder="isVi ? 'Nhập tin nhắn…' : 'Ask anything…'"
            :disabled="streaming"
            @keydown="onComposerKeydown"
          />
          <button
            type="button"
            class="or-app-btn or-app-btn-primary or-app-chat-send"
            :disabled="streaming || (!input.trim() && !pendingAttachments.length)"
            @click="handleSend"
          >
            {{ streaming ? '…' : '↑' }}
          </button>
        </div>
        <p class="or-app-chat-disclaimer">
          {{
            isVi
              ? 'Phản hồi do AI tạo — có thể không chính xác.'
              : 'Responses are AI-generated and may be inaccurate.'
          }}
        </p>
      </footer>
    </div>
  </div>
</template>
