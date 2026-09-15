<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { PortalLocale } from '../models/portal-locale';
import { fetchUsageStats, formatCredits } from '../models/user-api';
import {
  createObservabilityWebhook,
  deleteObservabilityWebhook,
  fetchObservabilityWebhooks,
  testObservabilityWebhook,
  updateObservabilityWebhook,
  type ObservabilityWebhook,
} from '../models/observability-api';
import {
  isLocalUsageMirrorEnabled,
  loadUsageHistory,
  setLocalUsageMirrorEnabled,
} from '../models/usage-history';

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
  credits: number;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const MAX_WEBHOOKS = 5;

const PAYLOAD_EXAMPLE = `{
  "type": "job.completed",
  "timestamp": "2026-09-12T02:00:00.000Z",
  "data": {
    "jobType": "image",
    "modelSlug": "flux-schnell",
    "jobId": "abc123",
    "resultUrl": "https://…",
    "status": "success"
  }
}`;

type DestStatus = 'open' | 'soon';

interface ObsDestination {
  id: string;
  name: string;
  descEn: string;
  descVi: string;
  descTh: string;
  href?: string;
  status: DestStatus;
}

const localMirror = ref(isLocalUsageMirrorEnabled());
const statsLoading = ref(true);
const statsError = ref('');
const totalJobs7d = ref(0);
const localJobCount = ref(0);

const webhooks = ref<ObservabilityWebhook[]>([]);
const webhooksLoading = ref(false);
const webhooksError = ref('');
const webhooksSuccess = ref('');
const webhookUrl = ref('');
const webhookLabel = ref('');
const webhookSecret = ref('');
const webhookSaving = ref(false);
const webhookActionId = ref('');
const copiedPayload = ref(false);

const usageHref = computed(() => `${props.prefix}/app/activity/?tab=trends&period=7d`);
const logsHref = computed(() => `${props.prefix}/app/activity/?tab=explore&period=7d`);
const activityHref = computed(() => `${props.prefix}/app/activity/?period=7d`);
const creditsHref = computed(() => `${props.prefix}/app/credits/`);
const usageDocsHref = computed(() => `${props.prefix}/reference/usage`);
const observabilityDocsHref = computed(() => `${props.prefix}/reference/observability`);
const observabilityVerifyDocsHref = computed(
  () => `${observabilityDocsHref.value}#automated-background-verify-live`,
);
const mcpHref = computed(() => `${props.prefix}/mcp/`);

const webhookSlotsLeft = computed(() => Math.max(0, MAX_WEBHOOKS - webhooks.value.length));
const canAddWebhook = computed(() => webhookSlotsLeft.value > 0 && !webhookSaving.value);

