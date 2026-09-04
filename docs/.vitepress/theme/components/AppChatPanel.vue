<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useData } from 'vitepress';
import ChatMessageBody from './ChatMessageBody.vue';
import ChatMessageActionBar from './ChatMessageActionBar.vue';
import ChatModelPicker from './ChatModelPicker.vue';
import ChatComposer from './ChatComposer.vue';
import ChatIcon from './ChatIcon.vue';
import ChatRoomMenu from './ChatRoomMenu.vue';
import {
  chatAppPath,
  clearAllChatSessions,
  createChatSession,
  deleteChatSession,
  downloadChatBackup,
  duplicateChatSession,
  getChatSession,
  groupSessionsByDate,
  importChatBackup,
  listChatSessions,
  loadChatMessages,
  purgeRemoteChatSessions,
  renameChatSession,
  saveChatMessages,
  togglePinChatSession,
  backfillChatSessionPreviews,
  titleFromMessage,
  touchChatSession,
  type ChatAttachment,
  type ChatMessage,
  type ChatSession,
} from '../models/chat-storage';
import { sendAgentChat, uploadChatImage } from '../models/chat-api';
import {
  createImageJobWait,
  fetchImageCatalogModels,
  readLastImageModelSlug,
  resolveImageModel,
} from '../models/chat-image-job';
import type { CatalogModel } from '../models/catalog-api';
import {
  catalogJobFieldDefs,
  formatImageJobFieldSummary,
  resolveImageFieldValues,
  validateCatalogJobFields,
  writeImageFieldValues,
  type CatalogJobField,
  type CatalogJobFieldValues,
} from '../models/catalog-job-fields';
import {
  fetchChatModels,
  findChatModel,
  formatReplyMeta,
  modelSubtitle,
  readLastChatModelId,
  repairStaleModelIds,
  resolveValidModelId,
  writeLastChatModelId,
  modelRequiresStream,
  type ChatModelOption,
} from '../models/chat-models';
import { formatChatError } from '../models/chat-errors';
import { sliceHistoryForUpstream } from '../models/chat-memory';
import { readChatSettings, type ChatSettings } from '../models/chat-settings';
import {
  fetchMe,
  formatCredits,
  getCachedMe,
  getCredits,
  resolveChatCostCredits,
} from '../models/user-api';
import { appendUsageRecord } from '../models/usage-history';

const LOW_CREDIT_THRESHOLD = 15_000;
const LOW_CREDIT_DISMISS_KEY = 'gw_portal_chat_low_credit_dismiss_v1';

const props = defineProps<{
  credits?: number;
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
const messagesScrollRef = ref<HTMLElement | null>(null);
const showScrollDown = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const pendingAttachments = ref<ChatAttachment[]>([]);
const chatModels = ref<ChatModelOption[]>([]);
const defaultModelId = ref('auto-router');
const modelsLoading = ref(true);
const chatAbort = ref<AbortController | null>(null);
const editingTitle = ref(false);
const titleDraft = ref('');
const titleInputRef = ref<HTMLInputElement | null>(null);
const editingRoomId = ref('');
const roomTitleDraft = ref('');
const roomTitleInputRef = ref<HTMLInputElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const sidebarOpen = ref(false);
const chatSettings = ref<ChatSettings>(readChatSettings());
const staleModelNotice = ref('');
const copiedToast = ref('');
const editingMessageId = ref('');
const editingMessageDraft = ref('');
const messageEditRef = ref<HTMLTextAreaElement | null>(null);
const chatErrorHint = ref<{ message: string; suggestModel: boolean; suggestRetry: boolean } | null>(
  null,
);
const imageGenMode = ref(false);
const imageModels = ref<CatalogModel[]>([]);
const imageModelsLoading = ref(false);
const imageModelSlug = ref('');
const imageFieldValues = ref<CatalogJobFieldValues>({});
const lowCreditDismissed = ref(false);
const localCredits = ref<number | null>(null);

const creditsBalance = computed(() => {
  if (typeof props.credits === 'number') return props.credits;
  if (localCredits.value != null) return localCredits.value;
  return null;
});

const showLowCreditBanner = computed(() => {
  if (lowCreditDismissed.value) return false;
  const balance = creditsBalance.value;
  if (balance == null) return false;
  return balance > 0 && balance < LOW_CREDIT_THRESHOLD;
});

const activeImageModel = computed(() => resolveImageModel(imageModels.value, imageModelSlug.value));

const imageFieldDefs = computed(() => catalogJobFieldDefs(activeImageModel.value));

function syncImageFieldValues(model?: CatalogModel | null) {
  const m = model ?? activeImageModel.value;
  if (!m) {
    imageFieldValues.value = {};
    return;
  }
  imageFieldValues.value = resolveImageFieldValues(m, imageFieldValues.value);
}

function setImageField(field: CatalogJobField, value: string) {
  imageFieldValues.value = { ...imageFieldValues.value, [field]: value };
  const model = activeImageModel.value;
  if (model) writeImageFieldValues(model.slug, imageFieldValues.value);
}

const activeSession = computed(() => {
  const id = activeSessionId.value;
  if (!id) return null;
  return sessions.value.find((s) => s.id === id) ?? getChatSession(id);
});

const activeModelId = computed({
  get() {
    const session = activeSession.value;
    const raw = session?.modelId || defaultModelId.value;
    return resolveValidModelId(raw, chatModels.value, defaultModelId.value);
  },
  set(modelId: string) {
    const sessionId = activeSessionId.value;
    if (!sessionId || !modelId) return;
    touchChatSession(sessionId, { modelId });
    writeLastChatModelId(modelId);
    refreshSessions();
    staleModelNotice.value = '';
    chatErrorHint.value = null;
  },
});

const activeModel = computed(() => findChatModel(chatModels.value, activeModelId.value));

const filteredSessions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return sessions.value;
  return sessions.value.filter((s) => s.title.toLowerCase().includes(q));
});

