<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useHybridLocale } from '../composables/use-hybrid-locale';
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
import { sendAgentChat, uploadChatImage, uploadChatVideo, isVideoUploadFile, isImageUploadFile } from '../models/chat-api';
import {
  createImageJobWait,
  fetchImageCatalogModels,
  readLastImageModelSlug,
  resolveImageModel,
} from '../models/chat-image-job';
import {
  createVideoJobWait,
  fetchVideoCatalogModels,
  readLastVideoModelSlug,
  resolveVideoModel,
} from '../models/chat-video-job';
import type { CatalogModel } from '../models/catalog-api';
import { modelCatalogUnavailable, modelUnavailableSuffix } from '../models/catalog-api';
import {
  catalogJobFieldDefs,
  catalogJobFieldLabel,
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
import { startMediaJobProgressTimer } from '../models/media-job-progress';
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
import { modelAcceptsJobRefType } from '../models/media-job';
import { attachmentBadgeLabel } from '../models/chat-attachment-label';
import { getStoredToken } from '../models/auth-api';
import { fetchByokStatus, type ByokStatus } from '../models/byok-api';
import { PORTAL_LOW_CREDITS_THRESHOLD } from '../models/portal-credits';

const LOW_CREDIT_THRESHOLD = PORTAL_LOW_CREDITS_THRESHOLD;
const LOW_CREDIT_DISMISS_KEY = 'gw_portal_chat_low_credit_dismiss_v1';
const BYOK_HINT_DISMISS_KEY = 'gw_portal_chat_byok_hint_dismiss_v1';

const props = defineProps<{
  credits?: number;
  onCreditsRefresh?: () => void | Promise<void>;
}>();

const { locale, prefix, t } = useHybridLocale();

const GROUP_LABELS = computed(() => ({
  today: t('Today', 'Hôm nay', 'วันนี้'),
  yesterday: t('Yesterday', 'Hôm qua', 'เมื่อวาน'),
  older: t('Older', 'Cũ hơn', 'เก่ากว่า'),
}));

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
const videoFileInput = ref<HTMLInputElement | null>(null);
const jobImageFileInput = ref<HTMLInputElement | null>(null);
const jobVideoFileInput = ref<HTMLInputElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const pendingAttachments = ref<ChatAttachment[]>([]);
const jobRefs = ref<ChatAttachment[]>([]);
const uploadingAttachments = ref(false);
const uploadingJobRefs = ref(false);

const MAX_PENDING_ATTACHMENTS = 10;
const MAX_JOB_IMAGE_REFS = 4;
const MAX_JOB_VIDEO_REFS = 1;
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
const videoGenMode = ref(false);
const videoModels = ref<CatalogModel[]>([]);
const videoModelsLoading = ref(false);
const videoModelSlug = ref('');
const videoFieldValues = ref<CatalogJobFieldValues>({});
const lowCreditDismissed = ref(false);
const localCredits = ref<number | null>(null);
const byokStatus = ref<ByokStatus | null>(null);
const byokHintDismissed = ref(false);

const creditsBalance = computed(() => {
  if (typeof props.credits === 'number') return props.credits;
  if (localCredits.value != null) return localCredits.value;
  return null;
});

const showLowCreditBanner = computed(() => {
  if (lowCreditDismissed.value) return false;
  const balance = creditsBalance.value;
  if (balance == null) return false;
  return balance < LOW_CREDIT_THRESHOLD;
});

const byokMappedIds = computed(
  () => new Set((byokStatus.value?.supportedChatModels ?? []).map((m) => m.gatewayModelId)),
);

const byokModelIdList = computed(() => [...byokMappedIds.value]);

const hasProviderByok = computed(() =>
  (byokStatus.value?.providers ?? []).some((p) => p.chatSupported && p.configured),
);

const byokHref = computed(() => `${prefix.value}/app/byok/`);

const activeImageModel = computed(() => resolveImageModel(imageModels.value, imageModelSlug.value));
const activeVideoModel = computed(() => resolveVideoModel(videoModels.value, videoModelSlug.value));

const imageFieldDefs = computed(() => catalogJobFieldDefs(activeImageModel.value));
const videoFieldDefs = computed(() => catalogJobFieldDefs(activeVideoModel.value));

const imageGenAllowsImageRef = computed(() => modelAcceptsJobRefType(activeImageModel.value, 'image'));
const videoGenAllowsImageRef = computed(() => modelAcceptsJobRefType(activeVideoModel.value, 'image'));
const videoGenAllowsVideoRef = computed(() => modelAcceptsJobRefType(activeVideoModel.value, 'video'));

const activeGenAllowsImageRef = computed(() =>
  imageGenMode.value
    ? imageGenAllowsImageRef.value
    : videoGenMode.value
      ? videoGenAllowsImageRef.value
      : false,
);
const activeGenAllowsVideoRef = computed(() => videoGenMode.value && videoGenAllowsVideoRef.value);

function activeJobTarget(): 'image' | 'video' | null {
  if (imageGenMode.value) return 'image';
  if (videoGenMode.value) return 'video';
  return null;
}

function toMediaJobRefs(refs: ChatAttachment[]) {
  return refs.map((r) => ({ type: r.type, url: r.url }));
}

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

function syncVideoFieldValues(model?: CatalogModel | null) {
  const m = model ?? activeVideoModel.value;
  if (!m) {
    videoFieldValues.value = {};
    return;
  }
  videoFieldValues.value = resolveImageFieldValues(m, videoFieldValues.value);
}

function setVideoField(field: CatalogJobField, value: string) {
  videoFieldValues.value = { ...videoFieldValues.value, [field]: value };
  const model = activeVideoModel.value;
  if (model) writeImageFieldValues(model.slug, videoFieldValues.value);
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

const activeModelUsesByok = computed(() => byokMappedIds.value.has(activeModelId.value));

const showByokHint = computed(() => {
  if (byokHintDismissed.value) return false;
  if (!byokStatus.value?.enabled) return false;
  return (byokStatus.value.supportedChatModels ?? []).length > 0;
});

const byokHintMessage = computed(() => {
  const count = byokStatus.value?.supportedChatModels?.length ?? 0;
  if (!hasProviderByok.value) {
    return t(
      `Chat BYOK: ${count} mapped models — add a provider key to use your own key (platform fees still use Gommo credits).`,
      `Chat BYOK: ${count} model trong gateway map — thêm provider key để dùng key của bạn (phí platform vẫn trừ credit Gommo).`,
      `Chat BYOK: ${count} โมเดลใน gateway — เพิ่ม provider key เพื่อใช้ key ของคุณ (ค่าธรรมเนียมแพลตฟอร์มยังใช้เครดิต Gommo)`,
    );
  }
  if (activeModelUsesByok.value) {
    const mapped = byokStatus.value?.supportedChatModels?.find(
      (m) => m.gatewayModelId === activeModelId.value,
    );
    const provider = mapped?.byokProvider ?? 'provider';
    return t(
      `This model uses BYOK (${provider}) — tokens bill to your key; gateway still checks Gommo credits.`,
      `Model này chạy BYOK (${provider}) — token tính trên key của bạn; gateway vẫn kiểm tra credit Gommo.`,
      `โมเดลนี้ใช้ BYOK (${provider}) — คิดค่าโทเค็นจาก key ของคุณ; gateway ยังตรวจสอบเครดิต Gommo`,
    );
  }
  return t(
    `${count} BYOK chat models available — pick one in the model menu. Media still uses Gommo.`,
    `Có ${count} model chat BYOK — chọn trong menu model. Media vẫn dùng Gommo.`,
    `มี ${count} โมเดลแชท BYOK — เลือกในเมนูโมเดล มีเดียยังใช้ Gommo`,
  );
});

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

function dismissByokHint() {
  byokHintDismissed.value = true;
  try {
    sessionStorage.setItem(BYOK_HINT_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

async function loadByokHint() {
  if (!getStoredToken()) return;
  try {
    byokStatus.value = await fetchByokStatus();
  } catch {
    byokStatus.value = null;
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
    const hint = readLastImageModelSlug();
    const preferred =
      hint && imageModels.value.some((m) => m.slug === hint && !modelCatalogUnavailable(m))
        ? hint
        : imageModels.value.find((m) => !modelCatalogUnavailable(m))?.slug || hint;
    const model = resolveImageModel(imageModels.value, preferred);
    if (!model) {
      throw new Error(t('No image models in catalog.', 'Không có model image trong catalog.', 'ไม่มีโมเดลภาพในแคตตาล็อก'));
    }
    imageModelSlug.value = model.slug;
    syncImageFieldValues(model);
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : t('Could not load image models.', 'Không tải được model image.', 'โหลดโมเดลภาพไม่ได้');
    imageGenMode.value = false;
  } finally {
    imageModelsLoading.value = false;
  }
}

async function ensureVideoCatalog() {
  if (videoModels.value.length) return;
  videoModelsLoading.value = true;
  try {
    videoModels.value = await fetchVideoCatalogModels();
    const hint = readLastVideoModelSlug();
    const preferred =
      hint && videoModels.value.some((m) => m.slug === hint && !modelCatalogUnavailable(m))
        ? hint
        : videoModels.value.find((m) => !modelCatalogUnavailable(m))?.slug || hint;
    const model = resolveVideoModel(videoModels.value, preferred);
    if (!model) {
      throw new Error(t('No video models in catalog.', 'Không có model video trong catalog.', 'ไม่มีโมเดลวิดีโอในแคตตาล็อก'));
    }
    videoModelSlug.value = model.slug;
    syncVideoFieldValues(model);
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : t('Could not load video models.', 'Không tải được model video.', 'โหลดโมเดลวิดีโอไม่ได้');
    videoGenMode.value = false;
  } finally {
    videoModelsLoading.value = false;
  }
}

async function handleEnableImageGen() {
  error.value = '';
  videoGenMode.value = false;
  jobRefs.value = jobRefs.value.filter((r) => r.jobTarget === 'image');
  imageGenMode.value = true;
  await ensureImageCatalog();
}

function handleCancelImageGen() {
  imageGenMode.value = false;
  jobRefs.value = jobRefs.value.filter((r) => r.jobTarget !== 'image');
}

async function handleEnableVideoGen() {
  error.value = '';
  imageGenMode.value = false;
  jobRefs.value = jobRefs.value.filter((r) => r.jobTarget === 'video');
  videoGenMode.value = true;
  await ensureVideoCatalog();
}

function handleCancelVideoGen() {
  videoGenMode.value = false;
  jobRefs.value = jobRefs.value.filter((r) => r.jobTarget !== 'video');
}

function onImageModelChange() {
  syncImageFieldValues();
}

function onVideoModelChange() {
  syncVideoFieldValues();
}

watch(imageModelSlug, onImageModelChange);
watch(videoModelSlug, onVideoModelChange);

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
  const label = session.title || t('chat', 'phòng chat', 'ห้องแชท');
  const msg = t(
    `Delete "${label}"? This cannot be undone.`,
    `Xóa "${label}"? Không thể hoàn tác.`,
    `ลบ "${label}"? ไม่สามารถย้อนกลับได้`,
  );
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
    titleDraft.value = trimmed || getChatSession(sessionId)?.title || t('Chat', 'Chat', 'แชท');
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
    attachments: (m.attachments ?? []).filter((a) => a.purpose !== 'job') as unknown[],
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
      staleModelNotice.value = t(
        `Reset ${fixed} room(s) to default model (catalog updated).`,
        `Đã đổi ${fixed} phòng sang model mặc định (catalog đã cập nhật).`,
        `รีเซ็ต ${fixed} ห้องเป็นโมเดลเริ่มต้น (แคตตาล็อกอัปเดตแล้ว)`,
      );
      refreshSessions();
    }
    ensureStaleSessionModels();
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : t('Could not load chat models.', 'Không tải được model chat.', 'โหลดโมเดลแชทไม่ได้');
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
    error.value =
      err instanceof Error ? err.message : t('Import failed.', 'Import thất bại.', 'นำเข้าไม่สำเร็จ');
  }
}

function openImagePicker() {
  if (uploadingAttachments.value || uploadingJobRefs.value || streaming.value) return;
  if (imageGenMode.value || videoGenMode.value) {
    imageGenMode.value = false;
    videoGenMode.value = false;
    jobRefs.value = [];
  }
  fileInput.value?.click();
}

function openVideoPicker() {
  if (uploadingAttachments.value || uploadingJobRefs.value || streaming.value) return;
  if (imageGenMode.value || videoGenMode.value) {
    imageGenMode.value = false;
    videoGenMode.value = false;
    jobRefs.value = [];
  }
  videoFileInput.value?.click();
}

function openJobImageRefPicker() {
  if (uploadingJobRefs.value || uploadingAttachments.value || streaming.value) return;
  jobImageFileInput.value?.click();
}

function openJobVideoRefPicker() {
  if (uploadingJobRefs.value || uploadingAttachments.value || streaming.value) return;
  jobVideoFileInput.value?.click();
}

async function handleImageSelected(e: Event) {
  const inputEl = e.target as HTMLInputElement;
  const picked = [...(inputEl.files ?? [])];
  const files = picked.filter(isImageUploadFile);
  inputEl.value = '';
  if (!picked.length) return;
  if (!files.length) {
    error.value = t(
      'Unrecognized image file. Try .jpg, .png, or .webp.',
      'Không nhận diện được file ảnh. Thử .jpg, .png hoặc .webp.',
      'ไม่รู้จักไฟล์ภาพ — ลอง .jpg, .png หรือ .webp',
    );
    return;
  }

  const slotsLeft = MAX_PENDING_ATTACHMENTS - pendingAttachments.value.length;
  if (slotsLeft <= 0) {
    error.value = t(
      `Maximum ${MAX_PENDING_ATTACHMENTS} attached images.`,
      `Tối đa ${MAX_PENDING_ATTACHMENTS} ảnh đính kèm.`,
      `สูงสุด ${MAX_PENDING_ATTACHMENTS} ภาพแนบ`,
    );
    return;
  }

  const batch = files.slice(0, slotsLeft);
  uploadingAttachments.value = true;
  error.value = '';

  try {
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const url = await uploadChatImage(file);
        return { type: 'image' as const, purpose: 'chat' as const, url, name: file.name };
      }),
    );

    const added: ChatAttachment[] = [];
    let failed = 0;
    let firstError = '';
    for (const result of results) {
      if (result.status === 'fulfilled') added.push(result.value);
      else {
        failed += 1;
        if (!firstError && result.reason instanceof Error) firstError = result.reason.message;
      }
    }

    if (added.length) {
      pendingAttachments.value = [...pendingAttachments.value, ...added];
    }

    const skipped = files.length - batch.length;
    const parts: string[] = [];
    if (failed) {
      parts.push(
        t(
          `${failed} image(s) failed to upload`,
          `${failed} ảnh upload thất bại`,
          `อัปโหลดภาพล้มเหลว ${failed} ไฟล์`,
        ),
      );
      if (firstError) parts.push(firstError);
    }
    if (skipped) {
      parts.push(
        t(
          `only ${slotsLeft} added (limit ${MAX_PENDING_ATTACHMENTS})`,
          `chỉ thêm được ${slotsLeft} ảnh (giới hạn ${MAX_PENDING_ATTACHMENTS})`,
          `เพิ่มได้เพียง ${slotsLeft} ภาพ (จำกัด ${MAX_PENDING_ATTACHMENTS})`,
        ),
      );
    }
    if (parts.length) error.value = parts.join(' · ');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('Upload failed.', 'Upload thất bại.', 'อัปโหลดไม่สำเร็จ');
  } finally {
    uploadingAttachments.value = false;
  }
}

