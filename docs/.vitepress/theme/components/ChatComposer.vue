<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { ChatModelOption } from '../models/chat-models';
import { modelRequiresStream } from '../models/chat-models';
import { readChatSettings, writeChatSettings, type ChatSettings } from '../models/chat-settings';
import type { ChatAttachment } from '../models/chat-storage';
import { attachmentBadgeLabel } from '../models/chat-attachment-label';
import type { PortalLocale } from '../models/portal-locale';
import ChatIcon from './ChatIcon.vue';

type PlusTab = 'add' | 'options';

const props = defineProps<{
  input: string;
  streaming: boolean;
  locale?: PortalLocale;
  isVi?: boolean;
  activeModel: ChatModelOption | null;
  pendingAttachments?: ChatAttachment[];
  jobRefs?: ChatAttachment[];
  uploadingAttachments?: boolean;
  uploadingJobRefs?: boolean;
  genAllowsImageRef?: boolean;
  genAllowsVideoRef?: boolean;
  imageGenMode?: boolean;
  videoGenMode?: boolean;
}>();

const emit = defineEmits<{
  'update:input': [value: string];
  send: [];
  stop: [];
  attachImage: [];
  attachVideo: [];
  attachJobImageRef: [];
  attachJobVideoRef: [];
  enableImageGen: [];
  enableVideoGen: [];
  cancelImageGen: [];
  cancelVideoGen: [];
  removePending: [index: number];
  removeJobRef: [index: number];
  exportBackup: [];
  importBackup: [];
  clearAll: [];
  settingsChange: [settings: ChatSettings];
}>();

const { m, locale: copyLocale } = usePortalCopy(
  computed(() => props.locale ?? (props.isVi ? 'vi' : 'en')),
);

const pendingAttachments = computed(() => props.pendingAttachments ?? []);
const jobRefs = computed(() => props.jobRefs ?? []);
const visibleJobRefs = computed(() => {
  if (props.imageGenMode) return jobRefs.value.filter((r) => r.jobTarget === 'image');
  if (props.videoGenMode) return jobRefs.value.filter((r) => r.jobTarget === 'video');
  return jobRefs.value;
});
const hasPendingAttachments = computed(() => pendingAttachments.value.length > 0);
const hasJobRefs = computed(() => visibleJobRefs.value.length > 0);
const hasAnyStaging = computed(() => hasPendingAttachments.value || hasJobRefs.value);
const isUploading = computed(
  () => Boolean(props.uploadingAttachments || props.uploadingJobRefs),
);

const plusOpen = ref(false);
const plusTab = ref<PlusTab>('add');
const root = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
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
const streamForced = computed(() => modelRequiresStream(props.activeModel));
const streamCapable = computed(() => settings.value.preferStream || streamForced.value);
const toolsNeedStream = computed(() => streamCapable.value);

const plusActive = computed(
  () =>
    plusOpen.value ||
    settings.value.webSearch ||
    settings.value.webFetch ||
    settings.value.memoryMode === 'limited' ||
    streamCapable.value,
);

const mediaGenMode = computed(() => Boolean(props.imageGenMode || props.videoGenMode));
const genAllowsImageRef = computed(() => Boolean(props.genAllowsImageRef));
const genAllowsVideoRef = computed(() => Boolean(props.genAllowsVideoRef));

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
}

function togglePlusMenu() {
  plusOpen.value = !plusOpen.value;
  if (plusOpen.value) plusTab.value = 'add';
}

function onDocClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) closeMenus();
}

function resizeInput() {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function onInput(e: Event) {
  emit('update:input', (e.target as HTMLTextAreaElement).value);
  resizeInput();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!props.streaming) emit('send');
  }
}

watch(
  () => props.input,
  () => nextTick(resizeInput),
);

watch(
  () => [props.imageGenMode, props.videoGenMode],
  () => nextTick(resizeInput),
);

