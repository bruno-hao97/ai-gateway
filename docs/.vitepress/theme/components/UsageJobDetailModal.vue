<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { PortalLocale } from '../models/portal-locale';
import { formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import {
  jobTypeLabel,
  listItemCredit,
  listItemCreatedAt,
  listItemStatus,
  usageJobId,
  type UsageListItem,
  type UsageStatsType,
} from '../models/usage-stats';

const props = defineProps<{
  open: boolean;
  item: UsageListItem | null;
  locale: PortalLocale;
  /** Full URL to reopen this job in Explore */
  shareHref?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const copied = ref(false);
const linkCopied = ref(false);

const status = computed(() => (props.item ? listItemStatus(props.item) : 'pending'));

const jobId = computed(() => usageJobId(props.item));

const statusLabel = computed(() => {
  if (status.value === 'success') return m('Success', 'Thành công', 'สำเร็จ');
  if (status.value === 'failed') return m('Failed', 'Thất bại', 'ล้มเหลว');
  return m('Pending', 'Đang xử lý', 'กำลังดำเนินการ');
});

watch(
  () => props.open,
  (open, _, onCleanup) => {
    if (!open) {
      copied.value = false;
      linkCopied.value = false;
      return;
    }
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') emit('close');
    };
    window.addEventListener('keydown', onKeydown);
    onCleanup(() => window.removeEventListener('keydown', onKeydown));
  },
);

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close');
}

async function copyText(text: string, which: 'id' | 'link' = 'id') {
  if (!text || typeof navigator === 'undefined') return;
  try {
    await navigator.clipboard.writeText(text);
    if (which === 'link') {
      linkCopied.value = true;
      window.setTimeout(() => {
        linkCopied.value = false;
      }, 1500);
      return;
    }
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    if (which === 'link') linkCopied.value = false;
    else copied.value = false;
  }
}

function shareUrl(): string {
  const href = props.shareHref?.trim();
  if (!href) return '';
  if (typeof window === 'undefined') return href;
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
}
</script>

<template>
  <div
    v-if="open && item"
    class="or-usage-job-modal-backdrop"
    @click="onBackdropClick"
  >
    <div
      class="or-usage-job-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="m('Job details', 'Chi tiết job', 'รายละเอียดงาน')"
    >
      <div class="or-usage-job-modal-head">
        <h3 class="or-usage-job-modal-title">{{ m('Job details', 'Chi tiết job', 'รายละเอียดงาน') }}</h3>
        <div class="or-usage-job-modal-head-actions">
          <button
            v-if="shareHref"
            type="button"
            class="or-app-btn or-app-btn-ghost or-app-btn-sm"
            @click="copyText(shareUrl(), 'link')"
          >
            {{ linkCopied ? m('Link copied', 'Đã copy link', 'คัดลอกลิงก์แล้ว') : m('Copy link', 'Copy link', 'คัดลอกลิงก์') }}
          </button>
          <button type="button" class="or-usage-job-modal-close" :aria-label="m('Close', 'Đóng', 'ปิด')" @click="emit('close')">
            ×
          </button>
        </div>
      </div>

      <div class="or-usage-job-modal-body">
        <dl class="or-usage-job-modal-dl">
          <div class="or-usage-job-modal-row">
            <dt>{{ m('Time', 'Thời gian', 'เวลา') }}</dt>
            <dd>{{ formatUsageTime(listItemCreatedAt(item) || '', locale) }}</dd>
          </div>
          <div class="or-usage-job-modal-row">
            <dt>{{ m('Type', 'Loại', 'ประเภท') }}</dt>
            <dd>{{ jobTypeLabel((item.type as UsageStatsType) || 'image', locale) }}</dd>
          </div>
          <div class="or-usage-job-modal-row">
            <dt>Model</dt>
            <dd><code class="or-usage-model">{{ item.model || '—' }}</code></dd>
          </div>
          <div class="or-usage-job-modal-row">
            <dt>{{ m('Status', 'Trạng thái', 'สถานะ') }}</dt>
            <dd>
              <span class="or-usage-status" :class="`or-usage-status--${status}`">
                {{ statusLabel }}
              </span>
            </dd>
          </div>
          <div class="or-usage-job-modal-row">
            <dt>{{ m('Credit', 'Credit', 'เครดิต') }}</dt>
            <dd>{{ listItemCredit(item) > 0 ? formatCredits(listItemCredit(item)) : '—' }}</dd>
          </div>
          <div v-if="jobId" class="or-usage-job-modal-row">
            <dt>{{ m('Job ID', 'Job ID', 'Job ID') }}</dt>
            <dd class="or-usage-job-modal-mono">
              <code>{{ jobId }}</code>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                @click="copyText(jobId)"
              >
                {{ copied ? m('Copied', 'Đã copy', 'คัดลอกแล้ว') : m('Copy', 'Copy', 'คัดลอก') }}
              </button>
            </dd>
          </div>
        </dl>

        <div class="or-usage-job-modal-prompt">
          <div class="or-usage-job-modal-prompt-head">
            <span class="or-usage-job-modal-prompt-label">Prompt</span>
            <button
              v-if="item.prompt"
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-btn-sm"
              @click="copyText(item.prompt || '')"
            >
              {{ m('Copy prompt', 'Copy prompt', 'คัดลอก prompt') }}
            </button>
          </div>
          <pre class="or-usage-job-modal-prompt-text">{{ item.prompt || '—' }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