function removePendingAttachment(index: number) {
  pendingAttachments.value = pendingAttachments.value.filter((_, i) => i !== index);
}

function removeJobRef(index: number) {
  const target = activeJobTarget();
  const visible = target
    ? jobRefs.value.filter((r) => r.jobTarget === target)
    : jobRefs.value;
  const ref = visible[index];
  if (!ref) return;
  jobRefs.value = jobRefs.value.filter((r) => r.url !== ref.url || r.jobTarget !== ref.jobTarget);
}

async function uploadJobRefs(
  files: File[],
  type: 'image' | 'video',
  maxCount: number,
  uploadFn: (file: File) => Promise<string>,
) {
  const existing = jobRefs.value.filter((r) => r.type === type).length;
  const slotsLeft = maxCount - existing;
  if (slotsLeft <= 0) {
    error.value = t(
      `Maximum ${maxCount} ${type} ref(s) for job.`,
      `Tối đa ${maxCount} ref ${type === 'image' ? 'ảnh' : 'video'} cho job.`,
      `สูงสุด ${maxCount} ref ${type === 'image' ? 'ภาพ' : 'วิดีโอ'} สำหรับงาน`,
    );
    return;
  }

  const batch = files.slice(0, slotsLeft);
  const jobTarget = activeJobTarget();
  if (!jobTarget) return;

  uploadingJobRefs.value = true;
  error.value = '';

  try {
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const url = await uploadFn(file);
        return {
          type,
          purpose: 'job' as const,
          jobTarget,
          url,
          name: file.name,
        };
      }),
    );

    const added: ChatAttachment[] = [];
    let failed = 0;
    let firstError = '';
    for (const result of results) {
      if (result.status === 'fulfilled') added.push(result.value);
      else {
        failed += 1;
        if (!firstError && result.reason instanceof Error) firstError = result.reason.message;
      }
    }

    if (added.length) jobRefs.value = [...jobRefs.value, ...added];

    const parts: string[] = [];
    if (failed) {
      parts.push(
        t(
          `${failed} ref(s) failed to upload`,
          `${failed} ref upload thất bại`,
          `อัปโหลด ref ล้มเหลว ${failed} ไฟล์`,
        ),
      );
      if (firstError) parts.push(firstError);
    }
    if (parts.length) error.value = parts.join(' · ');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('Upload failed.', 'Upload thất bại.', 'อัปโหลดไม่สำเร็จ');
  } finally {
    uploadingJobRefs.value = false;
  }
}