const sessionGroups = computed(() => groupSessionsByDate(filteredSessions.value));
const dateGroupKeys = computed(() => ['today', 'yesterday', 'older'] as const);

function dismissLowCreditBanner() {
  lowCreditDismissed.value = true;
  try {
    sessionStorage.setItem(LOW_CREDIT_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

async function refreshCreditsBalance() {
  try {
    const me = await fetchMe();
    localCredits.value = getCredits(me);
  } catch {
    /* ignore */
  }
}

function readCreditsBalance(): number | null {
  if (typeof props.credits === 'number') return props.credits;
  if (localCredits.value != null) return localCredits.value;
  const cached = getCachedMe();
  if (cached) return getCredits(cached);
  return null;
}

async function ensureImageCatalog() {
  if (imageModels.value.length) return;
  imageModelsLoading.value = true;
  try {
    imageModels.value = await fetchImageCatalogModels();
    const model = resolveImageModel(imageModels.value, readLastImageModelSlug());
    if (!model) {
      throw new Error(
        isVi.value ? 'Không có model image trong catalog.' : 'No image models in catalog.',
      );
    }
    imageModelSlug.value = model.slug;
    syncImageFieldValues(model);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load image models';
    imageGenMode.value = false;
  } finally {
    imageModelsLoading.value = false;
  }
}

async function handleEnableImageGen() {
  error.value = '';
  imageGenMode.value = true;
  pendingAttachments.value = [];
  await ensureImageCatalog();
}

function handleCancelImageGen() {
  imageGenMode.value = false;
}

function onImageModelChange() {
  syncImageFieldValues();
}

watch(imageModelSlug, onImageModelChange);

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
  sidebarOpen.value = false;
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
  if (editingRoomId.value && editingRoomId.value !== sessionId) {
    cancelRenameRoom();
  }
  navigateToSession(sessionId);
}

function handleDelete(sessionId: string) {
  const session = getChatSession(sessionId);
  if (!session) return;
  const label = session.title || (isVi.value ? 'phòng chat' : 'chat');
  const msg = isVi.value
    ? `Xóa "${label}"? Không thể hoàn tác.`
    : `Delete "${label}"? This cannot be undone.`;
  if (!confirm(msg)) return;

  if (editingRoomId.value === sessionId) {
    cancelRenameRoom();
  }
  if (streaming.value && activeSessionId.value === sessionId) {
    handleStop();
  }
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

function handlePinRoom(sessionId: string) {
  togglePinChatSession(sessionId);
  refreshSessions();
}

function startRenameRoom(sessionId: string) {
  if (streaming.value && sessionId === activeSessionId.value) return;
  const session = getChatSession(sessionId);
  if (!session) return;
  editingRoomId.value = sessionId;
  roomTitleDraft.value = session.title;
  nextTick(() => {
    roomTitleInputRef.value?.focus();
    roomTitleInputRef.value?.select();
  });
}

function commitRenameRoom(sessionId: string) {
  if (editingRoomId.value !== sessionId) return;
  renameChatSession(sessionId, roomTitleDraft.value);
  const trimmed = roomTitleDraft.value.trim();
  editingRoomId.value = '';
  refreshSessions();
  if (activeSessionId.value === sessionId) {
    titleDraft.value = trimmed || getChatSession(sessionId)?.title || 'Chat';
  }
}

function cancelRenameRoom() {
  editingRoomId.value = '';
}

function onRoomTitleKeydown(e: KeyboardEvent, sessionId: string) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitRenameRoom(sessionId);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelRenameRoom();
    (e.target as HTMLInputElement).blur();
  }
}

function handleDuplicateRoom(sessionId: string) {
  const copy = duplicateChatSession(sessionId);
  if (!copy) return;
  refreshSessions();
  navigateToSession(copy.id);
}

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' });
    showScrollDown.value = false;
  });
}