const betaLimitations = computed(() => [
  m(
    'This hub is in beta — some features are incomplete or best for dev / self-hosted gateways.',
    'Trang này đang beta — một số tính năng chưa hoàn chỉnh hoặc chỉ phù hợp dev / self-host.',
    'ฮับนี้อยู่ในช่วงเบต้า — บางฟีเจอร์ยังไม่สมบูรณ์หรือเหมาะกับ dev / self-hosted gateway',
  ),
  m(
    'Usage & job logs from Gommo usage-history: stable, always on (Profile or GET/POST /gateway/usage/*).',
    'Usage & job logs từ Gommo usage-history: ổn định, luôn bật (qua Profile hoặc API /gateway/usage/*).',
    'Usage และ job logs จาก Gommo usage-history: เสถียร เปิดตลอด (ผ่าน Profile หรือ GET/POST /gateway/usage/*)',
  ),
  m(
    'Local session mirror: this browser’s localStorage only; not synced, not sent to the server.',
    'Local session mirror: chỉ localStorage trên trình duyệt này; không sync, không gửi server.',
    'Local session mirror: เฉพาะ localStorage ของเบราว์เซอร์นี้ ไม่ sync ไม่ส่งไปเซิร์ฟเวอร์',
  ),
  m(
    'Webhooks: POST /gateway/jobs/* (media) only. wait=true → job.completed / job.failed after gateway poll. wait=false → immediate result or background poll (~5 min) when job webhooks are registered.',
    'Webhooks: chỉ POST /gateway/jobs/* (media). wait=true → job.completed / job.failed sau poll gateway. wait=false → tức thì hoặc poll nền (~5 phút) khi đã đăng ký webhook.',
    'Webhooks: เฉพาะ POST /gateway/jobs/* (media) wait=true → job.completed / job.failed หลัง gateway poll wait=false → ผลทันทีหรือ poll พื้นหลัง (~5 นาที) เมื่อลงทะเบียน webhook',
  ),
  m(
    'No webhooks for chat, audio, BYOK, or raw Gommo/proxy calls. Gommo upstream still has no native webhooks.',
    'Không webhook cho chat, audio, BYOK, hay gọi thẳng Gommo/proxy. Gommo upstream vẫn không có webhook native.',
    'ไม่มี webhook สำหรับ chat, audio, BYOK หรือเรียก Gommo/proxy โดยตรง Gommo upstream ยังไม่มี webhook native',
  ),
  m(
    'No retry queue; max 5 endpoints per account; file store on the gateway host (not replicated across instances).',
    'Không retry queue; tối đa 5 endpoint/account; lưu file trên gateway (không replicate multi-instance).',
    'ไม่มี retry queue สูงสุด 5 endpoint/บัญชี เก็บไฟล์บน gateway host (ไม่ replicate หลาย instance)',
  ),
  m(
    'Langfuse, OpenTelemetry, Datadog, Sentry: UI placeholders — not integrated yet.',
    'Langfuse, OpenTelemetry, Datadog, Sentry: UI placeholder — chưa tích hợp.',
    'Langfuse, OpenTelemetry, Datadog, Sentry: UI placeholder — ยังไม่ได้เชื่อมต่อ',
  ),
]);

const availableDestinations = computed((): ObsDestination[] => [
  {
    id: 'usage',
    name: m('Usage & stats', 'Usage & thống kê', 'Usage และสถิติ'),
    descEn: 'Aggregated jobs, credits, and charts from Gommo usage-history.',
    descVi: 'Tổng hợp job, credit và biểu đồ từ Gommo usage-history.',
    descTh: 'สรุป job, credit และกราฟจาก Gommo usage-history',
    href: usageHref.value,
    status: 'open',
  },
  {
    id: 'logs',
    name: 'Job logs',
    descEn: 'Per-job rows — model, status, credits, timestamps.',
    descVi: 'Từng job — model, trạng thái, credit, thời gian.',
    descTh: 'แต่ละ job — model, สถานะ, credit, เวลา',
    href: logsHref.value,
    status: 'open',
  },
  {
    id: 'activity',
    name: 'Activity',
    descEn: 'Top-ups and account activity from billing.',
    descVi: 'Nạp credit và hoạt động tài khoản.',
    descTh: 'เติม credit และกิจกรรมบัญชีจาก billing',
    href: activityHref.value,
    status: 'open',
  },
  {
    id: 'docs',
    name: 'Usage API',
    descEn: 'GET/POST /gateway/usage/stats and /gateway/usage/logs.',
    descVi: 'GET/POST /gateway/usage/stats và /gateway/usage/logs.',
    descTh: 'GET/POST /gateway/usage/stats และ /gateway/usage/logs',
    href: usageDocsHref.value,
    status: 'open',
  },
  {
    id: 'obs-docs',
    name: m('Observability API (beta)', 'Observability API (beta)', 'Observability API (เบต้า)'),
    descEn: 'Webhook CRUD, event payloads, signing, and current limitations.',
    descVi: 'CRUD webhook, payload event, chữ ký và giới hạn hiện tại.',
    descTh: 'CRUD webhook, payload event, การลงนาม และข้อจำกัดปัจจุบัน',
    href: observabilityDocsHref.value,
    status: 'open',
  },
  {
    id: 'mcp',
    name: 'MCP (Cursor & IDE)',
    descEn: '10 image/video tools — monitor jobs from your editor.',
    descVi: '10 tools ảnh/video — theo dõi job từ IDE.',
    descTh: '10 tools รูป/วิดีโอ — ติดตาม job จาก IDE',
    href: mcpHref.value,
    status: 'open',
  },
]);