async function handleJobImageRefSelected(e: Event) {
  const inputEl = e.target as HTMLInputElement;
  const picked = [...(inputEl.files ?? [])];
  const files = picked.filter(isImageUploadFile);
  inputEl.value = '';
  if (!picked.length) return;
  if (!files.length) {
    error.value = t(
      'Unrecognized image ref file.',
      'Không nhận diện được file ảnh ref.',
      'ไม่รู้จักไฟล์ ref ภาพ',
    );
    return;
  }
  await uploadJobRefs(files, 'image', MAX_JOB_IMAGE_REFS, uploadChatImage);
}

async function handleJobVideoRefSelected(e: Event) {
  const inputEl = e.target as HTMLInputElement;
  const picked = [...(inputEl.files ?? [])];
  const files = picked.filter(isVideoUploadFile);
  inputEl.value = '';
  if (!picked.length) return;
  if (!files.length) {
    error.value = t(
      'Unrecognized video ref file.',
      'Không nhận diện được file video ref.',
      'ไม่รู้จักไฟล์ ref วิดีโอ',
    );
    return;
  }
  await uploadJobRefs(files, 'video', MAX_JOB_VIDEO_REFS, uploadChatVideo);
}

function attachmentTitle(count: number, type: ChatAttachment['type']): string {
  if (type === 'video') {
    return t(`${count} video${count > 1 ? 's' : ''}`, `${count} video`, `${count} วิดีโอ`);
  }
  return t(`${count} image${count > 1 ? 's' : ''}`, `${count} ảnh`, `${count} ภาพ`);
}