function updateScrollDownState() {
  const el = messagesScrollRef.value;
  if (!el) {
    showScrollDown.value = false;
    return;
  }
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  showScrollDown.value = distance > 120;
}

function onMessagesScroll() {
  updateScrollDownState();
}

function isStreamingMessage(messageId: string): boolean {
  if (!streaming.value) return false;
  const last = messages.value[messages.value.length - 1];
  return last?.id === messageId && last.role === 'assistant';
}

/** Lock edit/delete/regenerate on the in-flight user+assistant pair while streaming. */
function messageActionsLocked(messageId: string): boolean {
  if (!streaming.value) return false;
  const idx = messages.value.findIndex((m) => m.id === messageId);
  if (idx < 0) return true;
  const lastIdx = messages.value.length - 1;
  const last = messages.value[lastIdx];
  if (last?.role !== 'assistant') return true;
  return idx >= lastIdx - 1;
}

watch(messages, scrollToBottom, { deep: true });
watch(streaming, scrollToBottom);
watch(messages, () => nextTick(updateScrollDownState), { deep: true });

function buildUpstreamMessages(history: ChatMessage[]) {
  const sliced = sliceHistoryForUpstream(
    history,
    chatSettings.value.memoryMode,
    chatSettings.value.memoryTurns,
  );
  return sliced.map((m) => ({
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
    const fixed = repairStaleModelIds(catalog.models, catalog.defaultId);
    if (fixed > 0) {
      staleModelNotice.value = isVi.value
        ? `Đã đổi ${fixed} phòng sang model mặc định (catalog đã cập nhật).`
        : `Reset ${fixed} room(s) to default model (catalog updated).`;
      refreshSessions();
    }
    ensureStaleSessionModels();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load chat models';
  } finally {
    modelsLoading.value = false;
  }
}

function ensureStaleSessionModels() {
  const sessionId = activeSessionId.value;
  if (!sessionId) return;
  const session = getChatSession(sessionId);
  if (!session?.modelId) return;
  const valid = resolveValidModelId(session.modelId, chatModels.value, defaultModelId.value);
  if (valid !== session.modelId) {
    touchChatSession(sessionId, { modelId: valid });
    refreshSessions();
  }
}

function handleSettingsChange(settings: ChatSettings) {
  chatSettings.value = settings;
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
  const useStream =
    hasAttachments(history) ||
    chatSettings.value.preferStream ||
    modelRequiresStream(model);
  const tools =
    useStream && model
      ? {
          web_search: chatSettings.value.webSearch && model.webSearch === true,
          web_fetch: chatSettings.value.webFetch && model.webFetch === true,
        }
      : undefined;

  const controller = new AbortController();
  chatAbort.value = controller;
  streaming.value = true;
  chatErrorHint.value = null;
  const balanceBefore = readCreditsBalance();

  try {
    const result = await sendAgentChat(
      {
        sessionId,
        query: userMsg.text,
        messages: upstreamHistory,
        agentId: model?.agentId,
        server: model?.server,
        model: model?.model,
        projectId: model?.projectId,
        useStream,
        chatTools: tools,
        signal: controller.signal,
      },
      (partial) => {
        messages.value = messages.value.map((m) =>
          m.id === assistantId ? { ...m, text: partial, isError: false } : m,
        );
      },
    );

    const me = await fetchMe().catch(() => null);
    const balanceAfter = me ? getCredits(me) : null;
    if (balanceAfter != null) localCredits.value = balanceAfter;

    const costCredits = resolveChatCostCredits({
      balanceBefore,
      balanceAfter,
      usageCredits: result.usage?.credits,
    });

    const meta = {
      latencyMs: result.latencyMs,
      totalTokens: result.usage?.totalTokens,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      modelLabel: model?.label,
      costCredits,
      balanceAfter: balanceAfter ?? undefined,
    };

    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: result.text, meta, isError: false } : m,
    );
    saveChatMessages(sessionId, messages.value);

    await props.onCreditsRefresh?.();
    touchChatSession(sessionId);
    refreshSessions();
  } catch (err) {
    if (controller.signal.aborted) {
      saveChatMessages(sessionId, messages.value);
      return;
    }
    const formatted = formatChatError(err, isVi.value);
    chatErrorHint.value = formatted;
    error.value = formatted.message;
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: formatted.message, isError: true } : m,
    );
    saveChatMessages(sessionId, messages.value);
  } finally {
    chatAbort.value = null;
    streaming.value = false;
  }
}

