<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import { fetchUsageLogs, fetchUsageStats, formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import {
  chartDaysForPeriod,
  chartSeriesFromStats,
  jobTypeLabel,
  listItemCredit,
  listItemCreatedAt,
  listItemStatus,
  sparklineSvgPath,
  sparklineValuesFromChart,
  topModelsFromLogs,
  typeBreakdownFromSummary,
  type TopModelRow,
  type UsageListItem,
  type UsageStatsData,
  type UsageStatsPeriod,
  type UsageStatsType,
} from '../models/usage-stats';
import ProfileUsagePanel from './ProfileUsagePanel.vue';
import ProfileActivityPanel from './ProfileActivityPanel.vue';
import ActivityUsageCharts from './ActivityUsageCharts.vue';
import type { TopupOrder } from '../models/user-api';

type ActivityTab = 'overview' | 'trends' | 'explore' | 'billing';

const ACTIVITY_TABS = new Set<ActivityTab>(['overview', 'trends', 'explore', 'billing']);
const PERIOD_OPTIONS = new Set<UsageStatsPeriod>(['7d', '30d', '90d']);

const props = defineProps<{
  isVi: boolean;
  prefix: string;
  credits: number;
  topupOrders: TopupOrder[];
  ordersLoading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const route = useRoute();

const trendsRef = ref<InstanceType<typeof ProfileUsagePanel> | null>(null);
const exploreRef = ref<InstanceType<typeof ProfileUsagePanel> | null>(null);

function readPeriodFromLocation(): UsageStatsPeriod {
  if (typeof window === 'undefined') return '30d';
  const period = new URLSearchParams(window.location.search).get('period');
  if (period && PERIOD_OPTIONS.has(period as UsageStatsPeriod)) {
    return period as UsageStatsPeriod;
  }
  return '30d';
}

const sharedPeriod = ref<UsageStatsPeriod>(readPeriodFromLocation());
const overviewLoading = ref(true);
const overviewError = ref('');
const statsData = ref<UsageStatsData | null>(null);
const recentJobs = ref<UsageListItem[]>([]);
const topModels = ref<TopModelRow[]>([]);
const chartDays = ref(14);

function readActivityTab(): ActivityTab {
  if (typeof window === 'undefined') return 'overview';
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab && ACTIVITY_TABS.has(tab as ActivityTab)) return tab as ActivityTab;
  return 'overview';
}

const activeTab = ref<ActivityTab>(readActivityTab());

const tabs = computed(() => [
  { id: 'overview' as const, label: props.isVi ? 'Tổng quan' : 'Overview' },
  { id: 'trends' as const, label: props.isVi ? 'Xu hướng' : 'Trends' },
  { id: 'explore' as const, label: props.isVi ? 'Khám phá' : 'Explore' },
  { id: 'billing' as const, label: props.isVi ? 'Billing' : 'Billing' },
]);

const periodOptions = computed(() => [
  { id: '7d' as const, label: props.isVi ? '7 ngày' : '7 days' },
  { id: '30d' as const, label: props.isVi ? '30 ngày' : '30 days' },
  { id: '90d' as const, label: props.isVi ? '90 ngày' : '90 days' },
]);

const summary = computed(() => statsData.value?.summary);

const successRate = computed(() => {
  const s = summary.value;
  if (!s || s.total <= 0) return 0;
  return Math.round((s.success / s.total) * 100);
});

const typeBreakdown = computed(() =>
  typeBreakdownFromSummary(statsData.value?.summary?.by_type || {}),
);

const chartSeries = computed(() =>
  chartSeriesFromStats(statsData.value?.chart, chartDays.value),
);

const chartMax = computed(() => Math.max(1, ...chartSeries.value.map((p) => p.total)));

const sparklineDays = computed(() => chartDaysForPeriod(sharedPeriod.value));

const jobsSparkline = computed(() =>
  sparklineSvgPath(
    sparklineValuesFromChart(statsData.value?.chart, sparklineDays.value, 'jobs'),
  ),
);

const creditsSparkline = computed(() =>
  sparklineSvgPath(
    sparklineValuesFromChart(statsData.value?.chart, sparklineDays.value, 'credits'),
  ),
);

const successSparkline = computed(() =>
  sparklineSvgPath(
    sparklineValuesFromChart(statsData.value?.chart, sparklineDays.value, 'success'),
  ),
);

const periodLabel = computed(() => {
  const opt = periodOptions.value.find((o) => o.id === sharedPeriod.value);
  return opt?.label ?? sharedPeriod.value;
});

function syncPeriodToUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (sharedPeriod.value === '30d') url.searchParams.delete('period');
  else url.searchParams.set('period', sharedPeriod.value);
  window.history.replaceState({}, '', url.toString());
}