async function handleVideoSelected(e: Event) {
  const inputEl = e.target as HTMLInputElement;
  const picked = [...(inputEl.files ?? [])];
  const files = picked.filter(isVideoUploadFile);
  inputEl.value = '';
  if (!picked.length) return;
  if (!files.length) {
    error.value = t(
      'Unrecognized video file. Try .mp4 or .webm.',
      'Không nhận diện được file video. Thử .mp4 hoặc .webm.',
      'ไม่รู้จักไฟล์วิดีโอ — ลอง .mp4 หรือ .webm',
    );
    return;
  }

  const slotsLeft = MAX_PENDING_ATTACHMENTS - pendingAttachments.value.length;
  if (slotsLeft <= 0) {
    error.value = t(
      `Maximum ${MAX_PENDING_ATTACHMENTS} attached videos.`,
      `Tối đa ${MAX_PENDING_ATTACHMENTS} video đính kèm.`,
      `สูงสุด ${MAX_PENDING_ATTACHMENTS} วิดีโอแนบ`,
    );
    return;
  }

  const batch = files.slice(0, slotsLeft);
  uploadingAttachments.value = true;
  error.value = '';

  try {
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const url = await uploadChatVideo(file);
        return { type: 'video' as const, purpose: 'chat' as const, url, name: file.name };
      }),
    );

    const added: ChatAttachment[] = [];
    let failed = 0;
    let firstError = '';
    for (const result of results) {
      if (result.status === 'fulfilled') added.push(result.value);
      else {
        failed += 1;
        if (!firstError && result.reason instanceof Error) firstError = result.reason.message;
      }
    }

    if (added.length) {
      pendingAttachments.value = [...pendingAttachments.value, ...added];
    }

    const skipped = files.length - batch.length;
    const parts: string[] = [];
    if (failed) {
      parts.push(
        t(
          `${failed} video(s) failed to upload`,
          `${failed} video upload thất bại`,
          `อัปโหลดวิดีโอล้มเหลว ${failed} ไฟล์`,
        ),
      );
      if (firstError) parts.push(firstError);
    }
    if (skipped) {
      parts.push(
        t(
          `only ${slotsLeft} added (limit ${MAX_PENDING_ATTACHMENTS})`,
          `chỉ thêm được ${slotsLeft} video (giới hạn ${MAX_PENDING_ATTACHMENTS})`,
          `เพิ่มได้เพียง ${slotsLeft} วิดีโอ (จำกัด ${MAX_PENDING_ATTACHMENTS})`,
        ),
      );
    }
    if (parts.length) error.value = parts.join(' · ');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('Upload failed.', 'Upload thất bại.', 'อัปโหลดไม่สำเร็จ');
  } finally {
    uploadingAttachments.value = false;
  }
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
    const formatted = formatChatError(err, locale.value);
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
  const jobRefAttachments = (userMsg.attachments ?? []).filter(
    (a) => a.purpose === 'job' && a.jobTarget === 'image',
  );
  if (!sessionId || !model) {
    error.value = t('Pick an image model.', 'Chọn model image.', 'เลือกโมเดลภาพ');
    return;
  }

  if (modelCatalogUnavailable(model)) {
    const msg = t(
      'Image model temporarily unavailable upstream. Pick another model.',
      'Model ảnh đang tạm ngưng trên upstream. Chọn model khác.',
      'โมเดลภาพไม่พร้อมใช้งานชั่วคราว — เลือกโมเดลอื่น',
    );
    error.value = msg;
    chatErrorHint.value = { message: msg, suggestModel: true, suggestRetry: false };
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: msg, isError: true } : m,
    );
    saveChatMessages(sessionId, messages.value);
    return;
  }

  const fieldValues = { ...imageFieldValues.value };
  const validationError = validateCatalogJobFields(model, fieldValues, locale.value);
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

  let stopProgress = startMediaJobProgressTimer(
    (label) => {
      messages.value = messages.value.map((m) =>
        m.id === assistantId ? { ...m, text: label, isError: false } : m,
      );
    },
    'image',
    locale.value,
  );

  try {
    const result = await createImageJobWait(
      model,
      userMsg.text,
      fieldValues,
      controller.signal,
      toMediaJobRefs(jobRefAttachments),
    );
    const fieldSummary = formatImageJobFieldSummary(result.fields, locale.value);
    const caption = t(
      `Image from **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`,
      `Ảnh từ **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`,
      `ภาพจาก **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`,
    );
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
      source: 'chat',
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
    const formatted = formatChatError(err, locale.value);
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
      source: 'chat',
    });
  } finally {
    stopProgress();
    chatAbort.value = null;
    streaming.value = false;
  }
}