const comingSoonDestinations = computed((): ObsDestination[] => [
  {
    id: 'langfuse',
    name: 'Langfuse',
    descEn: 'Traces and prompt analytics.',
    descVi: 'Traces và phân tích prompt.',
    descTh: 'Traces และวิเคราะห์ prompt',
    status: 'soon',
  },
  {
    id: 'otel',
    name: 'OpenTelemetry',
    descEn: 'Export spans to an OTel collector.',
    descVi: 'Export spans sang OTel collector.',
    descTh: 'Export spans ไป OTel collector',
    status: 'soon',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    descEn: 'Metrics and APM for gateway traffic.',
    descVi: 'Metrics và APM cho traffic gateway.',
    descTh: 'Metrics และ APM สำหรับ traffic gateway',
    status: 'soon',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    descEn: 'Error tracking for failed jobs.',
    descVi: 'Theo dõi lỗi job thất bại.',
    descTh: 'ติดตามข้อผิดพลาดของ job ที่ล้มเหลว',
    status: 'soon',
  },
]);

function destDesc(item: ObsDestination): string {
  return m(item.descEn, item.descVi, item.descTh);
}

function onLocalMirrorChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  localMirror.value = checked;
  setLocalUsageMirrorEnabled(checked);
}

function webhookDisplayName(webhook: ObservabilityWebhook): string {
  return webhook.label?.trim() || webhook.url;
}

function deliveryBadge(webhook: ObservabilityWebhook): { label: string; tone: 'never' | 'ok' | 'error' } {
  if (!webhook.lastDeliveryAt) {
    return { label: m('Never sent', 'Chưa gửi', 'ยังไม่ส่ง'), tone: 'never' };
  }
  if (webhook.lastDeliveryStatus === 'ok') {
    return { label: 'OK', tone: 'ok' };
  }
  return { label: m('Error', 'Lỗi', 'ข้อผิดพลาด'), tone: 'error' };
}

function deliveryTime(webhook: ObservabilityWebhook): string {
  if (!webhook.lastDeliveryAt) return '';
  const tag = props.locale === 'vi' ? 'vi-VN' : props.locale === 'th' ? 'th-TH' : undefined;
  return new Date(webhook.lastDeliveryAt).toLocaleString(tag);
}

function clearWebhookFeedback() {
  webhooksError.value = '';
  webhooksSuccess.value = '';
}

function setWebhookSuccess(message: string) {
  webhooksError.value = '';
  webhooksSuccess.value = message;
}

async function copyPayloadExample() {
  try {
    await navigator.clipboard.writeText(PAYLOAD_EXAMPLE);
    copiedPayload.value = true;
    window.setTimeout(() => {
      copiedPayload.value = false;
    }, 2000);
  } catch {
    webhooksError.value = m('Could not copy', 'Không copy được', 'คัดลอกไม่ได้');
  }
}

async function loadStats() {
  statsLoading.value = true;
  statsError.value = '';
  try {
    const data = await fetchUsageStats({
      period: '7d',
      type: 'all',
      language: props.locale === 'vi' ? 'vi' : 'en',
    });
    totalJobs7d.value = data.summary?.total ?? 0;
  } catch (e) {
    statsError.value = e instanceof Error ? e.message : String(e);
    totalJobs7d.value = 0;
  } finally {
    statsLoading.value = false;
  }
  localJobCount.value = loadUsageHistory().length;
}

async function loadWebhooks() {
  webhooksLoading.value = true;
  webhooksError.value = '';
  try {
    webhooks.value = await fetchObservabilityWebhooks();
  } catch (e) {
    webhooks.value = [];
    webhooksError.value = e instanceof Error ? e.message : String(e);
  } finally {
    webhooksLoading.value = false;
  }
}

async function reloadAll() {
  await Promise.all([loadStats(), loadWebhooks()]);
}

