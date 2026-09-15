<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { uploadChatImage, uploadChatVideo, isImageUploadFile, isVideoUploadFile } from '../models/chat-api';
import { playgroundAppPath } from '../models/gateway-base';
import type { PortalLocale } from '../models/portal-locale';
import {
  fetchAlbumLibrary,
  jobFieldsSnippet,
  loadRecentUploads,
  saveRecentUploads,
  uploadFileItem,
  type LibraryFileItem,
} from '../models/library-api';

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

type FilesFilter = 'images' | 'videos' | 'uploads';

const filter = ref<FilesFilter>('images');
const loading = ref(false);
const loadError = ref('');
const libraryItems = ref<LibraryFileItem[]>([]);
const uploadItems = ref<LibraryFileItem[]>([]);
const uploading = ref(false);
const uploadError = ref('');
const uploadSuccess = ref('');
const copiedId = ref('');
const copiedFieldsId = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const playgroundHref = computed(() =>
  playgroundAppPath(props.prefix as '' | '/vi' | '/th', {
    type: filter.value === 'videos' ? 'video' : 'image',
  }),
);

const pathLabel = computed(() => {
  if (filter.value === 'images') return '/images/';
  if (filter.value === 'videos') return '/videos/';
  return '/uploads/';
});

const visibleItems = computed(() => {
  if (filter.value === 'uploads') return uploadItems.value;
  return libraryItems.value.filter((item) =>
    filter.value === 'videos' ? item.mediaKind === 'video' : item.mediaKind === 'image',
  );
});

const itemCountLabel = computed(() => {
  const n = visibleItems.value.length;
  return m(`${n} item${n === 1 ? '' : 's'}`, `${n} mục`, `${n} รายการ`);
});

const acceptUpload = computed(() => {
  if (filter.value === 'uploads') return 'image/*,video/*';
  if (filter.value === 'videos') return 'video/*';
  return 'image/*';
});