async function runVideoTurn(history: ChatMessage[], userMsg: ChatMessage, assistantId: string) {
  const sessionId = activeSessionId.value;
  const model = activeVideoModel.value;
  const jobRefAttachments = (userMsg.attachments ?? []).filter(
    (a) => a.purpose === 'job' && a.jobTarget === 'video',
  );
  if (!sessionId || !model) {
    error.value = t('Pick a video model.', 'Chọn model video.', 'เลือกโมเดลวิดีโอ');
    return;
  }

  if (modelCatalogUnavailable(model)) {
    const msg = t(
      'Video model temporarily unavailable upstream. Pick another model.',
      'Model video đang tạm ngưng trên upstream. Chọn model khác.',
      'โมเดลวิดีโอไม่พร้อมใช้งานชั่วคราว — เลือกโมเดลอื่น',
    );
    error.value = msg;
    chatErrorHint.value = { message: msg, suggestModel: true, suggestRetry: false };
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: msg, isError: true } : m,
    );
    saveChatMessages(sessionId, messages.value);
    return;
  }

  const fieldValues = { ...videoFieldValues.value };
  const validationError = validateCatalogJobFields(model, fieldValues, locale.value);
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

  let stopProgress = startMediaJobProgressTimer(
    (label) => {
      messages.value = messages.value.map((m) =>
        m.id === assistantId ? { ...m, text: label, isError: false } : m,
      );
    },
    'video',
    locale.value,
  );

  try {
    const result = await createVideoJobWait(
      model,
      userMsg.text,
      fieldValues,
      controller.signal,
      toMediaJobRefs(jobRefAttachments),
    );
    const fieldSummary = formatImageJobFieldSummary(result.fields, locale.value);
    const caption = t(
      `Video from **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`,
      `Video từ **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`,
      `วิดีโอจาก **${result.modelLabel}**${fieldSummary ? ` · ${fieldSummary}` : ''}`,
    );
    const meta = {
      latencyMs: result.latencyMs,
      modelLabel: result.modelLabel,
      jobType: 'video' as const,
      videoDuration: result.fields.duration,
      costCredits: result.credits ?? undefined,
    };

    messages.value = messages.value.map((m) =>
      m.id === assistantId
        ? {
            ...m,
            text: caption,
            attachments: [{ type: 'video' as const, url: result.resultUrl, name: result.modelLabel }],
            meta,
            isError: false,
          }
        : m,
    );
    saveChatMessages(sessionId, messages.value);

    appendUsageRecord({
      jobType: 'video',
      model: result.modelSlug,
      prompt: userMsg.text,
      status: 'success',
      credits: result.credits ?? null,
      jobId: result.jobId,
      resultUrl: result.resultUrl,
      source: 'chat',
    });

    await refreshCreditsBalance();
    await props.onCreditsRefresh?.();
    touchChatSession(sessionId);
    refreshSessions();
    videoGenMode.value = false;
  } catch (err) {
    if (controller.signal.aborted) {
      saveChatMessages(sessionId, messages.value);
      return;
    }
    const formatted = formatChatError(err, locale.value);
    chatErrorHint.value = formatted;
    error.value = formatted.message;
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, text: formatted.message, isError: true } : m,
    );
    saveChatMessages(sessionId, messages.value);

    appendUsageRecord({
      jobType: 'video',
      model: model.slug,
      prompt: userMsg.text,
      status: 'failed',
      credits: model.credits ?? null,
      source: 'chat',
    });
  } finally {
    stopProgress();
    chatAbort.value = null;
    streaming.value = false;
  }
}