async function onAddWebhook() {
  const url = webhookUrl.value.trim();
  if (!url || !canAddWebhook.value) return;
  webhookSaving.value = true;
  clearWebhookFeedback();
  try {
    await createObservabilityWebhook({
      url,
      label: webhookLabel.value.trim() || undefined,
      secret: webhookSecret.value.trim() || undefined,
    });
    webhookUrl.value = '';
    webhookLabel.value = '';
    webhookSecret.value = '';
    await loadWebhooks();
    setWebhookSuccess(m('Webhook added.', 'Đã thêm webhook.', 'เพิ่ม webhook แล้ว'));
  } catch (e) {
    webhooksError.value = e instanceof Error ? e.message : String(e);
  } finally {
    webhookSaving.value = false;
  }
}

async function onToggleWebhook(webhook: ObservabilityWebhook, event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;
  webhookActionId.value = webhook.id;
  try {
    await updateObservabilityWebhook(webhook.id, { enabled });
    await loadWebhooks();
  } catch (e) {
    webhooksError.value = e instanceof Error ? e.message : String(e);
  } finally {
    webhookActionId.value = '';
  }
}

async function onTestWebhook(id: string) {
  webhookActionId.value = id;
  clearWebhookFeedback();
  try {
    const result = await testObservabilityWebhook(id);
    if (!result.ok) {
      webhooksError.value = result.error || m('Test failed', 'Test thất bại', 'ทดสอบล้มเหลว');
    } else {
      setWebhookSuccess(
        m(
          'Test webhook sent — check your endpoint.',
          'Test webhook đã gửi — kiểm tra endpoint của bạn.',
          'ส่ง test webhook แล้ว — ตรวจ endpoint ของคุณ',
        ),
      );
    }
    await loadWebhooks();
  } catch (e) {
    webhooksError.value = e instanceof Error ? e.message : String(e);
  } finally {
    webhookActionId.value = '';
  }
}

async function onDeleteWebhook(id: string, label: string) {
  const prompt = m(`Delete webhook "${label}"?`, `Xóa webhook "${label}"?`, `ลบ webhook "${label}"?`);
  if (!window.confirm(prompt)) return;

  webhookActionId.value = id;
  clearWebhookFeedback();
  try {
    await deleteObservabilityWebhook(id);
    await loadWebhooks();
    setWebhookSuccess(m('Webhook deleted.', 'Đã xóa webhook.', 'ลบ webhook แล้ว'));
  } catch (e) {
    webhooksError.value = e instanceof Error ? e.message : String(e);
  } finally {
    webhookActionId.value = '';
  }
}

onMounted(() => {
  void reloadAll();
});

defineExpose({ reload: reloadAll });
</script>

