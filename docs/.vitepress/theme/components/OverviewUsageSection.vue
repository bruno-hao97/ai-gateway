<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchUsageLogs, fetchUsageStats, formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import {
  chartSeriesFromStats,
  jobTypeLabel,
  listItemCredit,
  listItemCreatedAt,
  listItemStatus,
  type UsageListItem,
  type UsageStatsData,
  type UsageStatsType,
} from '../models/usage-stats';

const props = defineProps<{
  credits: number;
  isVi: boolean;
  prefix: string;
}>();

const emit = defineEmits<{
  statsLoaded: [payload: { totalJobs: number; hasError: boolean }];
}>();

const loading = ref(true);
const statsError = ref('');
const listError = ref('');
const statsData = ref<UsageStatsData | null>(null);
const recentJobs = ref<UsageListItem[]>([]);

const summary = computed(() => statsData.value?.summary);

const successRate = computed(() => {
  const s = summary.value;
  if (!s || s.total <= 0) return 0;
  return Math.round((s.success / s.total) * 100);
});

const chartSeries = computed(() => chartSeriesFromStats(statsData.value?.chart, 7));

const chartMax = computed(() => Math.max(1, ...chartSeries.value.map((p) => p.total)));

const usageHref = computed(() => `${props.prefix}/app/profile/?section=usage`);
const logsHref = computed(() => `${props.prefix}/app/profile/?section=logs`);

function colHeight(total: number): number {
  return Math.round((total / chartMax.value) * 100);
}

function segFlex(value: number): number {
  return value > 0 ? value : 0;
}

function statusLabel(status: ReturnType<typeof listItemStatus>): string {
  if (status === 'success') return props.isVi ? 'Thành công' : 'Success';
  if (status === 'failed') return props.isVi ? 'Thất bại' : 'Failed';
  return props.isVi ? 'Đang xử lý' : 'Pending';
}

function promptPreview(prompt?: string): string {
  const text = (prompt || '').trim();
  if (!text) return '—';
  return text.length > 56 ? `${text.slice(0, 56).trim()}…` : text;
}

async function load() {
  loading.value = true;
  statsError.value = '';
  listError.value = '';

  try {
    statsData.value = await fetchUsageStats({
      period: '7d',
      type: 'all',
      language: props.isVi ? 'vi' : 'en',
    });
  } catch (e) {
    statsData.value = null;
    statsError.value = e instanceof Error ? e.message : String(e);
  }

  try {
    const data = await fetchUsageLogs({
      period: '7d',
      type: 'all',
      language: 'VI',
      page: 1,
      limit: 3,
    });
    recentJobs.value = data.items.slice(0, 3);
  } catch (e) {
    recentJobs.value = [];
    listError.value = e instanceof Error ? e.message : String(e);
  }

  loading.value = false;
  emit('statsLoaded', {
    totalJobs: statsData.value?.summary?.total ?? 0,
    hasError: Boolean(statsError.value),
  });
}

onMounted(() => {
  void load();
});

defineExpose({ reload: load });
</script>