async function handleSend() {
  const text = input.value.trim();
  const sessionId = activeSessionId.value;
  const target = activeJobTarget();
  const refsForJob = target ? jobRefs.value.filter((r) => r.jobTarget === target) : [];
  if (!sessionId || streaming.value) return;
  if (target) {
    if (!text) return;
  } else if (!text && pendingAttachments.value.length === 0) {
    return;
  }

  error.value = '';
  chatErrorHint.value = null;
  const attachments = target
    ? refsForJob.map((r) => ({ ...r, purpose: 'job' as const, jobTarget: target }))
    : pendingAttachments.value.map((r) => ({ ...r, purpose: r.purpose ?? ('chat' as const) }));
  if (target) {
    jobRefs.value = jobRefs.value.filter((r) => r.jobTarget !== target);
  } else {
    pendingAttachments.value = [];
  }
  input.value = '';

  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    text,
    createdAt: Date.now(),
    attachments: attachments.length ? attachments : undefined,
  };
  const history = [...messages.value, userMsg];
  messages.value = history;
  saveChatMessages(sessionId, history);
  const session = getChatSession(sessionId);
  if (!session || session.title === 'New chat') {
    const title = text.trim()
      ? titleFromMessage(text)
      : attachments.length
        ? attachmentTitle(attachments.length, attachments[0]?.type ?? 'image')
        : 'New chat';
    touchChatSession(sessionId, { title });
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

  if (videoGenMode.value) {
    await runVideoTurn(history, userMsg, assistantId);
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
    copiedToast.value = t('Copied', 'Đã copy', 'คัดลอกแล้ว');
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
    copiedToast.value = t('Room link copied', 'Đã copy link phòng', 'คัดลอกลิงก์ห้องแล้ว');
    window.setTimeout(() => {
      copiedToast.value = '';
    }, 1500);
  } catch {
    copiedToast.value = t('Could not copy link', 'Không copy được link', 'คัดลอกลิงก์ไม่ได้');
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
  const msg = t(
    'Delete all chat rooms on this device? This cannot be undone.',
    'Xóa tất cả phòng chat trên máy này? Không thể hoàn tác.',
    'ลบห้องแชททั้งหมดบนอุปกรณ์นี้? ไม่สามารถย้อนกลับได้',
  );
  if (!confirm(msg)) return;
  clearAllChatSessions();
  refreshSessions();
  const created = createChatSession(resolveModelForNewSession());
  navigateToSession(created.id, true);
}

function startRenameTitle() {
  if (streaming.value || !activeSessionId.value) return;
  titleDraft.value = activeSession.value?.title || t('Chat', 'Chat', 'แชท');
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

function switchToNextImageModel() {
  const list = imageModels.value.filter((m) => !modelCatalogUnavailable(m));
  if (!list.length) return;
  const idx = list.findIndex((m) => m.slug === imageModelSlug.value);
  const next = list[(idx + 1) % list.length]!;
  imageModelSlug.value = next.slug;
  syncImageFieldValues(next);
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
    byokHintDismissed.value = sessionStorage.getItem(BYOK_HINT_DISMISS_KEY) === '1';
  } catch {
    /* ignore */
  }
  if (props.credits == null) void refreshCreditsBalance();
  void loadByokHint();
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
          {{ t('+ New chat', '+ Chat mới', '+ แชทใหม่') }}
        </button>
        <input
          ref="searchInputRef"
          v-model="search"
          type="search"
          class="or-app-chat-search"
          :placeholder="t('Search chats…', 'Tìm phòng chat…', 'ค้นหาแชท…')"
        />
      </div>

      <div class="or-app-chat-rooms">
        <template v-if="filteredSessions.length === 0">
          <p class="or-app-chat-empty">{{ t('No chats yet', 'Chưa có chat', 'ยังไม่มีแชท') }}</p>
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
                        :aria-label="t('Chat room name', 'Tên phòng chat', 'ชื่อห้องแชท')"
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
                      :locale="locale"
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
          :aria-label="t('Chat list', 'Danh sách chat', 'รายการแชท')"
          @click="sidebarOpen = !sidebarOpen"
        >
          ☰
        </button>

        <div class="or-app-chat-toolbar-start">
          <button
            type="button"
            class="or-chat-toolbar-icon"
            :disabled="streaming"
            :aria-label="t('New chat', 'Chat mới', 'แชทใหม่')"
            :title="t('New chat', 'Chat mới', 'แชทใหม่')"
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
              :title="activeSession?.title || t('Chat', 'Chat', 'แชท')"
              @dblclick="startRenameTitle"
            >
              {{ activeSession?.title || t('Chat', 'Chat', 'แชท') }}
            </span>
            <button
              type="button"
              class="or-chat-thread-tab-close"
              :disabled="streaming"
              :aria-label="t('Close chat', 'Đóng phòng', 'ปิดแชท')"
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
            :byok-model-ids="byokModelIdList"
            :disabled="streaming || modelsLoading || chatModels.length === 0"
            :locale="locale"
          />
          <button
            v-if="activeSessionId"
            type="button"
            class="or-chat-toolbar-icon"
            :aria-label="t('Share link', 'Chia sẻ link', 'แชร์ลิงก์')"
            :disabled="streaming"
            @click="shareChatLink"
          >
            <ChatIcon name="link" />
          </button>
          <button
            v-if="activeSessionId"
            type="button"
            class="or-chat-toolbar-icon"
            :aria-label="t('Rename', 'Đổi tên', 'เปลี่ยนชื่อ')"
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
              t(
                `${formatCredits(creditsBalance ?? 0)} credits left — top up to avoid interruptions while chatting or generating images.`,
                `Còn ${formatCredits(creditsBalance ?? 0)} credits — nạp thêm để tránh gián đoạn khi chat hoặc tạo ảnh.`,
                `เหลือ ${formatCredits(creditsBalance ?? 0)} เครดิต — เติมเครดิตเพื่อหลีกเลี่ยงการหยุดชะงักขณะแชทหรือสร้างภาพ`,
              )
            }}
          </p>
          <div class="or-app-chat-low-credit-actions">
            <a :href="`${prefix}/app/credits/`" class="or-app-btn or-app-btn-ghost or-app-chat-low-credit-link">
              {{ t('Top up', 'Nạp credits', 'เติมเครดิต') }}
            </a>
            <button type="button" class="or-app-chat-action" @click="dismissLowCreditBanner">×</button>
          </div>
        </div>
      </div>

      <div v-if="showByokHint" class="or-app-chat-col">
        <div class="or-app-chat-byok-hint">
          <p>{{ byokHintMessage }}</p>
          <div class="or-app-chat-low-credit-actions">
            <a :href="byokHref" class="or-app-btn or-app-btn-ghost or-app-chat-low-credit-link">
              {{ t('Open BYOK', 'Mở BYOK', 'เปิด BYOK') }}
            </a>
            <button type="button" class="or-app-chat-action" @click="dismissByokHint">×</button>
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
              v-if="chatErrorHint.suggestModel && imageGenMode"
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-chat-error-btn"
              @click="switchToNextImageModel"
            >
              {{ t('Try another image model', 'Thử model ảnh khác', 'ลองโมเดลภาพอื่น') }}
            </button>
            <button
              v-else-if="chatErrorHint.suggestModel"
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-chat-error-btn"
              @click="switchToDefaultModel"
            >
              {{ t('Switch to Auto Router', 'Đổi sang Auto Router', 'เปลี่ยนเป็น Auto Router') }}
            </button>
          </div>
        </div>
      </div>

      <div ref="messagesScrollRef" class="or-app-chat-messages" @scroll="onMessagesScroll">
        <div class="or-app-chat-col or-app-chat-thread">
        <template v-if="messages.length === 0">
          <div class="or-app-chat-welcome">
            <p class="or-app-chat-welcome-title">{{ t('Ask anything', 'Hỏi bất cứ điều gì', 'ถามอะไรก็ได้') }}</p>
            <p class="or-app-chat-welcome-desc">
              {{
                t(
                  '+ generate image · ∞ memory/stream · ⚙ web tools.',
                  '+ tạo ảnh · ∞ memory/stream · ⚙ web tools.',
                  '+ สร้างภาพ · ∞ memory/stream · ⚙ web tools',
                )
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
                  <div
                    v-for="(att, i) in message.attachments"
                    :key="`${message.id}-att-${i}`"
                    class="or-app-chat-attachment-item"
                  >
                    <span
                      v-if="message.role === 'user'"
                      class="or-attach-badge"
                      :class="att.purpose === 'job' ? 'is-job' : 'is-chat'"
                    >
                      {{ attachmentBadgeLabel(att, locale) }}
                    </span>
                    <img
                      v-if="att.type === 'image' || !att.type"
                      :src="att.url"
                      :alt="att.name || 'attachment'"
                      class="or-app-chat-attachment-img"
                    />
                    <video
                      v-else
                      :src="att.url"
                      class="or-app-chat-attachment-video"
                      controls
                      playsinline
                      preload="metadata"
                    />
                  </div>
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
                />
              </div>
              <ChatMessageActionBar
                v-if="(message.text || (message.attachments?.length ?? 0) > 0) && editingMessageId !== message.id"
                :role="message.role"
                :actions-locked="messageActionsLocked(message.id)"
                :locale="locale"
                :message-meta="message.role === 'assistant' ? message.meta : undefined"
                :created-at="message.createdAt"
                :meta-summary="
                  message.role === 'assistant' && message.meta
                    ? formatReplyMeta(message.meta, locale)
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
        :aria-label="t('Scroll to bottom', 'Cuộn xuống', 'เลื่อนลงล่าง')"
        @click="scrollToBottom"
      >
        <ChatIcon name="chevron-down" />
      </button>

      <div v-if="imageGenMode" class="or-app-chat-col">
        <div class="or-chat-image-gen-bar gw-job-panel gw-job-panel--compact">
          <p class="gw-job-panel-kicker">{{ t('Image', 'Ảnh', 'ภาพ') }}</p>
          <label class="gw-job-field">
            <span class="gw-job-label">
              <span class="gw-job-label-prefix" aria-hidden="true">//</span>
              {{ t('Model', 'Model', 'โมเดล') }}
            </span>
            <select v-model="imageModelSlug" class="gw-job-input" :disabled="streaming || imageModelsLoading || !imageModels.length">
              <option
                v-for="m in imageModels"
                :key="m.slug"
                :value="m.slug"
                :disabled="modelCatalogUnavailable(m)"
              >
                {{ m.name }} · {{ m.creditsLabel }}{{ modelUnavailableSuffix(m, locale) }}
              </option>
            </select>
          </label>
          <label
            v-for="def in imageFieldDefs"
            :key="def.field"
            class="gw-job-field"
          >
            <span class="gw-job-label">
              <span class="gw-job-label-prefix" aria-hidden="true">//</span>
              {{ catalogJobFieldLabel(def.field, locale) }}
            </span>
            <select
              class="gw-job-input"
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
            {{ t('Loading catalog…', 'Đang tải catalog…', 'กำลังโหลดแคตตาล็อก…') }}
          </span>
        </div>
      </div>

      <div v-if="videoGenMode" class="or-app-chat-col">
        <div class="or-chat-image-gen-bar gw-job-panel gw-job-panel--compact">
          <p class="gw-job-panel-kicker">{{ t('Video', 'Video', 'วิดีโอ') }}</p>
          <label class="gw-job-field">
            <span class="gw-job-label">
              <span class="gw-job-label-prefix" aria-hidden="true">//</span>
              {{ t('Model', 'Model', 'โมเดล') }}
            </span>
            <select v-model="videoModelSlug" class="gw-job-input" :disabled="streaming || videoModelsLoading || !videoModels.length">
              <option
                v-for="m in videoModels"
                :key="m.slug"
                :value="m.slug"
                :disabled="modelCatalogUnavailable(m)"
              >
                {{ m.name }} · {{ m.creditsLabel }}{{ modelUnavailableSuffix(m, locale) }}
              </option>
            </select>
          </label>
          <label
            v-for="def in videoFieldDefs"
            :key="def.field"
            class="gw-job-field"
          >
            <span class="gw-job-label">
              <span class="gw-job-label-prefix" aria-hidden="true">//</span>
              {{ catalogJobFieldLabel(def.field, locale) }}
            </span>
            <select
              class="gw-job-input"
              :value="videoFieldValues[def.field] || ''"
              :disabled="streaming"
              @change="setVideoField(def.field, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in def.options" :key="opt.value" :value="opt.value">
                {{ opt.label !== opt.value ? `${opt.label} (${opt.value})` : opt.value }}
              </option>
            </select>
          </label>
          <span v-if="videoModelsLoading" class="or-chat-image-gen-loading">
            {{ t('Loading catalog…', 'Đang tải catalog…', 'กำลังโหลดแคตตาล็อก…') }}
          </span>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="handleImageSelected"
      />
      <input
        ref="videoFileInput"
        type="file"
        accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v"
        multiple
        hidden
        @change="handleVideoSelected"
      />
      <input
        ref="jobImageFileInput"
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp"
        multiple
        hidden
        @change="handleJobImageRefSelected"
      />
      <input
        ref="jobVideoFileInput"
        type="file"
        accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v"
        multiple
        hidden
        @change="handleJobVideoRefSelected"
      />
      <input ref="importInput" type="file" accept="application/json,.json" hidden @change="handleImportFile" />
      <ChatComposer
        v-model:input="input"
        :streaming="streaming"
        :locale="locale"
        :active-model="activeModel"
        :pending-attachments="pendingAttachments"
        :job-refs="jobRefs"
        :uploading-attachments="uploadingAttachments"
        :uploading-job-refs="uploadingJobRefs"
        :gen-allows-image-ref="activeGenAllowsImageRef"
        :gen-allows-video-ref="activeGenAllowsVideoRef"
        :image-gen-mode="imageGenMode"
        :video-gen-mode="videoGenMode"
        @send="handleSend"
        @stop="handleStop"
        @remove-pending="removePendingAttachment"
        @remove-job-ref="removeJobRef"
        @attach-job-image-ref="openJobImageRefPicker"
        @attach-job-video-ref="openJobVideoRefPicker"
        @attach-image="openImagePicker"
        @attach-video="openVideoPicker"
        @enable-image-gen="handleEnableImageGen"
        @enable-video-gen="handleEnableVideoGen"
        @cancel-image-gen="handleCancelImageGen"
        @cancel-video-gen="handleCancelVideoGen"
        @export-backup="handleExportBackup"
        @import-backup="handleImportClick"
        @clear-all="handleClearAll"
        @settings-change="handleSettingsChange"
      />
    </div>
  </div>
</template>