function setSharedPeriod(period: UsageStatsPeriod) {
  if (sharedPeriod.value === period) return;
  sharedPeriod.value = period;
  syncPeriodToUrl();
  if (activeTab.value === 'overview') void loadOverview();
}

const showEmptyOverview = computed(
  () =>
    !overviewLoading.value &&
    !overviewError.value &&
    (summary.value?.total ?? 0) === 0 &&
    recentJobs.value.length === 0,
);

function tabHref(tab: ActivityTab): string {
  const params = new URLSearchParams();
  if (tab !== 'overview') params.set('tab', tab);
  if (sharedPeriod.value !== '30d') params.set('period', sharedPeriod.value);
  const query = params.toString();
  const base = `${props.prefix}/app/activity/`;
  return query ? `${base}?${query}` : base;
}

function statusLabel(status: ReturnType<typeof listItemStatus>): string {
  if (status === 'success') return props.isVi ? 'Thành công' : 'Success';
  if (status === 'failed') return props.isVi ? 'Thất bại' : 'Failed';
  return props.isVi ? 'Đang xử lý' : 'Pending';
}

function promptPreview(prompt?: string): string {
  const text = (prompt || '').trim();
  if (!text) return '—';
  return text.length > 48 ? `${text.slice(0, 48).trim()}…` : text;
}

function colHeight(value: number): number {
  return Math.round((value / chartMax.value) * 100);
}

function segFlex(value: number): number {
  return value > 0 ? value : 0;
}

function typeBarClass(jobType: UsageStatsType): string {
  return `or-activity-type-fill--${jobType}`;
}

async function loadOverview() {
  overviewLoading.value = true;
  overviewError.value = '';
  chartDays.value = chartDaysForPeriod(sharedPeriod.value);

  try {
    statsData.value = await fetchUsageStats({
      period: sharedPeriod.value,
      type: 'all',
      language: props.isVi ? 'vi' : 'en',
    });
  } catch (e) {
    statsData.value = null;
    overviewError.value = e instanceof Error ? e.message : String(e);
  }

  try {
    const logs = await fetchUsageLogs({
      period: sharedPeriod.value,
      type: 'all',
      language: 'VI',
      page: 1,
      limit: 100,
    });
    topModels.value = topModelsFromLogs(logs.items, 5);
    recentJobs.value = logs.items.slice(0, 5);
  } catch {
    topModels.value = [];
    recentJobs.value = [];
  }

  overviewLoading.value = false;
}

async function reloadActiveTab() {
  if (activeTab.value === 'overview') {
    await loadOverview();
    return;
  }
  if (activeTab.value === 'trends') {
    await trendsRef.value?.reloadRecords();
    return;
  }
  if (activeTab.value === 'explore') {
    await exploreRef.value?.reloadRecords();
  }
}

async function reloadAll() {
  await loadOverview();
  await trendsRef.value?.reloadRecords();
  await exploreRef.value?.reloadRecords();
  emit('refresh');
}

onMounted(() => {
  void reloadActiveTab();
});

watch(
  () => route.fullPath,
  () => {
    activeTab.value = readActivityTab();
    const nextPeriod = readPeriodFromLocation();
    if (nextPeriod !== sharedPeriod.value) sharedPeriod.value = nextPeriod;
    void reloadActiveTab();
  },
);

defineExpose({ reload: reloadAll });
</script>

