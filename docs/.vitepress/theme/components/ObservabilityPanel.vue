<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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
  isVi: boolean;
  prefix: string;
  credits: number;
}>();

type DestStatus = 'open' | 'soon';

interface ObsDestination {
  id: string;
  name: string;
  descEn: string;
  descVi: string;
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
const webhookUrl = ref('');
const webhookLabel = ref('');
const webhookSecret = ref('');
const webhookSaving = ref(false);
const webhookActionId = ref('');

const usageHref = computed(() => `${props.prefix}/app/activity/?tab=trends`);
const logsHref = computed(() => `${props.prefix}/app/activity/?tab=explore`);
const activityHref = computed(() => `${props.prefix}/app/activity/`);
const usageDocsHref = computed(() => `${props.prefix}/reference/usage`);
const observabilityDocsHref = computed(() => `${props.prefix}/reference/observability`);
const mcpHref = computed(() => `${props.prefix}/mcp/`);

const betaLimitations = computed(() =>
  props.isVi
    ? [
        'Trang này đang beta — một số tính năng chưa hoàn chỉnh hoặc chỉ phù hợp dev / self-host.',
        'Usage & job logs từ Gommo usage-history: ổn định, luôn bật (qua Profile hoặc API /gateway/usage/*).',
        'Local session mirror: chỉ localStorage trên trình duyệt này; không sync, không gửi server.',
        'Webhooks: chỉ POST /gateway/jobs/* (media). wait=true → job.completed / job.failed sau poll gateway. wait=false → chỉ khi có kết quả ngay; job async hoàn thành sau không có webhook.',
        'Không webhook cho chat, audio, BYOK, hay gọi thẳng Gommo/proxy. Gommo upstream vẫn không có webhook native.',
        'Không retry queue; tối đa 5 endpoint/account; lưu file trên gateway (không replicate multi-instance).',
        'Langfuse, OpenTelemetry, Datadog, Sentry: UI placeholder — chưa tích hợp.',
      ]
    : [
        'This hub is in beta — some features are incomplete or best for dev / self-hosted gateways.',
        'Usage & job logs from Gommo usage-history: stable, always on (Profile or GET/POST /gateway/usage/*).',
        'Local session mirror: this browser’s localStorage only; not synced, not sent to the server.',
        'Webhooks: POST /gateway/jobs/* (media) only. wait=true → job.completed / job.failed after gateway poll. wait=false → only when the result is immediate; async jobs that finish later do not webhook.',
        'No webhooks for chat, audio, BYOK, or raw Gommo/proxy calls. Gommo upstream still has no native webhooks.',
        'No retry queue; max 5 endpoints per account; file store on the gateway host (not replicated across instances).',
        'Langfuse, OpenTelemetry, Datadog, Sentry: UI placeholders — not integrated yet.',
      ],
);

const availableDestinations = computed((): ObsDestination[] => [
  {
    id: 'usage',
    name: props.isVi ? 'Usage & thống kê' : 'Usage & stats',
    descEn: 'Aggregated jobs, credits, and charts from Gommo usage-history.',
    descVi: 'Tổng hợp job, credit và biểu đồ từ Gommo usage-history.',
    href: usageHref.value,
    status: 'open',
  },
  {
    id: 'logs',
    name: props.isVi ? 'Job logs' : 'Job logs',
    descEn: 'Per-job rows — model, status, credits, timestamps.',
    descVi: 'Từng job — model, trạng thái, credit, thời gian.',
    href: logsHref.value,
    status: 'open',
  },
  {
    id: 'activity',
    name: 'Activity',
    descEn: 'Top-ups and account activity from billing.',
    descVi: 'Nạp credit và hoạt động tài khoản.',
    href: activityHref.value,
    status: 'open',
  },
  {
    id: 'docs',
    name: props.isVi ? 'Usage API' : 'Usage API',
    descEn: 'GET/POST /gateway/usage/stats and /gateway/usage/logs.',
    descVi: 'GET/POST /gateway/usage/stats và /gateway/usage/logs.',
    href: usageDocsHref.value,
    status: 'open',
  },
  {
    id: 'obs-docs',
    name: props.isVi ? 'Observability API (beta)' : 'Observability API (beta)',
    descEn: 'Webhook CRUD, event payloads, signing, and current limitations.',
    descVi: 'CRUD webhook, payload event, chữ ký và giới hạn hiện tại.',
    href: observabilityDocsHref.value,
    status: 'open',
  },
  {
    id: 'mcp',
    name: props.isVi ? 'MCP (Cursor & IDE)' : 'MCP (Cursor & IDE)',
    descEn: '10 image/video tools — monitor jobs from your editor.',
    descVi: '10 tools ảnh/video — theo dõi job từ IDE.',
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
    status: 'soon',
  },
  {
    id: 'otel',
    name: 'OpenTelemetry',
    descEn: 'Export spans to an OTel collector.',
    descVi: 'Export spans sang OTel collector.',
    status: 'soon',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    descEn: 'Metrics and APM for gateway traffic.',
    descVi: 'Metrics và APM cho traffic gateway.',
    status: 'soon',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    descEn: 'Error tracking for failed jobs.',
    descVi: 'Theo dõi lỗi job thất bại.',
    status: 'soon',
  },
]);

function destDesc(item: ObsDestination): string {
  return props.isVi ? item.descVi : item.descEn;
}

function onLocalMirrorChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  localMirror.value = checked;
  setLocalUsageMirrorEnabled(checked);
}