function formatCreated(value: string): string {
  if (!value) return '';
  const ms = /^\d+$/.test(value) ? Number(value) : Date.parse(value);
  if (!Number.isFinite(ms)) return '';
  const d = ms < 1e12 ? ms * 1000 : ms;
  const dateLocale =
    props.locale === 'vi' ? 'vi-VN' : props.locale === 'th' ? 'th-TH' : undefined;
  return new Date(d).toLocaleString(dateLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function previewUrl(item: LibraryFileItem): string | null {
  return item.thumbnailUrl || item.mediaUrl;
}

async function loadLibrary() {
  if (filter.value === 'uploads') {
    libraryItems.value = [];
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    const kind = filter.value === 'videos' ? 'videos' : 'images';
    libraryItems.value = await fetchAlbumLibrary({ kind, limit: 48 });
  } catch (e) {
    libraryItems.value = [];
    loadError.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function refreshRecentUploads() {
  uploadItems.value = loadRecentUploads();
}

async function reload() {
  refreshRecentUploads();
  await loadLibrary();
}

function setFilter(next: FilesFilter) {
  if (filter.value === next) return;
  filter.value = next;
  void loadLibrary();
}

function openUploadPicker() {
  fileInputRef.value?.click();
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  const isVideo =
    filter.value === 'videos' || (filter.value === 'uploads' && isVideoUploadFile(file));
  if (isVideo && !isVideoUploadFile(file)) {
    uploadError.value = m('Pick a video file.', 'Chọn file video.', 'เลือกไฟล์วิดีโอ');
    return;
  }
  if (!isVideo && !isImageUploadFile(file)) {
    uploadError.value = m('Pick an image file.', 'Chọn file ảnh.', 'เลือกไฟล์รูปภาพ');
    return;
  }

  uploading.value = true;
  uploadError.value = '';
  uploadSuccess.value = '';
  try {
    const url = isVideo ? await uploadChatVideo(file) : await uploadChatImage(file);
    uploadItems.value = [
      uploadFileItem(url, file, isVideo ? 'video' : 'image'),
      ...uploadItems.value,
    ].slice(0, 24);
    saveRecentUploads(uploadItems.value);
    filter.value = 'uploads';
    uploadSuccess.value = m(
      'Upload complete — URL is ready.',
      'Upload thành công — URL đã sẵn sàng.',
      'อัปโหลดสำเร็จ — URL พร้อมใช้งาน',
    );
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : String(e);
  } finally {
    uploading.value = false;
  }
}

async function copyUrl(item: LibraryFileItem) {
  const url = item.mediaUrl || item.thumbnailUrl;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    copiedId.value = item.id || url;
    setTimeout(() => {
      copiedId.value = '';
    }, 2000);
  } catch {
    uploadError.value = m('Could not copy URL', 'Không copy được URL', 'ไม่สามารถคัดลอก URL');
  }
}

async function copyJobFields(item: LibraryFileItem) {
  const snippet = jobFieldsSnippet(item);
  if (!snippet) return;
  try {
    await navigator.clipboard.writeText(snippet);
    copiedFieldsId.value = item.id || item.mediaUrl || '';
    setTimeout(() => {
      copiedFieldsId.value = '';
    }, 2000);
  } catch {
    uploadError.value = m('Could not copy snippet', 'Không copy được snippet', 'ไม่สามารถคัดลอก snippet');
  }
}

function itemKey(item: LibraryFileItem): string {
  return item.id || item.mediaUrl || item.thumbnailUrl || '';
}

onMounted(() => {
  refreshRecentUploads();
  if (uploadItems.value.length > 0) {
    filter.value = 'uploads';
  } else {
    void loadLibrary();
  }
});

defineExpose({ reload });
</script>

<template>
  <div class="or-files-page">
    <div class="or-files-toolbar">
      <div class="or-files-filters" role="tablist" :aria-label="m('File type', 'Loại file', 'ประเภทไฟล์')">
        <button
          type="button"
          role="tab"
          class="or-files-filter"
          :class="{ 'or-files-filter--active': filter === 'images' }"
          :aria-selected="filter === 'images'"
          @click="setFilter('images')"
        >
          {{ m('Images', 'Ảnh', 'รูปภาพ') }}
        </button>
        <button
          type="button"
          role="tab"
          class="or-files-filter"
          :class="{ 'or-files-filter--active': filter === 'videos' }"
          :aria-selected="filter === 'videos'"
          @click="setFilter('videos')"
        >
          {{ m('Videos', 'Video', 'วิดีโอ') }}
        </button>
        <button
          type="button"
          role="tab"
          class="or-files-filter"
          :class="{ 'or-files-filter--active': filter === 'uploads' }"
          :aria-selected="filter === 'uploads'"
          @click="setFilter('uploads')"
        >
          {{ m('Recent uploads', 'Upload gần đây', 'อัปโหลดล่าสุด') }}
        </button>
      </div>
      <div class="or-files-toolbar-actions">
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="loading || filter === 'uploads'"
          @click="reload"
        >
          {{ loading ? m('Loading…', 'Đang tải…', 'กำลังโหลด…') : m('Refresh', 'Làm mới', 'รีเฟรช') }}
        </button>
        <button
          type="button"
          class="or-app-btn or-app-btn-primary or-app-btn-sm"
          :disabled="uploading"
          @click="openUploadPicker"
        >
          {{ uploading ? m('Uploading…', 'Đang upload…', 'กำลังอัปโหลด…') : m('Upload', 'Upload', 'อัปโหลด') }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          class="or-files-upload-input"
          :accept="acceptUpload"
          @change="onFilePicked"
        />
      </div>
    </div>

    <div class="or-files-browser">
      <div class="or-files-pathbar">
        <span class="or-files-path-icon" aria-hidden="true">📁</span>
        <code class="or-files-path">{{ pathLabel }}</code>
      </div>

      <p v-if="loadError" class="or-app-error or-files-note">{{ loadError }}</p>
      <p v-if="uploadSuccess" class="or-files-success or-files-note" role="status">{{ uploadSuccess }}</p>
      <p v-if="uploadError" class="or-app-error or-files-note">{{ uploadError }}</p>

      <div v-if="loading" class="or-files-grid or-files-grid--loading">
        <div v-for="n in 8" :key="n" class="or-files-card or-files-card--skeleton" />
      </div>

      <div v-else-if="visibleItems.length === 0" class="or-files-empty">
        <div class="or-files-empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15h6" />
          </svg>
        </div>
        <p class="or-files-empty-title">
          {{ m('No files here yet!', 'Chưa có file ở đây!', 'ยังไม่มีไฟล์ที่นี่!') }}
        </p>
        <p class="or-files-empty-sub">
          {{
            filter === 'uploads'
              ? m(
                  'Upload an image or video — files appear under Recent uploads.',
                  'Upload ảnh hoặc video — file xuất hiện trong tab Upload gần đây.',
                  'อัปโหลดรูปหรือวิดีโอ — ไฟล์จะแสดงในแท็บอัปโหลดล่าสุด',
                )
              : m(
                  'Upload a new asset or run jobs in Playground to populate your Gommo album.',
                  'Upload asset mới hoặc tạo job trong Playground để thấy album Gommo.',
                  'อัปโหลด asset ใหม่หรือรันงานใน Playground เพื่อเติม album Gommo',
                )
          }}
        </p>
        <div class="or-files-empty-actions">
          <button type="button" class="or-app-btn or-app-btn-primary" @click="openUploadPicker">
            {{ m('Upload file', 'Upload file', 'อัปโหลดไฟล์') }}
          </button>
          <a :href="playgroundHref" class="or-app-btn or-app-btn-ghost">
            {{ m('Open Playground', 'Mở Playground', 'เปิดสนามทดลอง') }}
          </a>
        </div>
      </div>

      <div v-else class="or-files-grid">
        <article
          v-for="item in visibleItems"
          :key="`${item.source}-${item.id}-${item.mediaUrl}`"
          class="or-files-card"
        >
          <a
            v-if="previewUrl(item)"
            :href="item.mediaUrl || previewUrl(item)!"
            target="_blank"
            rel="noopener noreferrer"
            class="or-files-thumb-wrap"
          >
            <img
              v-if="item.mediaKind === 'image' && previewUrl(item)"
              :src="previewUrl(item)!"
              :alt="item.title || item.prompt"
              class="or-files-thumb"
              loading="lazy"
            />
            <div v-else class="or-files-thumb or-files-thumb--video">
              <span>{{ m('Video', 'Video', 'วิดีโอ') }}</span>
            </div>
          </a>
          <div v-else class="or-files-thumb-wrap">
            <div class="or-files-thumb or-files-thumb--placeholder">—</div>
          </div>
          <div class="or-files-card-body">
            <p class="or-files-card-title" :title="item.title || item.prompt">
              {{ item.title || item.prompt || item.id || '—' }}
            </p>
            <p v-if="item.model" class="or-files-card-meta">{{ item.model }}</p>
            <p v-if="formatCreated(item.createdAt)" class="or-files-card-meta">
              {{ formatCreated(item.createdAt) }}
            </p>
            <div class="or-files-card-actions">
              <button
                type="button"
                class="or-files-card-btn"
                :disabled="!item.mediaUrl && !item.thumbnailUrl"
                @click="copyUrl(item)"
              >
                {{
                  copiedId === itemKey(item)
                    ? m('Copied', 'Đã copy', 'คัดลอกแล้ว')
                    : m('Copy URL', 'Copy URL', 'คัดลอก URL')
                }}
              </button>
              <button
                type="button"
                class="or-files-card-btn"
                :disabled="!item.mediaUrl && !item.thumbnailUrl"
                :title="m('JSON fields for POST /gateway/jobs/*', 'JSON fields cho POST /gateway/jobs/*', 'JSON fields สำหรับ POST /gateway/jobs/*')"
                @click="copyJobFields(item)"
              >
                {{
                  copiedFieldsId === itemKey(item)
                    ? m('Copied', 'Đã copy', 'คัดลอกแล้ว')
                    : m('Copy fields', 'Copy fields', 'คัดลอก fields')
                }}
              </button>
              <a
                v-if="item.mediaUrl"
                :href="item.mediaUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="or-files-card-btn or-files-card-btn--link"
              >
                {{ m('Open', 'Mở', 'เปิด') }}
              </a>
            </div>
          </div>
        </article>
      </div>

      <footer class="or-files-footer">{{ itemCountLabel }}</footer>
    </div>

    <div class="or-files-quicklinks">
      <a :href="playgroundHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Playground', 'Playground', 'สนามทดลอง') }} →
      </a>
      <a :href="`${prefix}/app/token/`" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Access token', 'Access token', 'Access token') }} →
      </a>
      <a :href="`${prefix}/features/upload`" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Upload docs', 'Upload docs', 'เอกสารอัปโหลด') }} →
      </a>
    </div>

    <p class="or-app-muted or-files-footnote">
      {{
        m(
          "Gommo album from library API; recent uploads persist in this browser's localStorage.",
          'Album Gommo từ library API; upload gần đây lưu localStorage trên trình duyệt này.',
          'Album Gommo จาก library API; อัปโหลดล่าสุดเก็บใน localStorage ของเบราว์เซอร์นี้',
        )
      }}
      <a :href="`${prefix}/reference/gommo-public-api`">{{ m('Gommo library API', 'Gommo library API', 'Gommo library API') }}</a>
    </p>
  </div>
</template>