function handleStop() {
  chatAbort.value?.abort();
}

async function runImageTurn(history: ChatMessage[], userMsg: ChatMessage, assistantId: string) {
  const sessionId = activeSessionId.value;
  const model = activeImageModel.value;
  if (!sessionId || !model) {
    error.value = isVi.value ? 'Chọn model image.' : 'Pick an image model.';
    return;
  }

  const fieldValues = { ...imageFieldValues.value };
  const validationError = validateCatalogJobFields(model, fieldValues, isVi.value);
  if (validationError) {
    error.value = validationError;
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: validationError, isError: true } : m,
    );
    saveChatMessages(sessionId, messages.value);
    return;
  }

  const controller = new AbortController();
  chatAbort.value = controller;
  streaming.value = true;
  chatErrorHint.value = null;

  const progressText = isVi.value ? 'Đang tạo ảnh…' : 'Generating image…';
  messages.value = messages.value.map((m) =>
    m.id === assistantId ? { ...m, text: progressText, isError: false } : m,
  );

  try {
    const result = await createImageJobWait(model, userMsg.text, fieldValues, controller.signal);
    const fieldSummary = formatImageJobFieldSummary(result.fields);
    const caption = isVi.value
      ? `Ảnh từ **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`
      : `Image from **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`;
    const meta = {
      latencyMs: result.latencyMs,
      modelLabel: result.modelLabel,
      jobType: 'image' as const,
      imageRatio: result.fields.ratio,
      costCredits: result.credits ?? undefined,
    };

    messages.value = messages.value.map((m) =>
      m.id === assistantId
        ? {
            ...m,
            text: caption,
            attachments: [{ type: 'image' as const, url: result.resultUrl, name: result.modelLabel }],
            meta,
            isError: false,
          }
        : m,
    );
    saveChatMessages(sessionId, messages.value);

    appendUsageRecord({
      jobType: 'image',
      model: result.modelSlug,
      prompt: userMsg.text,
      status: 'success',
      credits: result.credits ?? null,
      jobId: result.jobId,
      resultUrl: result.resultUrl,
      source: 'playground',
    });

    await refreshCreditsBalance();
    await props.onCreditsRefresh?.();
    touchChatSession(sessionId);
    refreshSessions();
    imageGenMode.value = false;
  } catch (err) {
    if (controller.signal.aborted) {
      saveChatMessages(sessionId, messages.value);
      return;
    }
    const formatted = formatChatError(err, isVi.value);
    chatErrorHint.value = formatted;
    error.value = formatted.message;
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: formatted.message, isError: true } : m,
    );
    saveChatMessages(sessionId, messages.value);

    appendUsageRecord({
      jobType: 'image',
      model: model.slug,
      prompt: userMsg.text,
      status: 'failed',
      credits: model.credits ?? null,
      source: 'playground',
    });
  } finally {
    chatAbort.value = null;
    streaming.value = false;
  }
}

