<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { useVitepressUrlSync } from '../composables/use-vitepress-url-sync';
import type { PortalLocale } from '../models/portal-locale';
import { portalUsageLogsLanguage, portalUsageStatsLanguage } from '../models/portal-gommo-lang';
import { activityHubHref } from '../models/activity-hub-url';
import { fetchUsageLogs, fetchUsageModelAggregate, fetchUsageStats, formatCredits } from '../models/user-api';
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
  typeBreakdownFromSummary,
  downloadTextFile,
  exportListCsv,
  normalizeUsageListItem,
  usageJobId,
  type TopModelRow,
  type UsageListItem,
  type UsageStatsData,
  type UsageStatsPeriod,
  type UsageStatsType,
} from '../models/usage-stats';
import ProfileUsagePanel from './ProfileUsagePanel.vue';
import ProfileActivityPanel from './ProfileActivityPanel.vue';
import ActivityUsageCharts from './ActivityUsageCharts.vue';
import UsageJobDetailModal from './UsageJobDetailModal.vue';
import type { TopupOrder } from '../models/user-api';

type ActivityTab = 'overview' | 'trends' | 'explore' | 'billing';

const ACTIVITY_TABS = new Set<ActivityTab>(['overview', 'trends', 'explore', 'billing']);
const PERIOD_OPTIONS = new Set<UsageStatsPeriod>(['7d', '30d', '90d']);
const TYPE_OPTIONS = new Set<UsageStatsType>(['image', 'video', 'audio', 'music']);

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
  credits: number;
  topupOrders: TopupOrder[];
  ordersLoading: boolean;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const emit = defineEmits<{
  refresh: [];
}>();

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

function readModelFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('model')?.trim() || '';
}

function readJobFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('job')?.trim() || '';
}

function readTypeFromLocation(): UsageStatsType | 'all' {
  if (typeof window === 'undefined') return 'all';
  const type = new URLSearchParams(window.location.search).get('type');
  if (type && TYPE_OPTIONS.has(type as UsageStatsType)) return type as UsageStatsType;
  return 'all';
}

function readSearchFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('q')?.trim() || '';
}

const sharedPeriod = ref<UsageStatsPeriod>(readPeriodFromLocation());
const sharedModel = ref(readModelFromLocation());
const sharedJobId = ref(readJobFromLocation());
const sharedType = ref<UsageStatsType | 'all'>(readTypeFromLocation());
const sharedSearchQuery = ref(readSearchFromLocation());
const overviewLoading = ref(true);
const overviewError = ref('');
const statsData = ref<UsageStatsData | null>(null);
const recentJobs = ref<UsageListItem[]>([]);
const topModels = ref<TopModelRow[]>([]);
const topModelsScanned = ref(0);
const topModelsTruncated = ref(false);
const topModelsFromCache = ref(false);
const chartDays = ref(14);
const selectedJob = ref<UsageListItem | null>(null);
const jobDetailOpen = ref(false);
const overviewExporting = ref(false);
const overviewExportType = ref<UsageStatsType | 'all'>('all');

function readActivityTab(): ActivityTab {
  if (typeof window === 'undefined') return 'overview';
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab && ACTIVITY_TABS.has(tab as ActivityTab)) return tab as ActivityTab;
  return 'overview';
}

const activeTab = ref<ActivityTab>(readActivityTab());

const tabs = computed(() => [
  { id: 'overview' as const, label: m('Overview', 'Tổng quan', 'ภาพรวม') },
  { id: 'trends' as const, label: m('Trends', 'Xu hướng', 'แนวโน้ม') },
  { id: 'explore' as const, label: m('Explore', 'Khám phá', 'สำรวจ') },
  { id: 'billing' as const, label: m('Billing', 'Billing', 'การเรียกเก็บเงิน') },
]);