function webhookDisplayName(webhook: ObservabilityWebhook): string {
  return webhook.label?.trim() || webhook.url;
}

function deliveryLabel(webhook: ObservabilityWebhook): string {
  if (!webhook.lastDeliveryAt) return props.isVi ? 'Chưa gửi' : 'Never sent';
  const status = webhook.lastDeliveryStatus === 'ok'
    ? props.isVi ? 'OK' : 'OK'
    : props.isVi ? 'Lỗi' : 'Error';
  return `${status} · ${new Date(webhook.lastDeliveryAt).toLocaleString(props.isVi ? 'vi-VN' : undefined)}`;
}

async function loadStats() {
  statsLoading.value = true;
  statsError.value = '';
  try {
    const data = await fetchUsageStats({ period: '7d', type: 'all', language: props.isVi ? 'vi' : 'en' });
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
  if (!url) return;
  webhookSaving.value = true;
  webhooksError.value = '';
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
  webhooksError.value = '';
  try {
    const result = await testObservabilityWebhook(id);
    if (!result.ok) {
      webhooksError.value = result.error || (props.isVi ? 'Test thất bại' : 'Test failed');
    }
    await loadWebhooks();
  } catch (e) {
    webhooksError.value = e instanceof Error ? e.message : String(e);
  } finally {
    webhookActionId.value = '';
  }
}

async function onDeleteWebhook(id: string) {
  webhookActionId.value = id;
  try {
    await deleteObservabilityWebhook(id);
    await loadWebhooks();
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
          {{ isVi ? 'Khả năng hiện tại' : 'Current capabilities' }}
        </strong>
      </div>
      <ul class="or-obs-beta-notice-list">
        <li v-for="(line, index) in betaLimitations" :key="index">{{ line }}</li>
      </ul>
      <p class="or-obs-beta-notice-foot">
        <a :href="observabilityDocsHref" class="or-obs-beta-notice-link">
          {{ isVi ? 'Chi tiết API & giới hạn →' : 'Full API & limitations →' }}
        </a>
      </p>
    </aside>

    <div class="or-obs-stats" aria-label="Summary">
      <div class="or-obs-stat">
        <span class="or-obs-stat-label">{{ isVi ? 'Job 7 ngày' : 'Jobs (7d)' }}</span>
        <strong class="or-obs-stat-value">
          <template v-if="statsLoading">…</template>
          <template v-else>{{ totalJobs7d }}</template>
        </strong>
        <span v-if="statsError" class="or-obs-stat-hint or-obs-stat-hint--err">{{ statsError }}</span>
      </div>
      <div class="or-obs-stat">
        <span class="or-obs-stat-label">{{ isVi ? 'Mirror local' : 'Local mirror' }}</span>
        <strong class="or-obs-stat-value">{{ localJobCount }}</strong>
        <span class="or-obs-stat-hint">{{ isVi ? 'Playground / Chat' : 'Playground / Chat' }}</span>
      </div>
      <div class="or-obs-stat">
        <span class="or-obs-stat-label">{{ isVi ? 'Số dư' : 'Balance' }}</span>
        <strong class="or-obs-stat-value">{{ formatCredits(credits) }}</strong>
        <span class="or-obs-stat-hint">{{ isVi ? 'Gommo credits' : 'Gommo credits' }}</span>
      </div>
    </div>

    <section class="or-obs-section" aria-labelledby="or-obs-logging-title">
      <h2 id="or-obs-logging-title" class="or-obs-section-title">
        {{ isVi ? 'Logging' : 'Logging' }}
      </h2>

      <div class="or-obs-row">
        <div class="or-obs-row-body">
          <h3 class="or-obs-row-title">
            {{ isVi ? 'Local session mirror' : 'Local session mirror' }}
            <span class="or-obs-pill or-obs-pill--beta">Beta</span>
          </h3>
          <p class="or-obs-row-desc">
            {{
              isVi
                ? 'Playground và Chat ghi job vào localStorage trên trình duyệt này (không gửi ra ngoài).'
                : 'Playground and Chat append jobs to this browser’s localStorage (not sent externally).'
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
          <h3 class="or-obs-row-title">{{ isVi ? 'Gommo usage-history' : 'Gommo usage-history' }}</h3>
          <p class="or-obs-row-desc">
            {{
              isVi
                ? 'Thống kê và log job từ Gommo — nguồn chính cho Usage và Logs trong Profile.'
                : 'Job stats and logs from Gommo — primary source for Profile Usage and Logs.'
            }}
          </p>
        </div>
        <span class="or-obs-pill or-obs-pill--on">{{ isVi ? 'Luôn bật' : 'Always on' }}</span>
      </div>
    </section>

    <section class="or-obs-section" aria-labelledby="or-obs-webhooks-title">
      <h2 id="or-obs-webhooks-title" class="or-obs-section-title or-obs-section-title--inline">
        <span>{{ isVi ? 'Webhooks' : 'Webhooks' }}</span>
        <span class="or-obs-pill or-obs-pill--beta">Beta</span>
      </h2>
      <p class="or-obs-section-sub">
        {{
          isVi
            ? 'Gateway POST JSON tới endpoint HTTPS của bạn. Chỉ media jobs qua POST /gateway/jobs/* — ưu tiên wait=true. Không đảm bảo delivery cho job async (wait=false).'
            : 'Gateway POSTs JSON to your HTTPS endpoint. Media jobs via POST /gateway/jobs/* only — prefer wait=true. Not guaranteed for async jobs (wait=false).'
        }}
      </p>

      <form class="or-obs-webhook-form" @submit.prevent="onAddWebhook">
        <label class="or-obs-webhook-field">
          <span>{{ isVi ? 'Endpoint URL (HTTPS)' : 'Endpoint URL (HTTPS)' }}</span>
          <input v-model="webhookUrl" type="url" required placeholder="https://example.com/hooks/gateway" />
        </label>
        <label class="or-obs-webhook-field">
          <span>{{ isVi ? 'Tên (tuỳ chọn)' : 'Label (optional)' }}</span>
          <input v-model="webhookLabel" type="text" :placeholder="isVi ? 'Production' : 'Production'" />
        </label>
        <label class="or-obs-webhook-field">
          <span>{{ isVi ? 'Signing secret (tuỳ chọn)' : 'Signing secret (optional)' }}</span>
          <input
            v-model="webhookSecret"
            type="password"
            autocomplete="off"
            :placeholder="isVi ? 'Dùng cho HMAC SHA-256' : 'For HMAC SHA-256'"
          />
        </label>
        <button type="submit" class="or-app-btn or-app-btn-primary or-app-btn-sm" :disabled="webhookSaving || !webhookUrl.trim()">
          {{ webhookSaving ? (isVi ? 'Đang lưu…' : 'Saving…') : isVi ? 'Thêm webhook' : 'Add webhook' }}
        </button>
      </form>

      <p v-if="webhooksError" class="or-obs-webhook-error">{{ webhooksError }}</p>
      <p v-if="webhooksLoading" class="or-app-muted or-obs-webhook-empty">{{ isVi ? 'Đang tải…' : 'Loading…' }}</p>
      <p v-else-if="webhooks.length === 0" class="or-app-muted or-obs-webhook-empty">
        {{ isVi ? 'Chưa có webhook.' : 'No webhooks yet.' }}
      </p>

      <ul v-else class="or-obs-dest-list">
        <li v-for="webhook in webhooks" :key="webhook.id" class="or-obs-dest or-obs-dest--webhook">
          <div class="or-obs-dest-body">
            <span class="or-obs-dest-name">{{ webhookDisplayName(webhook) }}</span>
            <p class="or-obs-dest-desc">
              <code class="or-obs-webhook-url">{{ webhook.url }}</code>
            </p>
            <p class="or-obs-dest-meta">
              {{ deliveryLabel(webhook) }}
              <span v-if="webhook.secretHint"> · {{ webhook.secretHint }}</span>
              <span v-if="webhook.lastDeliveryError" class="or-obs-dest-meta-err"> — {{ webhook.lastDeliveryError }}</span>
            </p>
          </div>
          <div class="or-obs-webhook-actions">
            <label class="or-obs-switch or-obs-switch--sm" :title="isVi ? 'Bật/tắt' : 'Enable'">
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
              {{ isVi ? 'Test' : 'Test' }}
            </button>
            <button
              type="button"
              class="or-app-btn or-app-btn-ghost or-app-btn-sm"
              :disabled="webhookActionId === webhook.id"
              @click="onDeleteWebhook(webhook.id)"
            >
              {{ isVi ? 'Xóa' : 'Delete' }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="or-obs-section" aria-labelledby="or-obs-available-title">
      <h2 id="or-obs-available-title" class="or-obs-section-title">
        {{ isVi ? 'Sẵn có' : 'Available' }}
      </h2>
      <ul class="or-obs-dest-list">
        <li v-for="item in availableDestinations" :key="item.id" class="or-obs-dest">
          <div class="or-obs-dest-body">
            <span class="or-obs-dest-name">{{ item.name }}</span>
            <p class="or-obs-dest-desc">{{ destDesc(item) }}</p>
          </div>
          <a v-if="item.href" :href="item.href" class="or-app-btn or-app-btn-ghost or-app-btn-sm or-obs-dest-btn">
            {{ isVi ? 'Mở' : 'Open' }} →
          </a>
        </li>
      </ul>
    </section>

    <section class="or-obs-section or-obs-section--muted" aria-labelledby="or-obs-soon-title">
      <h2 id="or-obs-soon-title" class="or-obs-section-title">
        {{ isVi ? 'Sắp có' : 'Coming soon' }}
      </h2>
      <p class="or-obs-section-sub">
        {{
          isVi
            ? 'Tích hợp native với nền tảng observability phổ biến.'
            : 'Native integrations with popular observability platforms.'
        }}
      </p>
      <ul class="or-obs-dest-list">
        <li v-for="item in comingSoonDestinations" :key="item.id" class="or-obs-dest or-obs-dest--soon">
          <div class="or-obs-dest-body">
            <span class="or-obs-dest-name">{{ item.name }}</span>
            <p class="or-obs-dest-desc">{{ destDesc(item) }}</p>
          </div>
          <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm or-obs-dest-btn" disabled>
            {{ isVi ? 'Sắp có' : 'Coming soon' }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