onMounted(() => {
  document.addEventListener('click', onDocClick);
  nextTick(resizeInput);
});
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <footer ref="root" class="or-chat-composer-wrap">
    <div class="or-chat-composer-inner">
      <div v-if="imageGenMode" class="or-chat-composer-mode-hint">
        <span>{{ m('Image job — optional Job · Image refs in composer', 'Tạo ảnh — chọn ref Job · Ảnh trong composer (tuỳ chọn)', 'งานภาพ — ref Job · ภาพใน composer (ไม่บังคับ)') }}</span>
        <button type="button" class="or-chat-composer-mode-exit" @click="emit('cancelImageGen')">×</button>
      </div>
      <div v-else-if="videoGenMode" class="or-chat-composer-mode-hint">
        <span>{{ m('Video job — optional Job refs in composer', 'Tạo video — ref Job · Ảnh/Video trong composer (tuỳ chọn)', 'งานวิดีโอ — ref Job · ภาพ/วิดีโอใน composer (ไม่บังคับ)') }}</span>
        <button type="button" class="or-chat-composer-mode-exit" @click="emit('cancelVideoGen')">×</button>
      </div>
      <p v-else-if="isUploading" class="or-chat-composer-upload-hint">
        {{ m('Uploading…', 'Đang upload…', 'กำลังอัปโหลด…') }}
      </p>
      <div
        class="or-chat-composer-box"
        :class="{ 'has-attachments': hasAnyStaging }"
      >
        <div
          v-if="mediaGenMode && (genAllowsImageRef || genAllowsVideoRef)"
          class="or-chat-composer-job-ref-actions"
        >
          <span class="or-chat-composer-job-ref-label">{{ m('Job ref', 'Ref job', 'ref งาน') }}</span>
          <button
            v-if="genAllowsImageRef"
            type="button"
            class="or-chat-gen-ref-btn"
            :disabled="streaming || isUploading"
            @click="emit('attachJobImageRef')"
          >
            + {{ m('Image', 'Ảnh', 'ภาพ') }}
          </button>
          <button
            v-if="genAllowsVideoRef"
            type="button"
            class="or-chat-gen-ref-btn"
            :disabled="streaming || isUploading"
            @click="emit('attachJobVideoRef')"
          >
            + {{ m('Video', 'Video', 'วิดีโอ') }}
          </button>
        </div>
        <p
          v-else-if="mediaGenMode && !genAllowsImageRef && !genAllowsVideoRef"
          class="or-chat-composer-job-ref-hint"
        >
          {{ m('This model does not accept job references.', 'Model này không hỗ trợ ref job.', 'โมเดลนี้ไม่รองรับ ref งาน') }}
        </p>

        <div v-if="hasAnyStaging" class="or-chat-composer-previews">
          <div
            v-for="(att, i) in pendingAttachments"
            :key="`pending-${i}-${att.url}`"
            class="or-chat-composer-preview-item"
          >
            <span class="or-attach-badge is-chat">{{ attachmentBadgeLabel(att, copyLocale) }}</span>
            <img
              v-if="att.type === 'image'"
              :src="att.url"
              :alt="att.name || 'attachment'"
              class="or-chat-composer-preview-img"
            />
            <video
              v-else
              :src="att.url"
              class="or-chat-composer-preview-video"
              muted
              playsinline
              preload="metadata"
            />
            <button
              type="button"
              class="or-chat-composer-preview-remove"
              :aria-label="m('Remove attachment', 'Gỡ đính kèm', 'ลบไฟล์แนบ')"
              :disabled="streaming || isUploading"
              @click="emit('removePending', i)"
            >
              ×
            </button>
          </div>
          <div
            v-for="(ref, i) in visibleJobRefs"
            :key="`job-ref-${i}-${ref.url}`"
            class="or-chat-composer-preview-item"
          >
            <span class="or-attach-badge is-job">{{ attachmentBadgeLabel(ref, copyLocale) }}</span>
            <img
              v-if="ref.type === 'image'"
              :src="ref.url"
              :alt="ref.name || 'ref'"
              class="or-chat-composer-preview-img"
            />
            <video
              v-else
              :src="ref.url"
              class="or-chat-composer-preview-video"
              muted
              playsinline
              preload="metadata"
            />
            <button
              type="button"
              class="or-chat-composer-preview-remove"
              :aria-label="m('Remove job ref', 'Gỡ ref job', 'ลบ ref งาน')"
              :disabled="streaming || isUploading"
              @click="emit('removeJobRef', i)"
            >
              ×
            </button>
          </div>
        </div>

        <div class="or-chat-composer-main">
        <div class="or-chat-composer-tools">
          <div class="or-chat-composer-tool-wrap">
            <button
              type="button"
              class="or-chat-composer-icon"
              :class="{ active: plusActive }"
              :disabled="streaming || isUploading"
              :aria-label="m('Add', 'Thêm', 'เพิ่ม')"
              :aria-expanded="plusOpen"
              @click.stop="togglePlusMenu"
            >
              <ChatIcon name="plus" />
            </button>
            <div v-if="plusOpen" class="or-chat-composer-pop or-chat-composer-pop-sheet" @click.stop>
              <div class="or-chat-composer-sheet-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  class="or-chat-composer-sheet-tab"
                  :class="{ active: plusTab === 'add' }"
                  :aria-selected="plusTab === 'add'"
                  @click="plusTab = 'add'"
                >
                  {{ m('Add', 'Thêm', 'เพิ่ม') }}
                </button>
                <button
                  type="button"
                  role="tab"
                  class="or-chat-composer-sheet-tab"
                  :class="{ active: plusTab === 'options' }"
                  :aria-selected="plusTab === 'options'"
                  @click="plusTab = 'options'"
                >
                  {{ m('Options', 'Tùy chọn', 'ตัวเลือก') }}
                </button>
              </div>

              <div v-if="plusTab === 'add'" class="or-chat-composer-sheet-body" role="tabpanel">
                <button
                  type="button"
                  class="or-chat-composer-sheet-item"
                  @click="emit('attachImage'); closeMenus()"
                >
                  <span class="or-chat-composer-sheet-icon"><ChatIcon name="attach" /></span>
                  <span class="or-chat-composer-sheet-copy">
                    <strong>{{ m('Upload image', 'Tải ảnh', 'อัปโหลดภาพ') }}</strong>
                    <small>{{ m('Chat badge — agent answers about the image', 'Badge Chat — agent trả lời về ảnh', 'ป้าย Chat — agent ตอบเกี่ยวกับภาพ') }}</small>
                  </span>
                </button>
                <button
                  type="button"
                  class="or-chat-composer-sheet-item"
                  @click="emit('attachVideo'); closeMenus()"
                >
                  <span class="or-chat-composer-sheet-icon"><ChatIcon name="attach" /></span>
                  <span class="or-chat-composer-sheet-copy">
                    <strong>{{ m('Upload video', 'Tải video', 'อัปโหลดวิดีโอ') }}</strong>
                    <small>{{ m('Chat badge — agent answers about the video', 'Badge Chat — agent trả lời về video', 'ป้าย Chat — agent ตอบเกี่ยวกับวิดีโอ') }}</small>
                  </span>
                </button>

                <div class="or-chat-composer-sheet-divider" />

                <p class="or-chat-composer-pop-title">{{ m('Create job', 'Tạo job', 'สร้างงาน') }}</p>
                <button
                  type="button"
                  class="or-chat-composer-sheet-item"
                  @click="emit('enableImageGen'); closeMenus()"
                >
                  <span class="or-chat-composer-sheet-icon"><ChatIcon name="image" /></span>
                  <span class="or-chat-composer-sheet-copy">
                    <strong>{{ m('Generate image', 'Tạo ảnh', 'สร้างภาพ') }}</strong>
                    <small>{{ m('Optional Job · Image refs in composer', 'Ref Job · Ảnh trong composer (tuỳ chọn)', 'Job ref · ภาพใน composer (ไม่บังคับ)') }}</small>
                  </span>
                </button>
                <button
                  type="button"
                  class="or-chat-composer-sheet-item"
                  @click="emit('enableVideoGen'); closeMenus()"
                >
                  <span class="or-chat-composer-sheet-icon"><ChatIcon name="attach" /></span>
                  <span class="or-chat-composer-sheet-copy">
                    <strong>{{ m('Generate video', 'Tạo video', 'สร้างวิดีโอ') }}</strong>
                    <small>{{ m('Optional Job · Image/Video refs in composer', 'Ref Job · Ảnh/Video trong composer (tuỳ chọn)', 'Job ref · ภาพ/วิดีโอใน composer (ไม่บังคับ)') }}</small>
                  </span>
                </button>
              </div>

              <div v-else class="or-chat-composer-sheet-body" role="tabpanel">
                <p class="or-chat-composer-pop-title">{{ m('Tools & memory', 'Công cụ & bộ nhớ', 'เครื่องมือและหน่วยความจำ') }}</p>
                <p v-if="!streamCapable" class="or-chat-composer-pop-hint">
                  {{ m('Enable Stream below or pick a stream model for web tools.', 'Bật Stream bên dưới hoặc chọn model stream để dùng web tools.', 'เปิด Stream ด้านล่างหรือเลือกโมเดล stream เพื่อใช้ web tools') }}
                </p>
                <label class="or-chat-tool-row" :class="{ disabled: !canWebSearch || !toolsNeedStream }">
                  <span>
                    <strong>{{ m('Web search', 'Tìm kiếm trên mạng', 'ค้นหาเว็บ') }}</strong>
                    <small>{{ settings.webSearch ? m('On', 'Đang bật', 'เปิด') : m('Off', 'Tắt', 'ปิด') }}</small>
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
                    <strong>{{ m('Fetch URL', 'Fetch URL', 'ดึง URL') }}</strong>
                    <small>{{ m('Auto when prompt has a public URL', 'Tự bật khi prompt có link public', 'เปิดอัตโนมัติเมื่อ prompt มี URL สาธารณะ') }}</small>
                  </span>
                  <input
                    type="checkbox"
                    :checked="settings.webFetch"
                    :disabled="!canWebFetch || !toolsNeedStream || streaming"
                    @change="toggleWebFetch"
                  />
                </label>

                <div class="or-chat-composer-sheet-divider" />

                <div class="or-chat-memory-head">
                  <p class="or-chat-composer-pop-title">{{ m('Chat memory', 'Bộ nhớ chat', 'หน่วยความจำแชท') }}</p>
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
                      ? m('Sends all messages each request.', 'Gửi toàn bộ lịch sử mỗi lần.', 'ส่งข้อความทั้งหมดทุกครั้ง')
                      : m(
                          `Sends up to ${memoryTurns} recent user turns.`,
                          `Gửi tối đa ${memoryTurns} lượt user gần nhất.`,
                          `ส่งได้สูงสุด ${memoryTurns} เทิร์นผู้ใช้ล่าสุด`,
                        )
                  }}
                </p>
                <label v-if="!streamForced" class="or-chat-tool-row">
                  <span>
                    <strong>{{ m('Stream tokens', 'Stream tokens', 'สตรีมโทเค็น') }}</strong>
                    <small>{{
                      m(
                        'On: typewriter. Off: one-shot JSON (agent models).',
                        'Bật: gõ dần. Tắt: một cục JSON (model agent).',
                        'เปิด: พิมพ์ทีละคำ ปิด: JSON ครั้งเดียว (โมเดล agent)',
                      )
                    }}</small>
                  </span>
                  <input
                    type="checkbox"
                    :checked="settings.preferStream"
                    :disabled="streaming || isUploading"
                    @change="togglePreferStream"
                  />
                </label>

                <div class="or-chat-composer-sheet-divider" />

                <p class="or-chat-composer-pop-title">{{ m('Chat data', 'Dữ liệu chat', 'ข้อมูลแชท') }}</p>
                <button type="button" class="or-chat-composer-pop-item" @click="emit('exportBackup'); closeMenus()">
                  {{ m('Export backup', 'Export backup', 'ส่งออก backup') }}
                </button>
                <button type="button" class="or-chat-composer-pop-item" @click="emit('importBackup'); closeMenus()">
                  {{ m('Import backup', 'Import backup', 'นำเข้า backup') }}
                </button>
                <button
                  type="button"
                  class="or-chat-composer-pop-item or-chat-composer-pop-item-danger"
                  :disabled="streaming || isUploading"
                  @click="emit('clearAll'); closeMenus()"
                >
                  {{ m('Clear all chats', 'Xóa hết phòng', 'ล้างห้องแชททั้งหมด') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <textarea
          ref="inputRef"
          :value="input"
          class="or-chat-composer-input"
          rows="1"
          :placeholder="
            imageGenMode
              ? m('Describe the image to generate…', 'Mô tả ảnh muốn tạo…', 'อธิบายภาพที่ต้องการสร้าง…')
              : videoGenMode
                ? m('Describe the video to generate…', 'Mô tả video muốn tạo…', 'อธิบายวิดีโอที่ต้องการสร้าง…')
                : m('Ask anything…', 'Hỏi bất cứ điều gì…', 'ถามอะไรก็ได้…')
          "
          :disabled="streaming"
          @input="onInput"
          @keydown="onKeydown"
        />

        <div class="or-chat-composer-actions">
          <button
            v-if="streaming"
            type="button"
            class="or-chat-composer-stop"
            :aria-label="m('Stop', 'Dừng', 'หยุด')"
            @click="emit('stop')"
          >
            <ChatIcon name="stop" />
          </button>
          <button
            v-else
            type="button"
            class="or-chat-composer-send"
            :disabled="uploadingAttachments || isUploading || (!input.trim() && !hasAnyStaging)"
            :aria-label="m('Send', 'Gửi', 'ส่ง')"
            @click="emit('send')"
          >
            <ChatIcon name="send" />
          </button>
        </div>
        </div>
      </div>

      <p class="or-chat-composer-disclaimer">
        {{
          m(
            'Responses are AI-generated and can be inaccurate. Review outputs before relying on them.',
            'Phản hồi do AI tạo — có thể không chính xác. Hãy kiểm tra trước khi tin.',
            'การตอบกลับสร้างโดย AI — อาจไม่ถูกต้อง โปรดตรวจสอบก่อนใช้งาน',
          )
        }}
      </p>
    </div>
  </footer>
</template>