async function handleSend() {
  const text = input.value.trim();
  const sessionId = activeSessionId.value;
  if ((!text && pendingAttachments.value.length === 0) || !sessionId || streaming.value) return;
  if (imageGenMode.value && !text) return;

  error.value = '';
  chatErrorHint.value = null;
  const attachments = imageGenMode.value ? [] : [...pendingAttachments.value];
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
  const session = getChatSession(sessionId);
  if (!session || session.title === 'New chat') {
    touchChatSession(sessionId, { title: titleFromMessage(userMsg.text) });
  } else {
    touchChatSession(sessionId);
  }
  refreshSessions();

  const assistantId = crypto.randomUUID();
  messages.value = [
    ...history,
    { id: assistantId, role: 'assistant', text: '', createdAt: Date.now() },
  ];
  saveChatMessages(sessionId, messages.value);

  if (imageGenMode.value) {
    await runImageTurn(history, userMsg, assistantId);
    return;
  }

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

async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedToast.value = isVi.value ? 'Đã copy' : 'Copied';
    window.setTimeout(() => {
      copiedToast.value = '';
    }, 1500);
  } catch {
    /* ignore */
  }
}

async function shareChatLink() {
  if (!activeSessionId.value || typeof window === 'undefined') return;
  const url = `${window.location.origin}${chatAppPath(prefix.value, activeSessionId.value)}`;
  try {
    await navigator.clipboard.writeText(url);
    copiedToast.value = isVi.value ? 'Đã copy link phòng' : 'Room link copied';
    window.setTimeout(() => {
      copiedToast.value = '';
    }, 1500);
  } catch {
    copiedToast.value = isVi.value ? 'Không copy được link' : 'Could not copy link';
  }
}

function startEditMessage(messageId: string) {
  if (streaming.value) return;
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg || msg.role !== 'user') return;
  editingMessageId.value = messageId;
  editingMessageDraft.value = msg.text;
  nextTick(() => messageEditRef.value?.focus());
}

function cancelEditMessage() {
  editingMessageId.value = '';
  editingMessageDraft.value = '';
}

async function commitEditMessage(messageId: string) {
  const sessionId = activeSessionId.value;
  if (!sessionId || streaming.value || editingMessageId.value !== messageId) return;
  const text = editingMessageDraft.value.trim();
  if (!text) return;

  const idx = messages.value.findIndex((m) => m.id === messageId);
  if (idx < 0 || messages.value[idx].role !== 'user') return;

  cancelEditMessage();
  const userMsg: ChatMessage = { ...messages.value[idx], text };
  const history = [...messages.value.slice(0, idx), userMsg];
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

function handleDeleteMessage(messageId: string) {
  const sessionId = activeSessionId.value;
  if (!sessionId || messageActionsLocked(messageId)) return;
  const idx = messages.value.findIndex((m) => m.id === messageId);
  if (idx < 0) return;

  const next = messages.value.slice(0, idx);
  messages.value = next;
  saveChatMessages(sessionId, next);
  if (editingMessageId.value === messageId) cancelEditMessage();
}

function onEditMessageKeydown(e: KeyboardEvent, messageId: string) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void commitEditMessage(messageId);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelEditMessage();
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === '/') {
    e.preventDefault();
    handleNewChat();
    return;
  }

  if (mod && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    sidebarOpen.value = true;
    nextTick(() => searchInputRef.value?.focus());
    return;
  }

  if (e.key === 'Escape') {
    if (editingMessageId.value) {
      cancelEditMessage();
      return;
    }
    if (sidebarOpen.value) {
      sidebarOpen.value = false;
      return;
    }
    if (editingTitle.value) {
      cancelRenameTitle();
      return;
    }
    if (editingRoomId.value) {
      cancelRenameRoom();
    }
  }
}

function handleClearAll() {
  const msg = isVi.value
    ? 'Xóa tất cả phòng chat trên máy này? Không thể hoàn tác.'
    : 'Delete all chat rooms on this device? This cannot be undone.';
  if (!confirm(msg)) return;
  clearAllChatSessions();
  refreshSessions();
  const created = createChatSession(resolveModelForNewSession());
  navigateToSession(created.id, true);
}

function startRenameTitle() {
  if (streaming.value || !activeSessionId.value) return;
  titleDraft.value = activeSession.value?.title || 'Chat';
  editingTitle.value = true;
  nextTick(() => {
    titleInputRef.value?.focus();
    titleInputRef.value?.select();
  });
}

function closeActiveTab() {
  if (!activeSessionId.value || streaming.value) return;
  handleDelete(activeSessionId.value);
}

function commitRenameTitle() {
  const sessionId = activeSessionId.value;
  if (!sessionId) {
    editingTitle.value = false;
    return;
  }
  renameChatSession(sessionId, titleDraft.value);
  editingTitle.value = false;
  refreshSessions();
}