<template>
  <div class="or-activity-hub">
    <nav class="or-activity-hub-tabs" aria-label="Activity sections">
      <a
        v-for="tab in tabs"
        :key="tab.id"
        :href="tabHref(tab.id)"
        class="or-activity-hub-tab"
        :class="{ active: activeTab === tab.id }"
      >
        {{ tab.label }}
      </a>
    </nav>

    <div v-if="activeTab === 'overview'" class="or-activity-hub-panel or-activity-overview">
      <div class="or-activity-overview-toolbar">
        <div class="or-usage-filter-group" role="group" :aria-label="isVi ? 'Khoảng thời gian' : 'Time range'">
          <button
            v-for="opt in periodOptions"
            :key="opt.id"
            type="button"
            class="or-usage-pill"
            :class="{ active: sharedPeriod === opt.id }"
            @click="setSharedPeriod(opt.id)"
          >
            {{ opt.label }}
          </button>
        </div>
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="overviewLoading"
          @click="loadOverview"
        >
          {{ overviewLoading ? (isVi ? 'Đang tải…' : 'Loading…') : isVi ? 'Làm mới' : 'Refresh' }}
        </button>
      </div>

      <p v-if="overviewError" class="or-app-error">{{ overviewError }}</p>

      <div class="or-activity-overview-kpi-row">
        <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
          <div class="or-activity-hub-kpi-main">
            <span class="or-activity-hub-kpi-label">{{ isVi ? 'Jobs' : 'Jobs' }}</span>
            <strong class="or-activity-hub-kpi-value">
              <span v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--text" />
              <template v-else>{{ (summary?.total ?? 0).toLocaleString() }}</template>
            </strong>
            <span class="or-activity-hub-kpi-sub">{{ periodLabel }}</span>
          </div>
          <svg
            v-if="jobsSparkline && !overviewLoading"
            class="or-activity-sparkline"
            viewBox="0 0 72 28"
            width="72"
            height="28"
            aria-hidden="true"
          >
            <path :d="jobsSparkline" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </div>

        <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
          <div class="or-activity-hub-kpi-main">
            <span class="or-activity-hub-kpi-label">{{ isVi ? 'Credit thực' : 'Net credits' }}</span>
            <strong class="or-activity-hub-kpi-value">
              <span v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--text" />
              <template v-else>{{ formatCredits(summary?.credit_net ?? 0) }}</template>
            </strong>
            <span class="or-activity-hub-kpi-sub">{{ periodLabel }}</span>
          </div>
          <svg
            v-if="creditsSparkline && !overviewLoading"
            class="or-activity-sparkline or-activity-sparkline--credits"
            viewBox="0 0 72 28"
            width="72"
            height="28"
            aria-hidden="true"
          >
            <path :d="creditsSparkline" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </div>

        <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
          <div class="or-activity-hub-kpi-main">
            <span class="or-activity-hub-kpi-label">{{ isVi ? 'Thành công' : 'Success rate' }}</span>
            <strong class="or-activity-hub-kpi-value">
              <span v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--text" />
              <template v-else>{{ successRate }}%</template>
            </strong>
            <span class="or-activity-hub-kpi-sub">
              <template v-if="!overviewLoading && summary">
                {{ summary.success }}/{{ summary.total }}
              </template>
            </span>
          </div>
          <svg
            v-if="successSparkline && !overviewLoading"
            class="or-activity-sparkline or-activity-sparkline--success"
            viewBox="0 0 72 28"
            width="72"
            height="28"
            aria-hidden="true"
          >
            <path :d="successSparkline" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </div>

        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ isVi ? 'Số dư' : 'Balance' }}</span>
          <strong class="or-activity-hub-kpi-value">{{ formatCredits(credits) }}</strong>
          <span class="or-activity-hub-kpi-sub">{{ isVi ? 'Hiện tại' : 'Current' }}</span>
        </div>
      </div>

      <p v-if="showEmptyOverview" class="or-activity-overview-empty or-app-muted">
        {{
          isVi
            ? 'Chưa có job trong khoảng đã chọn — thử Playground hoặc mở khoảng 90 ngày.'
            : 'No jobs in the selected range — try Playground or switch to 90 days.'
        }}
        <a :href="`${prefix}/app/playground/`" class="or-profile-section-link">
          {{ isVi ? 'Mở Playground' : 'Open Playground' }} →
        </a>
      </p>

      <div class="or-activity-overview-grid">
        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ isVi ? 'Hoạt động theo thời gian' : 'Activity over time' }}</h3>
            <a :href="tabHref('trends')" class="or-profile-section-link or-profile-section-link--sm">
              {{ isVi ? 'Trends' : 'Trends' }} →
            </a>
          </div>
          <div class="or-usage-chart-legend or-activity-overview-legend">
            <span class="or-usage-legend-item or-usage-legend-item--image">{{ isVi ? 'Ảnh' : 'Image' }}</span>
            <span class="or-usage-legend-item or-usage-legend-item--video">Video</span>
            <span class="or-usage-legend-item or-usage-legend-item--audio">Audio</span>
            <span class="or-usage-legend-item or-usage-legend-item--music">{{ isVi ? 'Nhạc' : 'Music' }}</span>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--chart" aria-hidden="true" />
          <div
            v-else-if="chartSeries.every((p) => p.total === 0)"
            class="or-usage-chart-empty or-app-muted"
          >
            {{ isVi ? 'Chưa có dữ liệu.' : 'No data yet.' }}
          </div>
          <div
            v-else
            class="or-usage-chart or-activity-overview-chart"
            role="img"
            :aria-label="isVi ? 'Biểu đồ job' : 'Jobs chart'"
          >
            <div v-for="(point, idx) in chartSeries" :key="`${point.label}-${idx}`" class="or-usage-chart-col">
              <div class="or-usage-chart-bar-track">
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

        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ isVi ? 'Theo loại job' : 'Usage by type' }}</h3>
            <a :href="tabHref('trends')" class="or-profile-section-link or-profile-section-link--sm">
              {{ isVi ? 'Trends' : 'Trends' }} →
            </a>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--bars" aria-hidden="true" />
          <p v-else-if="typeBreakdown.length === 0" class="or-app-muted">
            {{ isVi ? 'Chưa có dữ liệu.' : 'No data yet.' }}
          </p>
          <div v-else class="or-usage-type-bars">
            <div v-for="row in typeBreakdown" :key="row.jobType" class="or-usage-type-row">
              <span class="or-usage-type-label">{{ jobTypeLabel(row.jobType, isVi) }}</span>
              <div class="or-usage-type-track" role="presentation">
                <div
                  class="or-usage-type-fill"
                  :class="typeBarClass(row.jobType)"
                  :style="{ width: `${row.percent}%` }"
                />
              </div>
              <span class="or-usage-type-meta">
                {{ row.count }} · {{ row.percent }}%
                <template v-if="row.creditNet > 0"> · {{ formatCredits(row.creditNet) }}</template>
              </span>
            </div>
          </div>
        </div>

        <ActivityUsageCharts
          :chart="statsData?.chart"
          :chart-days="chartDays"
          :is-vi="isVi"
          :loading="overviewLoading"
        />

        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ isVi ? 'Top models' : 'Top models' }}</h3>
            <span class="or-app-muted or-activity-overview-hint">
              {{ isVi ? 'Từ 100 job gần nhất' : 'From last 100 jobs' }}
            </span>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--bars" aria-hidden="true" />
          <p v-else-if="topModels.length === 0" class="or-app-muted">
            {{ isVi ? 'Chưa có model.' : 'No models yet.' }}
          </p>
          <div v-else class="or-usage-type-bars">
            <div v-for="row in topModels" :key="row.model" class="or-usage-type-row or-activity-top-model-row">
              <code class="or-usage-model or-activity-top-model-name">{{ row.model }}</code>
              <div class="or-usage-type-track" role="presentation">
                <div class="or-usage-type-fill or-activity-top-model-fill" :style="{ width: `${row.percent}%` }" />
              </div>
              <span class="or-usage-type-meta">
                {{ row.count }}
                <template v-if="row.credit > 0"> · {{ formatCredits(row.credit) }}</template>
              </span>
            </div>
          </div>
        </div>

        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ isVi ? 'Job gần đây' : 'Recent jobs' }}</h3>
            <a :href="tabHref('explore')" class="or-profile-section-link or-profile-section-link--sm">
              {{ isVi ? 'Explore' : 'Explore' }} →
            </a>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--table" aria-hidden="true" />
          <p v-else-if="recentJobs.length === 0" class="or-app-muted">
            {{ isVi ? 'Chưa có job.' : 'No jobs yet.' }}
          </p>
          <div v-else class="or-activity-recent-table-wrap">
            <table class="or-usage-table or-activity-recent-table">
              <thead>
                <tr>
                  <th>{{ isVi ? 'Thời gian' : 'Time' }}</th>
                  <th>Model</th>
                  <th>Prompt</th>
                  <th>{{ isVi ? 'Credit' : 'Credit' }}</th>
                  <th>{{ isVi ? 'Trạng thái' : 'Status' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in recentJobs" :key="row.id_base || `${row.created_at}-${row.model}`">
                  <td class="or-usage-td-time">
                    {{ formatUsageTime(listItemCreatedAt(row) || '', isVi) }}
                  </td>
                  <td><code class="or-usage-model">{{ row.model || '—' }}</code></td>
                  <td class="or-usage-td-prompt">
                    <span :title="row.prompt">{{ promptPreview(row.prompt) }}</span>
                  </td>
                  <td>{{ listItemCredit(row) > 0 ? formatCredits(listItemCredit(row)) : '—' }}</td>
                  <td>
                    <span class="or-usage-status" :class="`or-usage-status--${listItemStatus(row)}`">
                      {{ statusLabel(listItemStatus(row)) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'trends'" class="or-activity-hub-panel">
      <ProfileUsagePanel
        ref="trendsRef"
        activity-tab="trends"
        :initial-period="sharedPeriod"
        :credits="credits"
        :is-vi="isVi"
        :prefix="prefix"
        @period-change="setSharedPeriod"
      />
    </div>

    <div v-else-if="activeTab === 'explore'" class="or-activity-hub-panel">
      <ProfileUsagePanel
        ref="exploreRef"
        mode="logs"
        :initial-period="sharedPeriod"
        :credits="credits"
        :is-vi="isVi"
        :prefix="prefix"
        @period-change="setSharedPeriod"
      />
    </div>

    <div v-else-if="activeTab === 'billing'" class="or-activity-hub-panel">
      <ProfileActivityPanel
        billing-only
        :is-vi="isVi"
        :prefix="prefix"
        :credits="credits"
        :topup-orders="topupOrders"
        :orders-loading="ordersLoading"
        @refresh="emit('refresh')"
      />
    </div>
  </div>
</template>