<template>
  <section class="or-overview-usage" aria-labelledby="overview-usage-title">
    <div class="or-overview-usage-head">
      <div>
        <h2 id="overview-usage-title" class="or-overview-usage-title">
          {{ isVi ? '7 ngày gần đây' : 'Last 7 days' }}
        </h2>
        <p class="or-overview-usage-sub">
          {{ isVi ? 'Từ Gommo usage-history — cùng nguồn tab Usage.' : 'From Gommo usage-history — same source as Usage tab.' }}
        </p>
      </div>
      <a :href="usageHref" class="or-overview-usage-link">
        {{ isVi ? 'Xem Usage' : 'View Usage' }} →
      </a>
    </div>

    <p v-if="loading" class="or-app-muted or-overview-usage-loading">
      {{ isVi ? 'Đang tải thống kê…' : 'Loading stats…' }}
    </p>

    <template v-else>
      <p v-if="statsError" class="or-app-error or-overview-usage-note">{{ statsError }}</p>

      <div class="or-overview-kpi-row">
        <div class="or-overview-kpi">
          <p class="or-overview-kpi-value">{{ (summary?.total ?? 0).toLocaleString() }}</p>
          <p class="or-overview-kpi-label">{{ isVi ? 'Jobs' : 'Jobs' }}</p>
        </div>
        <div class="or-overview-kpi">
          <p class="or-overview-kpi-value">{{ formatCredits(summary?.credit_net ?? 0) }}</p>
          <p class="or-overview-kpi-label">{{ isVi ? 'Credit trừ' : 'Credits used' }}</p>
        </div>
        <div class="or-overview-kpi">
          <p class="or-overview-kpi-value">{{ successRate }}%</p>
          <p class="or-overview-kpi-label">{{ isVi ? 'Thành công' : 'Success rate' }}</p>
        </div>
      </div>

      <div class="or-app-panel or-overview-chart-panel">
        <div v-if="chartSeries.every((p) => p.total === 0)" class="or-usage-chart-empty or-app-muted">
          {{ isVi ? 'Chưa có job trong 7 ngày — thử Playground.' : 'No jobs in the last 7 days — try Playground.' }}
        </div>
        <div
          v-else
          class="or-usage-chart or-overview-chart"
          role="img"
          :aria-label="isVi ? 'Biểu đồ 7 ngày' : '7-day chart'"
        >
          <div v-for="(point, idx) in chartSeries" :key="`${point.label}-${idx}`" class="or-usage-chart-col">
            <div class="or-usage-chart-bar-track or-overview-chart-track">
              <div
                class="or-usage-chart-stack"
                :style="{ height: `${colHeight(point.total)}%` }"
                :title="`${point.total} · ${formatCredits(point.credit)}`"
              >
                <div
                  v-if="point.image > 0"
                  class="or-usage-chart-seg or-usage-chart-seg--image"
                  :style="{ flexGrow: segFlex(point.image) }"
                />
                <div
                  v-if="point.video > 0"
                  class="or-usage-chart-seg or-usage-chart-seg--video"
                  :style="{ flexGrow: segFlex(point.video) }"
                />
                <div
                  v-if="point.audio > 0"
                  class="or-usage-chart-seg or-usage-chart-seg--audio"
                  :style="{ flexGrow: segFlex(point.audio) }"
                />
                <div
                  v-if="point.music > 0"
                  class="or-usage-chart-seg or-usage-chart-seg--music"
                  :style="{ flexGrow: segFlex(point.music) }"
                />
              </div>
            </div>
            <span class="or-usage-chart-label">{{ point.label }}</span>
          </div>
        </div>
      </div>

      <div class="or-overview-recent">
        <div class="or-overview-recent-head">
          <h3 class="or-app-panel-title">{{ isVi ? 'Job gần đây' : 'Recent jobs' }}</h3>
          <a :href="logsHref" class="or-overview-usage-link or-overview-usage-link--sm">
            {{ isVi ? 'Xem logs' : 'View logs' }} →
          </a>
        </div>
        <p v-if="listError" class="or-app-error or-overview-usage-note">{{ listError }}</p>
        <p v-else-if="recentJobs.length === 0" class="or-app-muted or-overview-recent-empty">
          {{ isVi ? 'Chưa có job gần đây.' : 'No recent jobs yet.' }}
        </p>
        <ul v-else class="or-overview-recent-list">
          <li v-for="row in recentJobs" :key="row.id_base || `${row.created_at}-${row.model}`">
            <div class="or-overview-recent-main">
              <span class="or-overview-recent-type">
                {{ jobTypeLabel((row.type as UsageStatsType) || 'image', isVi) }}
              </span>
              <code class="or-overview-recent-model">{{ row.model || '—' }}</code>
              <span class="or-overview-recent-prompt" :title="row.prompt">{{ promptPreview(row.prompt) }}</span>
            </div>
            <div class="or-overview-recent-meta">
              <span class="or-overview-recent-time">
                {{ formatUsageTime(listItemCreatedAt(row) || '', isVi) }}
              </span>
              <span
                class="or-usage-status or-overview-recent-status"
                :class="`or-usage-status--${listItemStatus(row)}`"
              >
                {{ statusLabel(listItemStatus(row)) }}
              </span>
              <span v-if="listItemCredit(row) > 0" class="or-overview-recent-credit">
                {{ formatCredits(listItemCredit(row)) }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