function cancelRenameTitle() {
  editingTitle.value = false;
}

function onTitleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitRenameTitle();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelRenameTitle();
  }
}

function switchToDefaultModel() {
  activeModelId.value = defaultModelId.value;
  chatErrorHint.value = null;
  error.value = '';
}

function onPopState() {
  const id = readSessionFromLocation();
  if (id && getChatSession(id)) {
    activeSessionId.value = id;
    messages.value = loadChatMessages(id);
  }
}

onMounted(() => {
  try {
    lowCreditDismissed.value = sessionStorage.getItem(LOW_CREDIT_DISMISS_KEY) === '1';
  } catch {
    /* ignore */
  }
  if (props.credits == null) void refreshCreditsBalance();
  purgeRemoteChatSessions();
  backfillChatSessionPreviews();
  void loadChatModelCatalog().finally(() => ensureSession());
  window.addEventListener('popstate', onPopState);
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState);
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <div class="or-app-chat" :class="{ 'sidebar-open': sidebarOpen }">
    <div
      v-if="sidebarOpen"
      class="or-app-chat-sidebar-backdrop"
      @click="sidebarOpen = false"
    />
    <aside class="or-app-chat-sidebar">
      <div class="or-app-chat-sidebar-bar">
        <h2 class="or-app-chat-sidebar-title">Chat</h2>
      </div>
      <div class="or-app-chat-sidebar-head">
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-chat-new" @click="handleNewChat">
          {{ isVi ? '+ Chat mới' : '+ New chat' }}
        </button>
        <input
          ref="searchInputRef"
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
                    <div
                      v-if="editingRoomId === session.id"
                      class="or-app-chat-room-btn or-app-chat-room-btn-edit"
                    >
                      <input
                        ref="roomTitleInputRef"
                        v-model="roomTitleDraft"
                        type="text"
                        class="or-app-chat-room-title-input"
                        maxlength="80"
                        :aria-label="isVi ? 'Tên phòng chat' : 'Chat room name'"
                        @keydown="onRoomTitleKeydown($event, session.id)"
                        @blur="commitRenameRoom(session.id)"
                      />
                    </div>
                    <button
                      v-else
                      type="button"
                      class="or-app-chat-room-btn"
                      @click="handleSelect(session.id)"
                    >
                      <span class="or-app-chat-room-title">
                        <ChatIcon v-if="session.pinned" name="pin" class="or-app-chat-room-pin" />
                        {{ session.title }}
                      </span>
                      <span v-if="session.preview" class="or-app-chat-room-preview">{{ session.preview }}</span>
                    </button>
                    <ChatRoomMenu
                      :pinned="session.pinned"
                      :is-vi="isVi"
                      :disabled="streaming && session.id === activeSessionId"
                      @pin="handlePinRoom(session.id)"
                      @rename="startRenameRoom(session.id)"
                      @duplicate="handleDuplicateRoom(session.id)"
                      @delete="handleDelete(session.id)"
                    />
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </template>
      </div>
      <p v-if="activeModel" class="or-app-chat-sidebar-foot">{{ modelSubtitle(activeModel) }}</p>
    </aside>

    <div class="or-app-chat-main">
      <header class="or-app-chat-toolbar">
        <button
          type="button"
          class="or-app-chat-mobile-toggle"
          :aria-label="isVi ? 'Danh sách chat' : 'Chat list'"
          @click="sidebarOpen = !sidebarOpen"
        >
          ☰
        </button>

        <div class="or-app-chat-toolbar-start">
          <button
            type="button"
            class="or-chat-toolbar-icon"
            :disabled="streaming"
            :aria-label="isVi ? 'Chat mới' : 'New chat'"
            :title="isVi ? 'Chat mới' : 'New chat'"
            @click="handleNewChat"
          >
            <ChatIcon name="plus" />
          </button>
          <span class="or-chat-toolbar-divider" aria-hidden="true" />

          <div v-if="editingTitle" class="or-chat-thread-tab or-chat-thread-tab-edit">
            <input
              ref="titleInputRef"
              v-model="titleDraft"
              type="text"
              class="or-chat-thread-tab-input"
              maxlength="80"
              @keydown="onTitleKeydown"
              @blur="commitRenameTitle"
            />
          </div>
          <div v-else-if="activeSessionId" class="or-chat-thread-tab is-active">
            <span
              class="or-chat-thread-tab-label"
              :title="activeSession?.title || 'Chat'"
              @dblclick="startRenameTitle"
            >
              {{ activeSession?.title || 'Chat' }}
            </span>
            <button
              type="button"
              class="or-chat-thread-tab-close"
              :disabled="streaming"
              :aria-label="isVi ? 'Đóng phòng' : 'Close chat'"
              @click="closeActiveTab"
            >
              <ChatIcon name="x" />
            </button>
          </div>
        </div>

        <div class="or-app-chat-toolbar-end">
          <ChatModelPicker
            v-model:model-id="activeModelId"
            class="or-chat-model-picker--toolbar"
            :models="chatModels"
            :disabled="streaming || modelsLoading || chatModels.length === 0"
            :is-vi="isVi"
          />
          <button
            v-if="activeSessionId"
            type="button"
            class="or-chat-toolbar-icon"
            :aria-label="isVi ? 'Chia sẻ link' : 'Share link'"
            :disabled="streaming"
            @click="shareChatLink"
          >
            <ChatIcon name="link" />
          </button>
          <button
            v-if="activeSessionId"
            type="button"
            class="or-chat-toolbar-icon"
            :aria-label="isVi ? 'Đổi tên' : 'Rename'"
            :disabled="streaming"
            @click="startRenameTitle"
          >
            <ChatIcon name="edit" />
          </button>
        </div>
      </header>

      <Teleport to="body">
        <p v-if="copiedToast" class="or-chat-toast-float" role="status">{{ copiedToast }}</p>
      </Teleport>

      <div v-if="showLowCreditBanner" class="or-app-chat-col">
        <div class="or-app-chat-low-credit">
          <p>
            {{
              isVi
                ? `Còn ${formatCredits(creditsBalance ?? 0)} credits — nạp thêm để tránh gián đoạn khi chat hoặc tạo ảnh.`
                : `${formatCredits(creditsBalance ?? 0)} credits left — top up to avoid interruptions while chatting or generating images.`
            }}
          </p>
          <div class="or-app-chat-low-credit-actions">
            <a :href="`${prefix}/app/credits/`" class="or-app-btn or-app-btn-ghost or-app-chat-low-credit-link">
              {{ isVi ? 'Nạp credits' : 'Top up' }}
            </a>
            <button type="button" class="or-app-chat-action" @click="dismissLowCreditBanner">×</button>
          </div>
        </div>
      </div>

      <div v-if="staleModelNotice" class="or-app-chat-col">
        <div class="or-app-alert or-app-chat-notice">{{ staleModelNotice }}</div>
      </div>
      <div v-if="error" class="or-app-chat-col">
        <div class="or-app-alert or-app-chat-error">
          <p>{{ error }}</p>
          <div v-if="chatErrorHint" class="or-app-chat-error-actions">
            <button
              v-if="chatErrorHint.suggestModel"
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-chat-error-btn"
              @click="switchToDefaultModel"
            >
              {{ isVi ? 'Đổi sang Auto Router' : 'Switch to Auto Router' }}
            </button>
          </div>
        </div>
      </div>

      <div ref="messagesScrollRef" class="or-app-chat-messages" @scroll="onMessagesScroll">
        <div class="or-app-chat-col or-app-chat-thread">
        <template v-if="messages.length === 0">
          <div class="or-app-chat-welcome">
            <p class="or-app-chat-welcome-title">{{ isVi ? 'Hỏi bất cứ điều gì' : 'Ask anything' }}</p>
            <p class="or-app-chat-welcome-desc">
              {{
                isVi
                  ? '+ tạo ảnh · ∞ memory/stream · ⚙ web tools.'
                  : '+ generate image · ∞ memory/stream · ⚙ web tools.'
              }}
            </p>
          </div>
        </template>
        <template v-else>
          <div
            v-for="message in messages"
            :key="message.id"
            class="or-app-chat-msg"
            :class="[
              message.role === 'user' ? 'is-user' : 'is-assistant',
              message.isError ? 'is-error' : '',
            ]"
          >
            <div class="or-app-chat-msg-body">
              <div
                class="or-app-chat-bubble"
                :class="{ 'has-attachments': (message.attachments?.length ?? 0) > 0 }"
              >
                <div v-if="message.attachments?.length" class="or-app-chat-attachments">
                  <img
                    v-for="(att, i) in message.attachments"
                    :key="`${message.id}-att-${i}`"
                    :src="att.url"
                    :alt="att.name || 'attachment'"
                    class="or-app-chat-attachment-img"
                  />
                </div>
                <textarea
                  v-if="editingMessageId === message.id && message.role === 'user'"
                  ref="messageEditRef"
                  v-model="editingMessageDraft"
                  class="or-app-chat-edit-input"
                  rows="3"
                  @keydown="onEditMessageKeydown($event, message.id)"
                  @blur="commitEditMessage(message.id)"
                />
                <ChatMessageBody
                  v-else-if="message.text || (streaming && message.role === 'assistant')"
                  :text="message.text || (streaming ? '' : '')"
                  :markdown="message.role === 'assistant' && !message.isError"
                  :streaming="isStreamingMessage(message.id)"
                  :is-vi="isVi"
                />
              </div>
              <ChatMessageActionBar
                v-if="message.text && editingMessageId !== message.id"
                :role="message.role"
                :actions-locked="messageActionsLocked(message.id)"
                :is-vi="isVi"
                :message-meta="message.role === 'assistant' ? message.meta : undefined"
                :created-at="message.createdAt"
                :meta-summary="
                  message.role === 'assistant' && message.meta
                    ? formatReplyMeta(message.meta, isVi)
                    : undefined
                "
                @copy="copyMessage(message.text)"
                @edit="startEditMessage(message.id)"
                @delete="handleDeleteMessage(message.id)"
                @regenerate="handleRegenerate(message.id)"
              />
            </div>
          </div>
        </template>
          <div ref="messagesEnd" />
        </div>
      </div>

      <button
        v-if="showScrollDown"
        type="button"
        class="or-chat-scroll-fab"
        :aria-label="isVi ? 'Cuộn xuống' : 'Scroll to bottom'"
        @click="scrollToBottom"
      >
        <ChatIcon name="chevron-down" />
      </button>

      <div v-if="imageGenMode" class="or-app-chat-col">
        <div class="or-chat-image-gen-bar">
        <label class="or-chat-image-gen-field">
          <span>{{ isVi ? 'Model ảnh' : 'Image model' }}</span>
          <select v-model="imageModelSlug" :disabled="streaming || imageModelsLoading || !imageModels.length">
            <option v-for="m in imageModels" :key="m.slug" :value="m.slug">
              {{ m.name }} · {{ m.creditsLabel }}
            </option>
          </select>
        </label>
        <label
          v-for="def in imageFieldDefs"
          :key="def.field"
          class="or-chat-image-gen-field"
        >
          <span>{{ def.field }}</span>
          <select
            :value="imageFieldValues[def.field] || ''"
            :disabled="streaming"
            @change="setImageField(def.field, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in def.options" :key="opt.value" :value="opt.value">
              {{ opt.label !== opt.value ? `${opt.label} (${opt.value})` : opt.value }}
            </option>
          </select>
        </label>
        <span v-if="imageModelsLoading" class="or-chat-image-gen-loading">
          {{ isVi ? 'Đang tải catalog…' : 'Loading catalog…' }}
        </span>
        </div>
      </div>

      <div v-if="pendingAttachments.length" class="or-app-chat-col">
        <div class="or-app-chat-pending or-app-chat-pending-above">
        <div v-for="(att, i) in pendingAttachments" :key="`pending-${i}`" class="or-app-chat-pending-item">
          <img :src="att.url" :alt="att.name" class="or-app-chat-pending-img" />
          <button type="button" class="or-app-chat-pending-remove" @click="removePendingAttachment(i)">×</button>
        </div>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="handleImageSelected" />
      <input ref="importInput" type="file" accept="application/json,.json" hidden @change="handleImportFile" />
      <ChatComposer
        v-model:input="input"
        :streaming="streaming"
        :is-vi="isVi"
        :active-model="activeModel"
        :pending-count="pendingAttachments.length"
        :image-gen-mode="imageGenMode"
        @send="handleSend"
        @stop="handleStop"
        @attach-image="openImagePicker"
        @enable-image-gen="handleEnableImageGen"
        @cancel-image-gen="handleCancelImageGen"
        @export-backup="handleExportBackup"
        @import-backup="handleImportClick"
        @clear-all="handleClearAll"
        @settings-change="handleSettingsChange"
      />
    </div>
  </div>
</template>