<template>
  <div class="or-obs-page">
    <aside class="or-obs-beta-notice" aria-label="Beta limitations">
      <div class="or-obs-beta-notice-head">
        <span class="or-obs-pill or-obs-pill--beta">Beta</span>
        <strong class="or-obs-beta-notice-title">
          {{ m('Current capabilities', 'Khả năng hiện tại', 'ความสามารถปัจจุบัน') }}
        </strong>
      </div>
      <ul class="or-obs-beta-notice-list">
        <li v-for="(line, index) in betaLimitations" :key="index">{{ line }}</li>
      </ul>
      <p class="or-obs-beta-notice-foot">
        <a :href="observabilityDocsHref" class="or-obs-beta-notice-link">
          {{ m('Full API & limitations →', 'Chi tiết API & giới hạn →', 'รายละเอียด API และข้อจำกัด →') }}
        </a>
      </p>
    </aside>

    <div class="or-obs-stats" aria-label="Summary">
      <a :href="usageHref" class="or-obs-stat or-obs-stat--link" :title="m('Open Trends', 'Mở Trends', 'เปิด Trends')">
        <span class="or-obs-stat-label">{{ m('Jobs (7d)', 'Job 7 ngày', 'Job (7 วัน)') }}</span>
        <strong class="or-obs-stat-value">
          <template v-if="statsLoading">…</template>
          <template v-else>{{ totalJobs7d }}</template>
        </strong>
        <span v-if="statsError" class="or-obs-stat-hint or-obs-stat-hint--err">{{ statsError }}</span>
        <span v-else class="or-obs-stat-hint">Activity → Trends</span>
      </a>
      <a :href="logsHref" class="or-obs-stat or-obs-stat--link" :title="m('Open Explore', 'Mở Explore', 'เปิด Explore')">
        <span class="or-obs-stat-label">{{ m('Local mirror', 'Mirror local', 'Mirror ในเครื่อง') }}</span>
        <strong class="or-obs-stat-value">{{ localJobCount }}</strong>
        <span class="or-obs-stat-hint">Playground / Chat · Explore</span>
      </a>
      <a :href="creditsHref" class="or-obs-stat or-obs-stat--link" :title="m('Open Credits', 'Mở Credits', 'เปิด Credits')">
        <span class="or-obs-stat-label">{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</span>
        <strong class="or-obs-stat-value">{{ formatCredits(credits) }}</strong>
        <span class="or-obs-stat-hint">Gommo credits</span>
      </a>
    </div>

    <section class="or-obs-section" aria-labelledby="or-obs-logging-title">
      <h2 id="or-obs-logging-title" class="or-obs-section-title">
        Logging
      </h2>

      <div class="or-obs-row">
        <div class="or-obs-row-body">
          <h3 class="or-obs-row-title">
            Local session mirror
            <span class="or-obs-pill or-obs-pill--beta">Beta</span>
          </h3>
          <p class="or-obs-row-desc">
            {{
              m(
                'Playground and Chat append jobs to this browser’s localStorage (not sent externally).',
                'Playground và Chat ghi job vào localStorage trên trình duyệt này (không gửi ra ngoài).',
                'Playground และ Chat บันทึก job ใน localStorage ของเบราว์เซอร์นี้ (ไม่ส่งออก)',
              )
            }}
          </p>
        </div>
        <label class="or-obs-switch">
          <input
            type="checkbox"
            class="or-obs-switch-input"
            :checked="localMirror"
            @change="onLocalMirrorChange"
          />
          <span class="or-obs-switch-track" aria-hidden="true" />
        </label>
      </div>

      <div class="or-obs-row">
        <div class="or-obs-row-body">
          <h3 class="or-obs-row-title">Gommo usage-history</h3>
          <p class="or-obs-row-desc">
            {{
              m(
                'Job stats and logs from Gommo — primary source for Profile Usage and Logs.',
                'Thống kê và log job từ Gommo — nguồn chính cho Usage và Logs trong Profile.',
                'สถิติและ log job จาก Gommo — แหล่งหลักสำหรับ Usage และ Logs ใน Profile',
              )
            }}
          </p>
        </div>
        <span class="or-obs-pill or-obs-pill--on">{{ m('Always on', 'Luôn bật', 'เปิดตลอด') }}</span>
      </div>
    </section>

    <section class="or-obs-section" aria-labelledby="or-obs-webhooks-title">
      <div class="or-obs-section-head-row">
        <h2 id="or-obs-webhooks-title" class="or-obs-section-title or-obs-section-title--inline">
          <span>Webhooks</span>
          <span class="or-obs-pill or-obs-pill--beta">Beta</span>
        </h2>
        <span class="or-obs-webhook-count" :class="{ 'or-obs-webhook-count--full': webhookSlotsLeft === 0 }">
          {{ webhooks.length }}/{{ MAX_WEBHOOKS }}
        </span>
      </div>
      <p class="or-obs-section-sub">
        {{
          m(
            'Gateway POSTs JSON to your HTTPS endpoint. Media jobs via POST /gateway/jobs/* only — prefer wait=true. Async jobs (wait=false) can still receive webhooks after background poll when webhooks are registered.',
            'Gateway POST JSON tới endpoint HTTPS của bạn. Chỉ media jobs qua POST /gateway/jobs/* — ưu tiên wait=true. Job async (wait=false) vẫn có thể nhận webhook sau poll nền khi đã đăng ký webhook.',
            'Gateway POST JSON ไป HTTPS endpoint ของคุณ เฉพาะ media jobs ผ่าน POST /gateway/jobs/* — แนะนำ wait=true งาน async (wait=false) ยังได้ webhook หลัง poll พื้นหลังเมื่อลงทะเบียน webhook',
          )
        }}
      </p>
      <p class="or-obs-section-sub or-obs-verify-hint">
        <template v-if="locale === 'vi'">
          Kiểm tra live:
          <code>npm run observability:verify-background</code>
          (cần token trong <code>.env</code>) —
          <a :href="observabilityVerifyDocsHref" class="or-obs-beta-notice-link">hướng dẫn →</a>
        </template>
        <template v-else-if="locale === 'th'">
          ตรวจสอบ live:
          <code>npm run observability:verify-background</code>
          (ต้องมี token ใน <code>.env</code>) —
          <a :href="observabilityVerifyDocsHref" class="or-obs-beta-notice-link">คู่มือ →</a>
        </template>
        <template v-else>
          Live check:
          <code>npm run observability:verify-background</code>
          (token in <code>.env</code>) —
          <a :href="observabilityVerifyDocsHref" class="or-obs-beta-notice-link">docs →</a>
        </template>
      </p>

      <details class="or-obs-payload-details">
        <summary class="or-obs-payload-summary">
          {{ m('Example payload & headers', 'Ví dụ payload & headers', 'ตัวอย่าง payload และ headers') }}
        </summary>
        <div class="or-obs-payload-body">
          <p class="or-obs-payload-hint">
            {{
              m(
                'Headers: Content-Type, X-Gateway-Event, X-Gateway-Timestamp, X-Gateway-Signature (when secret is set).',
                'Headers: Content-Type, X-Gateway-Event, X-Gateway-Timestamp, X-Gateway-Signature (khi có secret).',
                'Headers: Content-Type, X-Gateway-Event, X-Gateway-Timestamp, X-Gateway-Signature (เมื่อตั้ง secret)',
              )
            }}
          </p>
          <pre class="or-obs-payload-pre"><code>{{ PAYLOAD_EXAMPLE }}</code></pre>
          <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" @click="copyPayloadExample">
            {{ copiedPayload ? m('Copied', 'Đã copy', 'คัดลอกแล้ว') : 'Copy JSON' }}
          </button>
        </div>
      </details>

      <form class="or-obs-webhook-form" @submit.prevent="onAddWebhook">
        <label class="or-obs-webhook-field">
          <span>Endpoint URL (HTTPS)</span>
          <input
            v-model="webhookUrl"
            type="url"
            required
            :disabled="!canAddWebhook"
            placeholder="https://example.com/hooks/gateway"
          />
        </label>
        <label class="or-obs-webhook-field">
          <span>{{ m('Label (optional)', 'Tên (tuỳ chọn)', 'ชื่อ (ไม่บังคับ)') }}</span>
          <input
            v-model="webhookLabel"
            type="text"
            :disabled="!canAddWebhook"
            placeholder="Production"
          />
        </label>
        <label class="or-obs-webhook-field">
          <span>{{ m('Signing secret (optional)', 'Signing secret (tuỳ chọn)', 'Signing secret (ไม่บังคับ)') }}</span>
          <input
            v-model="webhookSecret"
            type="password"
            autocomplete="off"
            :disabled="!canAddWebhook"
            :placeholder="m('For HMAC SHA-256', 'Dùng cho HMAC SHA-256', 'สำหรับ HMAC SHA-256')"
          />
        </label>
        <button type="submit" class="or-app-btn or-app-btn-primary or-app-btn-sm" :disabled="!canAddWebhook || !webhookUrl.trim()">
          {{ webhookSaving ? m('Saving…', 'Đang lưu…', 'กำลังบันทึก…') : m('Add webhook', 'Thêm webhook', 'เพิ่ม webhook') }}
        </button>
        <p v-if="webhookSlotsLeft === 0" class="or-obs-webhook-limit">
          {{
            m(
              `Maximum ${MAX_WEBHOOKS} webhooks per account.`,
              `Tối đa ${MAX_WEBHOOKS} webhook/account.`,
              `สูงสุด ${MAX_WEBHOOKS} webhook/บัญชี`,
            )
          }}
        </p>
      </form>

      <p v-if="webhooksSuccess" class="or-obs-webhook-success" role="status">{{ webhooksSuccess }}</p>
      <p v-if="webhooksError" class="or-obs-webhook-error">{{ webhooksError }}</p>
      <p v-if="webhooksLoading" class="or-app-muted or-obs-webhook-empty">{{ m('Loading…', 'Đang tải…', 'กำลังโหลด…') }}</p>
      <p v-else-if="webhooks.length === 0" class="or-app-muted or-obs-webhook-empty">
        {{ m('No webhooks yet.', 'Chưa có webhook.', 'ยังไม่มี webhook') }}
      </p>

      <ul v-else class="or-obs-dest-list">
        <li v-for="webhook in webhooks" :key="webhook.id" class="or-obs-dest or-obs-dest--webhook">
          <div class="or-obs-dest-body">
            <span class="or-obs-dest-name">{{ webhookDisplayName(webhook) }}</span>
            <p class="or-obs-dest-desc">
              <code class="or-obs-webhook-url">{{ webhook.url }}</code>
            </p>
            <p class="or-obs-dest-meta">
              <span class="or-obs-delivery-badge" :class="`or-obs-delivery-badge--${deliveryBadge(webhook).tone}`">
                {{ deliveryBadge(webhook).label }}
              </span>
              <span v-if="deliveryTime(webhook)"> · {{ deliveryTime(webhook) }}</span>
              <span v-if="webhook.secretHint"> · {{ webhook.secretHint }}</span>
              <span v-if="webhook.lastDeliveryError" class="or-obs-dest-meta-err"> — {{ webhook.lastDeliveryError }}</span>
            </p>
          </div>
          <div class="or-obs-webhook-actions">
            <label class="or-obs-switch or-obs-switch--sm" :title="m('Enable', 'Bật/tắt', 'เปิด/ปิด')">
              <input
                type="checkbox"
                class="or-obs-switch-input"
                :checked="webhook.enabled"
                :disabled="webhookActionId === webhook.id"
                @change="onToggleWebhook(webhook, $event)"
              />
              <span class="or-obs-switch-track" aria-hidden="true" />
            </label>
            <button
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-btn-sm"
              :disabled="webhookActionId === webhook.id"
              @click="onTestWebhook(webhook.id)"
            >
              Test
            </button>
            <button
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-btn-sm"
              :disabled="webhookActionId === webhook.id"
              @click="onDeleteWebhook(webhook.id, webhookDisplayName(webhook))"
            >
              {{ m('Delete', 'Xóa', 'ลบ') }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="or-obs-section" aria-labelledby="or-obs-available-title">
      <h2 id="or-obs-available-title" class="or-obs-section-title">
        {{ m('Available', 'Sẵn có', 'พร้อมใช้') }}
      </h2>
      <ul class="or-obs-dest-list">
        <li v-for="item in availableDestinations" :key="item.id" class="or-obs-dest">
          <div class="or-obs-dest-body">
            <span class="or-obs-dest-name">{{ item.name }}</span>
            <p class="or-obs-dest-desc">{{ destDesc(item) }}</p>
          </div>
          <a v-if="item.href" :href="item.href" class="or-app-btn or-app-btn-ghost or-app-btn-sm or-obs-dest-btn">
            {{ m('Open', 'Mở', 'เปิด') }} →
          </a>
        </li>
      </ul>
    </section>

    <section class="or-obs-section or-obs-section--muted" aria-labelledby="or-obs-soon-title">
      <h2 id="or-obs-soon-title" class="or-obs-section-title">
        {{ m('Coming soon', 'Sắp có', 'เร็วๆ นี้') }}
      </h2>
      <p class="or-obs-section-sub">
        {{
          m(
            'Native integrations with popular observability platforms.',
            'Tích hợp native với nền tảng observability phổ biến.',
            'การเชื่อมต่อ native กับแพลตฟอร์ม observability ยอดนิยม',
          )
        }}
      </p>
      <ul class="or-obs-dest-list">
        <li v-for="item in comingSoonDestinations" :key="item.id" class="or-obs-dest or-obs-dest--soon">
          <div class="or-obs-dest-body">
            <span class="or-obs-dest-name">{{ item.name }}</span>
            <p class="or-obs-dest-desc">{{ destDesc(item) }}</p>
          </div>
          <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm or-obs-dest-btn" disabled>
            {{ m('Coming soon', 'Sắp có', 'เร็วๆ นี้') }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