const periodOptions = computed(() => [
  { id: '7d' as const, label: m('7 days', '7 ngày', '7 วัน') },
  { id: '30d' as const, label: m('30 days', '30 ngày', '30 วัน') },
  { id: '90d' as const, label: m('90 days', '90 ngày', '90 วัน') },
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

const topModelsHint = computed(() => {
  if (topModelsScanned.value <= 0) return '';
  const scanned = topModelsScanned.value.toLocaleString();
  const base = topModelsTruncated.value
    ? m(
        `From ${scanned}+ jobs (scan cap)`,
        `Từ ${scanned}+ job (giới hạn scan)`,
        `จาก ${scanned}+ งาน (จำกัดการสแกน)`,
      )
    : m(`From ${scanned} jobs`, `Từ ${scanned} job`, `จาก ${scanned} งาน`);
  if (!topModelsFromCache.value) return base;
  return m(`${base} · cached`, `${base} · cache`, `${base} · แคช`);
});

const topModelsCacheTitle = computed(() => {
  if (!topModelsFromCache.value) return '';
  return m(
    'Gateway cache ~10 min. Click Refresh to rescan from Gommo.',
    'Cache gateway ~10 phút. Bấm Làm mới để quét lại từ Gommo.',
    'แคชเกตเวย ~10 นาที คลิกรีเฟรชเพื่อสแกนใหม่จาก Gommo',
  );
});

function syncQueryToUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (activeTab.value === 'overview') url.searchParams.delete('tab');
  else url.searchParams.set('tab', activeTab.value);
  if (sharedPeriod.value === '30d') url.searchParams.delete('period');
  else url.searchParams.set('period', sharedPeriod.value);
  if (activeTab.value === 'explore' && sharedModel.value) {
    url.searchParams.set('model', sharedModel.value);
  } else {
    url.searchParams.delete('model');
  }
  if (activeTab.value === 'explore' && sharedJobId.value) {
    url.searchParams.set('job', sharedJobId.value);
  } else {
    url.searchParams.delete('job');
  }
  if (activeTab.value === 'explore' && sharedType.value !== 'all') {
    url.searchParams.set('type', sharedType.value);
  } else {
    url.searchParams.delete('type');
  }
  if (activeTab.value === 'explore' && sharedSearchQuery.value) {
    url.searchParams.set('q', sharedSearchQuery.value);
  } else {
    url.searchParams.delete('q');
  }
  window.history.replaceState({}, '', url.toString());
}

function syncPeriodToUrl() {
  syncQueryToUrl();
}

function setSharedPeriod(period: UsageStatsPeriod) {
  if (sharedPeriod.value === period) return;
  sharedPeriod.value = period;
  syncQueryToUrl();
  if (activeTab.value === 'overview') void loadOverview();
}

function setSharedModel(model: string) {
  const next = model.trim();
  if (sharedModel.value === next) return;
  sharedModel.value = next;
  syncQueryToUrl();
}

function setSharedJob(jobId: string) {
  sharedJobId.value = jobId.trim();
  syncQueryToUrl();
}

function setSharedType(type: UsageStatsType | 'all') {
  if (sharedType.value === type) return;
  sharedType.value = type;
  syncQueryToUrl();
}

function setSharedSearch(query: string) {
  const next = query.trim();
  if (sharedSearchQuery.value === next) return;
  sharedSearchQuery.value = next;
  syncQueryToUrl();
}

const showEmptyOverview = computed(
  () =>
    !overviewLoading.value &&
    !overviewError.value &&
    (summary.value?.total ?? 0) === 0 &&
    recentJobs.value.length === 0,
);

function tabHref(tab: ActivityTab, model?: string): string {
  return activityHubHref(props.prefix, {
    tab,
    period: sharedPeriod.value,
    model: model?.trim() || (tab === 'explore' ? sharedModel.value : undefined),
    job: tab === 'explore' ? sharedJobId.value : undefined,
    type: tab === 'explore' ? sharedType.value : undefined,
    q: tab === 'explore' ? sharedSearchQuery.value : undefined,
  });
}

function exploreModelHref(model: string): string {
  return tabHref('explore', model);
}

function exploreTypeHref(jobType: UsageStatsType): string {
  return activityHubHref(props.prefix, {
    tab: 'explore',
    period: sharedPeriod.value,
    type: jobType,
  });
}

function openJobDetail(row: UsageListItem) {
  selectedJob.value = row;
  jobDetailOpen.value = true;
  const jobId = usageJobId(row);
  if (jobId) setSharedJob(jobId);
}

function closeJobDetail() {
  jobDetailOpen.value = false;
  selectedJob.value = null;
  if (sharedJobId.value) setSharedJob('');
}

function overviewJobShareHref(row: UsageListItem): string {
  const jobId = usageJobId(row);
  if (!jobId) return '';
  return activityHubHref(props.prefix, {
    tab: 'explore',
    period: sharedPeriod.value,
    model: row.model || undefined,
    job: jobId,
  });
}

const overviewJobShareHrefValue = computed(() =>
  selectedJob.value ? overviewJobShareHref(selectedJob.value) : '',
);

async function exportOverviewCsv() {
  if (overviewExporting.value) return;
  overviewExporting.value = true;
  const exportType = overviewExportType.value;
  try {
    const items: UsageListItem[] = [];
    for (let page = 1; page <= 10; page++) {
      const data = await fetchUsageLogs({
        period: sharedPeriod.value,
        type: exportType,
        language: portalUsageLogsLanguage(props.locale),
        page,
        limit: 100,
      });
      items.push(...data.items.map(normalizeUsageListItem));
      const pageFull = data.items.length >= (data.limit ?? 100);
      if (!data.has_more || data.items.length === 0 || !pageFull) break;
    }
    if (items.length === 0) return;
    const typeSuffix = exportType === 'all' ? '' : `-${exportType}`;
    downloadTextFile(
      exportListCsv(items),
      `activity-jobs-${sharedPeriod.value}${typeSuffix}.csv`,
    );
  } finally {
    overviewExporting.value = false;
  }
}

function statusLabel(status: ReturnType<typeof listItemStatus>): string {
  if (status === 'success') return m('Success', 'Thành công', 'สำเร็จ');
  if (status === 'failed') return m('Failed', 'Thất bại', 'ล้มเหลว');
  return m('Pending', 'Đang xử lý', 'รอดำเนินการ');
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

async function loadOverview(forceRefresh = false) {
  overviewLoading.value = true;
  overviewError.value = '';
  chartDays.value = chartDaysForPeriod(sharedPeriod.value);

  try {
    const [stats, aggregate, logs] = await Promise.all([
      fetchUsageStats({
        period: sharedPeriod.value,
        type: 'all',
        language: portalUsageStatsLanguage(props.locale),
      }),
      fetchUsageModelAggregate({
        period: sharedPeriod.value,
        type: 'all',
        language: portalUsageLogsLanguage(props.locale),
        top: 5,
        refresh: forceRefresh,
      }),
      fetchUsageLogs({
        period: sharedPeriod.value,
        type: 'all',
        language: portalUsageLogsLanguage(props.locale),
        page: 1,
        limit: 5,
      }),
    ]);
    statsData.value = stats;
    topModels.value = aggregate.items;
    topModelsScanned.value = aggregate.scanned_jobs;
    topModelsTruncated.value = aggregate.truncated;
    topModelsFromCache.value = Boolean(aggregate.from_cache);
    recentJobs.value = logs.items.slice(0, 5).map(normalizeUsageListItem);
  } catch (e) {
    statsData.value = null;
    topModels.value = [];
    topModelsScanned.value = 0;
    topModelsTruncated.value = false;
    topModelsFromCache.value = false;
    recentJobs.value = [];
    overviewError.value = e instanceof Error ? e.message : String(e);
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
  await loadOverview(true);
  await trendsRef.value?.reloadRecords();
  await exploreRef.value?.reloadRecords();
  emit('refresh');
}

function syncFromLocation() {
  const nextTab = readActivityTab();
  const nextPeriod = readPeriodFromLocation();
  const nextModel = nextTab === 'explore' ? readModelFromLocation() : '';
  const nextJob = nextTab === 'explore' ? readJobFromLocation() : '';
  const nextType = nextTab === 'explore' ? readTypeFromLocation() : 'all';
  const nextSearch = nextTab === 'explore' ? readSearchFromLocation() : '';
  const tabChanged = nextTab !== activeTab.value;
  const periodChanged = nextPeriod !== sharedPeriod.value;
  const modelChanged = nextModel !== sharedModel.value;
  const jobChanged = nextJob !== sharedJobId.value;
  const typeChanged = nextType !== sharedType.value;
  const searchChanged = nextSearch !== sharedSearchQuery.value;
  if (!tabChanged && !periodChanged && !modelChanged && !jobChanged && !typeChanged && !searchChanged) {
    return;
  }
  activeTab.value = nextTab;
  sharedPeriod.value = nextPeriod;
  sharedModel.value = nextModel;
  sharedJobId.value = nextJob;
  sharedType.value = nextType;
  sharedSearchQuery.value = nextSearch;
  void reloadActiveTab();
}

onMounted(() => {
  void reloadActiveTab();
});

useVitepressUrlSync(syncFromLocation);

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

    <p class="or-activity-hub-meta or-app-muted">
      <a :href="`${prefix}/app/observability/`" class="or-activity-hub-meta-link">
        {{ m('Webhook export → Observability', 'Webhook export → Observability', 'Webhook export → Observability') }}
      </a>
    </p>

    <div v-if="activeTab === 'overview'" class="or-activity-hub-panel or-activity-overview">
      <div class="or-activity-overview-toolbar">
        <div class="or-usage-filter-group" role="group" :aria-label="m('Time range', 'Khoảng thời gian', 'ช่วงเวลา')">
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
        <div class="or-activity-overview-toolbar-actions">
          <label class="or-usage-export-type-wrap">
            <span class="or-usage-export-type-label">{{ m('Export', 'Xuất', 'ส่งออก') }}</span>
            <select
              v-model="overviewExportType"
              class="or-usage-export-type"
              :disabled="overviewLoading || overviewExporting"
            >
              <option value="all">{{ m('All types', 'Tất cả', 'ทุกประเภท') }}</option>
              <option value="image">{{ m('Image', 'Ảnh', 'รูปภาพ') }}</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="music">{{ m('Music', 'Nhạc', 'เพลง') }}</option>
            </select>
          </label>
          <button
            type="button"
            class="or-app-btn or-app-btn-ghost or-app-btn-sm"
            :disabled="overviewLoading || overviewExporting || (summary?.total ?? 0) === 0"
            @click="exportOverviewCsv"
          >
            {{ overviewExporting ? m('Exporting…', 'Đang xuất…', 'กำลังส่งออก…') : m('Export CSV', 'Xuất CSV', 'ส่งออก CSV') }}
          </button>
          <button
            type="button"
            class="or-app-btn or-app-btn-ghost or-app-btn-sm"
            :disabled="overviewLoading"
            @click="loadOverview(true)"
          >
            {{ overviewLoading ? m('Loading…', 'Đang tải…', 'กำลังโหลด…') : m('Refresh', 'Làm mới', 'รีเฟรช') }}
          </button>
        </div>
      </div>

      <p v-if="overviewError" class="or-app-error">{{ overviewError }}</p>

      <div class="or-activity-overview-kpi-row">
        <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
          <div class="or-activity-hub-kpi-main">
            <span class="or-activity-hub-kpi-label">{{ m('Jobs', 'Jobs', 'งาน') }}</span>
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
            <span class="or-activity-hub-kpi-label">{{ m('Net credits', 'Credit thực', 'เครดิตสุทธิ') }}</span>
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
            <span class="or-activity-hub-kpi-label">{{ m('Success rate', 'Thành công', 'อัตราสำเร็จ') }}</span>
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
          <span class="or-activity-hub-kpi-label">{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</span>
          <strong class="or-activity-hub-kpi-value">{{ formatCredits(credits) }}</strong>
          <span class="or-activity-hub-kpi-sub">{{ m('Current', 'Hiện tại', 'ปัจจุบัน') }}</span>
        </div>
      </div>

      <p v-if="showEmptyOverview" class="or-activity-overview-empty or-app-muted">
        {{
          m(
            'No jobs in the selected range — try Playground or switch to 90 days.',
            'Chưa có job trong khoảng đã chọn — thử Playground hoặc mở khoảng 90 ngày.',
            'ไม่มีงานในช่วงที่เลือก — ลอง Playground หรือเปลี่ยนเป็นช่วง 90 วัน',
          )
        }}
        <a :href="`${prefix}/app/playground/`" class="or-profile-section-link">
          {{ m('Open Playground', 'Mở Playground', 'เปิด Playground') }} →
        </a>
      </p>

      <div class="or-activity-overview-grid">
        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ m('Activity over time', 'Hoạt động theo thời gian', 'กิจกรรมตามเวลา') }}</h3>
            <a :href="tabHref('trends')" class="or-profile-section-link or-profile-section-link--sm">
              {{ m('Trends', 'Trends', 'แนวโน้ม') }} →
            </a>
          </div>
          <div class="or-usage-chart-legend or-activity-overview-legend">
            <span class="or-usage-legend-item or-usage-legend-item--image">{{ m('Image', 'Ảnh', 'รูปภาพ') }}</span>
            <span class="or-usage-legend-item or-usage-legend-item--video">Video</span>
            <span class="or-usage-legend-item or-usage-legend-item--audio">Audio</span>
            <span class="or-usage-legend-item or-usage-legend-item--music">{{ m('Music', 'Nhạc', 'เพลง') }}</span>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--chart" aria-hidden="true" />
          <div
            v-else-if="chartSeries.every((p) => p.total === 0)"
            class="or-usage-chart-empty or-app-muted"
          >
            {{ m('No data yet.', 'Chưa có dữ liệu.', 'ยังไม่มีข้อมูล') }}
          </div>
          <div
            v-else
            class="or-usage-chart or-activity-overview-chart"
            role="img"
            :aria-label="m('Jobs chart', 'Biểu đồ job', 'กราฟงาน')"
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
            <h3 class="or-app-panel-title">{{ m('Usage by type', 'Theo loại job', 'การใช้งานตามประเภท') }}</h3>
            <a :href="tabHref('trends')" class="or-profile-section-link or-profile-section-link--sm">
              {{ m('Trends', 'Trends', 'แนวโน้ม') }} →
            </a>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--bars" aria-hidden="true" />
          <p v-else-if="typeBreakdown.length === 0" class="or-app-muted">
            {{ m('No data yet.', 'Chưa có dữ liệu.', 'ยังไม่มีข้อมูล') }}
          </p>
          <div v-else class="or-usage-type-bars">
            <a
              v-for="row in typeBreakdown"
              :key="row.jobType"
              :href="exploreTypeHref(row.jobType)"
              class="or-usage-type-row or-activity-type-drill-row or-activity-top-model-link"
              :title="`${m('Open Explore', 'Mở Explore', 'เปิด Explore')} — ${jobTypeLabel(row.jobType, props.locale)}`"
            >
              <span class="or-usage-type-label or-activity-type-link-label">
                {{ jobTypeLabel(row.jobType, props.locale) }} →
              </span>
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
            </a>
          </div>
        </div>

        <ActivityUsageCharts
          :chart="statsData?.chart"
          :chart-days="chartDays"
          :locale="props.locale"
          :loading="overviewLoading"
        />

        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ m('Top models', 'Top models', 'โมเดลยอดนิยม') }}</h3>
            <span
              v-if="topModelsHint"
              class="or-app-muted or-activity-overview-hint"
              :class="{ 'or-activity-overview-hint--cached': topModelsFromCache }"
              :title="topModelsCacheTitle || undefined"
            >
              {{ topModelsHint }}
            </span>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--bars" aria-hidden="true" />
          <p v-else-if="topModels.length === 0" class="or-app-muted">
            {{ m('No models yet.', 'Chưa có model.', 'ยังไม่มีโมเดล') }}
          </p>
          <div v-else class="or-usage-type-bars">
            <a
              v-for="row in topModels"
              :key="row.model"
              :href="exploreModelHref(row.model)"
              class="or-usage-type-row or-activity-top-model-row or-activity-top-model-link"
            >
              <code class="or-usage-model or-activity-top-model-name">{{ row.model }}</code>
              <div class="or-usage-type-track" role="presentation">
                <div class="or-usage-type-fill or-activity-top-model-fill" :style="{ width: `${row.percent}%` }" />
              </div>
              <span class="or-usage-type-meta">
                {{ row.count }}
                <template v-if="row.credit > 0"> · {{ formatCredits(row.credit) }}</template>
              </span>
            </a>
          </div>
        </div>

        <div class="or-app-panel or-activity-overview-widget">
          <div class="or-activity-hub-widget-head">
            <h3 class="or-app-panel-title">{{ m('Recent jobs', 'Job gần đây', 'งานล่าสุด') }}</h3>
            <a :href="tabHref('explore')" class="or-profile-section-link or-profile-section-link--sm">
              {{ m('Explore', 'Explore', 'สำรวจ') }} →
            </a>
          </div>
          <div v-if="overviewLoading" class="or-activity-skeleton or-activity-skeleton--table" aria-hidden="true" />
          <p v-else-if="recentJobs.length === 0" class="or-app-muted">
            {{ m('No jobs yet.', 'Chưa có job.', 'ยังไม่มีงาน') }}
          </p>
          <div v-else class="or-activity-recent-table-wrap">
            <table class="or-usage-table or-activity-recent-table">
              <thead>
                <tr>
                  <th>{{ m('Time', 'Thời gian', 'เวลา') }}</th>
                  <th>Model</th>
                  <th>Prompt</th>
                  <th>{{ m('Credit', 'Credit', 'เครดิต') }}</th>
                  <th>{{ m('Status', 'Trạng thái', 'สถานะ') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in recentJobs"
                  :key="row.id_base || `${row.created_at}-${row.model}`"
                  class="or-activity-recent-row or-usage-explore-row--clickable"
                  tabindex="0"
                  role="button"
                  @click="openJobDetail(row)"
                  @keydown.enter="openJobDetail(row)"
                >
                  <td class="or-usage-td-time">
                    {{ formatUsageTime(listItemCreatedAt(row) || '', props.locale) }}
                  </td>
                  <td>
                    <a
                      v-if="row.model"
                      :href="exploreModelHref(row.model)"
                      class="or-usage-model or-activity-recent-model-link"
                      @click.stop
                    >
                      {{ row.model }}
                    </a>
                    <code v-else class="or-usage-model">—</code>
                  </td>
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
        :locale="props.locale"
        :prefix="prefix"
        @period-change="setSharedPeriod"
      />
    </div>

    <div v-else-if="activeTab === 'explore'" class="or-activity-hub-panel">
      <ProfileUsagePanel
        ref="exploreRef"
        mode="logs"
        :initial-period="sharedPeriod"
        :initial-model-filter="sharedModel"
        :initial-job-id="sharedJobId"
        :initial-type-filter="sharedType"
        :initial-search-query="sharedSearchQuery"
        :credits="credits"
        :locale="props.locale"
        :prefix="prefix"
        @period-change="setSharedPeriod"
        @model-filter-change="setSharedModel"
        @job-id-change="setSharedJob"
        @type-filter-change="setSharedType"
        @search-query-change="setSharedSearch"
      />
    </div>

    <div v-else-if="activeTab === 'billing'" class="or-activity-hub-panel">
      <ProfileActivityPanel
        billing-only
        :activity-period="sharedPeriod"
        :locale="props.locale"
        :prefix="prefix"
        :credits="credits"
        :topup-orders="topupOrders"
        :orders-loading="ordersLoading"
        @refresh="emit('refresh')"
      />
    </div>

    <UsageJobDetailModal
      :open="jobDetailOpen"
      :item="selectedJob"
      :locale="props.locale"
      :share-href="overviewJobShareHrefValue"
      @close="closeJobDetail"
    />
  </div>
</template>
