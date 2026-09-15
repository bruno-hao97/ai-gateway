<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { PortalLocale } from '../models/portal-locale';
import { portalUsageLogsLanguage, portalUsageStatsLanguage } from '../models/portal-gommo-lang';
import { activityHubHref } from '../models/activity-hub-url';
import { fetchUsageLogs, fetchUsageStats, formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import {
  chartDaysForPeriod,
  chartSeriesFromStats,
  downloadTextFile,
  exportListCsv,
  exportStatsTableCsv,
  filterListItems,
  filterStatsTable,
  matchesUsageJobId,
  normalizeUsageListItem,
  usageJobId,
  jobTypeLabel,
  listItemCredit,
  listItemCreatedAt,
  listItemStatus,
  periodFromRange,
  rangeToStatsPeriod,
  sparklineSvgPath,
  sparklineValuesFromChart,
  typeBreakdownFromSummary,
  type UsageListItem,
  type UsageStatsData,
  type UsageStatsPeriod,
  type UsageStatsType,
} from '../models/usage-stats';
import type { UsageRange } from '../models/usage-history';
import ActivityUsageCharts from './ActivityUsageCharts.vue';
import UsageJobDetailModal from './UsageJobDetailModal.vue';

const props = defineProps<{
  credits: number;
  locale: PortalLocale;
  prefix: string;
  /** full = stats + chart + logs; logs = job history only */
  mode?: 'full' | 'logs';
  /** Activity hub: trends = chart + daily table only */
  activityTab?: 'trends';
  /** Sync period from Activity hub (?period=) */
  initialPeriod?: UsageStatsPeriod;
  /** Pre-filter Explore by model (?model=) */
  initialModelFilter?: string;
  /** Deep-link job modal (?job=) */
  initialJobId?: string;
  /** Pre-filter Explore by job type (?type=) */
  initialTypeFilter?: UsageStatsType | 'all';
  /** Pre-fill Explore search (?q=) */
  initialSearchQuery?: string;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const usageStatsLanguage = computed(() => portalUsageStatsLanguage(props.locale));
const usageLogsLanguage = computed(() => portalUsageLogsLanguage(props.locale));

const emit = defineEmits<{
  periodChange: [period: UsageStatsPeriod];
  modelFilterChange: [model: string];
  jobIdChange: [jobId: string];
  typeFilterChange: [type: UsageStatsType | 'all'];
  searchQueryChange: [query: string];
}>();

const logsOnly = computed(() => props.mode === 'logs');
const trendsOnly = computed(() => props.activityTab === 'trends');
const showJobList = computed(() => !trendsOnly.value);
const showStatsBlocks = computed(() => !logsOnly.value);

const loading = ref(false);
const listLoading = ref(false);
const statsError = ref('');
const listError = ref('');
const statsData = ref<UsageStatsData | null>(null);
const listItems = ref<UsageListItem[]>([]);
const listPage = ref(1);
const listHasMore = ref(false);
const range = ref<UsageRange>('30d');
const typeFilter = ref<UsageStatsType | 'all'>('all');
const searchQuery = ref('');
const modelFilter = ref('');
const chartDays = ref(14);
const selectedJob = ref<UsageListItem | null>(null);
const jobDetailOpen = ref(false);
const pendingJobId = ref('');
const exploreExporting = ref(false);
const searchDeepening = ref(false);
let pendingJobRun = 0;
let searchEmitTimer: ReturnType<typeof setTimeout> | undefined;
let searchDeepTimer: ReturnType<typeof setTimeout> | undefined;

const typeOptions = computed(() => [
  { id: 'all' as const, label: m('All', 'Tất cả', 'ทั้งหมด') },
  { id: 'image' as const, label: m('Image', 'Ảnh', 'รูปภาพ') },
  { id: 'video' as const, label: 'Video' },
  { id: 'audio' as const, label: 'Audio' },
  { id: 'music' as const, label: m('Music', 'Nhạc', 'เพลง') },
]);

const rangeOptions = computed(() => {
  const opts = [
    { id: '7d' as const, label: m('7 days', '7 ngày', '7 วัน') },
    { id: '30d' as const, label: m('30 days', '30 ngày', '30 วัน') },
    { id: '90d' as const, label: m('90 days', '90 ngày', '90 วัน') },
    { id: 'all' as const, label: m('All time', 'Tất cả', 'ตลอดเวลา') },
  ];
  if (trendsOnly.value || logsOnly.value) return opts.filter((o) => o.id !== 'all');
  return opts;
});

const periodLabel = computed(() => {
  const opt = rangeOptions.value.find((o) => o.id === range.value);
  return opt?.label ?? range.value;
});

const sparklineDays = computed(() => chartDaysForPeriod(periodFromRange(range.value)));

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

const summary = computed(() => statsData.value?.summary);

const successRate = computed(() => {
  const s = summary.value;
  if (!s || s.total <= 0) return 0;
  return Math.round((s.success / s.total) * 100);
});

const typeBreakdown = computed(() => {
  const byType = statsData.value?.summary?.by_type;
  if (!byType) return [];
  return typeBreakdownFromSummary(byType);
});

const chartSeries = computed(() =>
  chartSeriesFromStats(statsData.value?.chart, chartDays.value),
);

const chartMax = computed(() =>
  Math.max(1, ...chartSeries.value.map((p) => p.total)),
);

const tableRows = computed(() =>
  filterStatsTable(statsData.value?.table || [], {
    type: typeFilter.value,
    query: '',
  }),
);

const filteredListItems = computed(() => {
  let items = listItems.value;
  const model = modelFilter.value.trim();
  if (model) {
    items = items.filter((item) => (item.model || '').trim() === model);
  }
  return filterListItems(items, {
    type: typeFilter.value,
    query: searchQuery.value,
  });
});

const hasActiveModelFilter = computed(() => modelFilter.value.trim().length > 0);
const hasActiveTypeFilter = computed(() => typeFilter.value !== 'all');
const hasActiveSearchFilter = computed(() => searchQuery.value.trim().length > 0);
const hasActiveExploreFilters = computed(
  () => hasActiveModelFilter.value || hasActiveTypeFilter.value || hasActiveSearchFilter.value,
);

const exploreFilterSummary = computed(() => {
  if (!logsOnly.value || !hasActiveExploreFilters.value) return '';
  const parts: string[] = [];
  if (hasActiveTypeFilter.value) parts.push(jobTypeLabel(typeFilter.value, props.locale));
  if (hasActiveModelFilter.value) parts.push(modelFilter.value.trim());
  if (hasActiveSearchFilter.value) parts.push(`"${searchQuery.value.trim()}"`);
  return parts.join(' · ');
});

const exploreEmptyMessage = computed(() => {
  if (!hasActiveExploreFilters.value) {
    return m(
      'No records in the selected range.',
      'Chưa có bản ghi trong khoảng đã chọn.',
      'ไม่มีบันทึกในช่วงที่เลือก',
    );
  }
  const summary = exploreFilterSummary.value;
  if (summary) {
    return m(
      `No jobs match filters: ${summary}.`,
      `Không có job khớp bộ lọc: ${summary}.`,
      `ไม่มีงานที่ตรงกับตัวกรอง: ${summary}`,
    );
  }
  return m(
    'No jobs match the current filters.',
    'Không có job khớp bộ lọc.',
    'ไม่มีงานที่ตรงกับตัวกรอง',
  );
});

const exploreLogCount = computed(() => filteredListItems.value.length);

const exploreLogSummary = computed(() => {
  if (!logsOnly.value) return '';
  const filtered = exploreLogCount.value;
  const loaded = listItems.value.length;
  if (hasActiveExploreFilters.value && filtered !== loaded) {
    if (listHasMore.value) {
      return m(
        `${filtered} shown · ${loaded}+ loaded`,
        `${filtered} khớp · ${loaded}+ đã tải`,
        `${filtered} ตรง · โหลดแล้ว ${loaded}+`,
      );
    }
    return m(
      `${filtered} shown · ${loaded} loaded`,
      `${filtered} khớp · ${loaded} đã tải`,
      `${filtered} ตรง · โหลดแล้ว ${loaded}`,
    );
  }
  if (listHasMore.value) {
    return m(`${filtered}+ jobs`, `${filtered}+ job`, `${filtered}+ งาน`);
  }
  return m(`${filtered} jobs`, `${filtered} job`, `${filtered} งาน`);
});

const showTypeCols = computed(() => typeFilter.value === 'all');

const showZeroHint = computed(
  () =>
    !loading.value &&
    !statsError.value &&
    statsData.value != null &&
    (summary.value?.total ?? 0) === 0 &&
    props.credits === 0,
);

const period = computed(() => periodFromRange(range.value));

async function loadList(reset = true) {
  if (reset) {
    listPage.value = 1;
    listItems.value = [];
    listError.value = '';
  }
  listLoading.value = true;
  try {
    const data = await fetchUsageLogs({
      period: period.value,
      type: typeFilter.value,
      language: usageLogsLanguage.value,
      page: listPage.value,
      limit: 30,
    });
    const items = data.items.map(normalizeUsageListItem);
    listItems.value = reset ? items : [...listItems.value, ...items];
    listHasMore.value = Boolean(data.has_more) || data.items.length >= (data.limit ?? 30);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (reset) {
      listItems.value = [];
      listError.value = msg;
    }
    listHasMore.value = false;
  }
  listLoading.value = false;
}

async function reloadRecords() {
  loading.value = true;
  statsError.value = '';
  if (showStatsBlocks.value) {
    try {
      statsData.value = await fetchUsageStats({
        period: period.value,
        type: typeFilter.value,
        language: usageStatsLanguage.value,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/failed to fetch|network|load/i.test(msg)) {
        statsError.value = m(
          'Cannot reach gateway :3001 — run npm run dev, then Refresh.',
          'Không kết nối được gateway :3001 — chạy npm run dev rồi Refresh.',
          'เชื่อมต่อ gateway :3001 ไม่ได้ — รัน npm run dev แล้วกดรีเฟรช',
        );
      } else {
        statsError.value = msg;
      }
      statsData.value = null;
    }
  }
  if (!trendsOnly.value) {
    await loadList(true);
    await deepenExploreListForFilters();
    await tryOpenPendingJob();
  }
  loading.value = false;
}

async function loadMoreList() {
  if (listLoading.value || !listHasMore.value) return;
  listPage.value += 1;
  await loadList(false);
}

async function deepenExploreListForFilters() {
  const model = modelFilter.value.trim();
  const q = searchQuery.value.trim();
  if (!logsOnly.value || (!model && !q)) return;
  if (!listHasMore.value) return;

  searchDeepening.value = true;
  try {
    let guard = 0;
    while (listHasMore.value && guard < 30) {
      await loadMoreList();
      guard += 1;
    }
  } finally {
    searchDeepening.value = false;
  }
}

defineExpose({ reloadRecords });

function applyClientExploreFilters(items: UsageListItem[]): UsageListItem[] {
  let filtered = items;
  const model = modelFilter.value.trim();
  if (model) {
    filtered = filtered.filter((item) => (item.model || '').trim() === model);
  }
  return filterListItems(filtered, {
    type: typeFilter.value,
    query: searchQuery.value,
  });
}

async function exportExploreCsv() {
  if (exploreExporting.value) return;
  exploreExporting.value = true;
  try {
    const items: UsageListItem[] = [];
    for (let page = 1; page <= 10; page++) {
      const data = await fetchUsageLogs({
        period: period.value,
        type: typeFilter.value,
        language: usageLogsLanguage.value,
        page,
        limit: 100,
      });
      items.push(...data.items.map(normalizeUsageListItem));
      const pageFull = data.items.length >= (data.limit ?? 100);
      if (!data.has_more || data.items.length === 0 || !pageFull) break;
    }
    const filtered = applyClientExploreFilters(items);
    if (filtered.length === 0) return;
    const suffix = modelFilter.value.trim() ? `-${modelFilter.value.trim()}` : '';
    downloadTextFile(
      exportListCsv(filtered),
      `activity-explore-${period.value}${suffix}.csv`,
    );
  } finally {
    exploreExporting.value = false;
  }
}

function exportCsv() {
  if (logsOnly.value) {
    void exportExploreCsv();
    return;
  }
  const csv =
    filteredListItems.value.length > 0
      ? exportListCsv(filteredListItems.value)
      : exportStatsTableCsv(tableRows.value);
  downloadTextFile(csv, `usage-${statsData.value?.period || 'export'}.csv`);
}

function colHeight(total: number): number {
  return Math.round((total / chartMax.value) * 100);
}

function segFlex(value: number): number {
  return value > 0 ? value : 0;
}

function statusLabel(status: ReturnType<typeof listItemStatus>): string {
  if (status === 'success') return m('Success', 'Thành công', 'สำเร็จ');
  if (status === 'failed') return m('Failed', 'Thất bại', 'ล้มเหลว');
  return m('Pending', 'Đang xử lý', 'รอดำเนินการ');
}

function promptPreview(prompt?: string): string {
  const text = (prompt || '').trim();
  if (!text) return '—';
  return text.length > 72 ? `${text.slice(0, 72).trim()}…` : text;
}

function applyInitialPeriod(period?: UsageStatsPeriod) {
  if (!period) return;
  if (period === '7d' || period === '30d' || period === '90d') {
    range.value = period;
    chartDays.value = chartDaysForPeriod(period);
  }
}

function applyInitialModelFilter(model?: string) {
  modelFilter.value = (model || '').trim();
}

function applyInitialTypeFilter(type?: UsageStatsType | 'all') {
  if (!type || type === 'all') {
    typeFilter.value = 'all';
    return;
  }
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'music') {
    typeFilter.value = type;
  }
}

function setTypeFilter(next: UsageStatsType | 'all') {
  if (typeFilter.value === next) return;
  typeFilter.value = next;
  if (logsOnly.value) emit('typeFilterChange', next);
}

function clearModelFilter() {
  if (!modelFilter.value) return;
  modelFilter.value = '';
  emit('modelFilterChange', '');
}

function clearTypeFilter() {
  if (typeFilter.value === 'all') return;
  setTypeFilter('all');
}

function clearSearchFilter() {
  if (!searchQuery.value.trim()) return;
  searchQuery.value = '';
  emit('searchQueryChange', '');
}

function clearAllExploreFilters() {
  if (hasActiveModelFilter.value) clearModelFilter();
  if (hasActiveTypeFilter.value) clearTypeFilter();
  if (hasActiveSearchFilter.value) clearSearchFilter();
}

function applyInitialSearchQuery(query?: string) {
  searchQuery.value = (query || '').trim();
}

function scheduleSearchEmit() {
  if (!logsOnly.value) return;
  if (searchEmitTimer) clearTimeout(searchEmitTimer);
  searchEmitTimer = setTimeout(() => {
    emit('searchQueryChange', searchQuery.value.trim());
  }, 400);
}

function scheduleSearchDeepen() {
  if (!logsOnly.value) return;
  if (searchDeepTimer) clearTimeout(searchDeepTimer);
  searchDeepTimer = setTimeout(() => {
    void deepenExploreListForFilters();
  }, 500);
}

function openJobDetail(row: UsageListItem) {
  pendingJobRun += 1;
  const normalized = normalizeUsageListItem(row);
  selectedJob.value = normalized;
  jobDetailOpen.value = true;
  if (!logsOnly.value) return;
  emit('jobIdChange', usageJobId(normalized));
}

function closeJobDetail() {
  jobDetailOpen.value = false;
  selectedJob.value = null;
  if (logsOnly.value) {
    emit('jobIdChange', '');
  }
}

function applyInitialJobId(jobId?: string) {
  pendingJobId.value = (jobId || '').trim();
}

async function tryOpenPendingJob() {
  const id = pendingJobId.value;
  if (!id || !logsOnly.value) return;
  const runId = ++pendingJobRun;

  let found = listItems.value.find((item) => matchesUsageJobId(item, id));
  let guard = 0;
  while (!found && listHasMore.value && guard < 30) {
    if (runId !== pendingJobRun) return;
    await loadMoreList();
    found = listItems.value.find((item) => matchesUsageJobId(item, id));
    guard += 1;
  }

  if (runId !== pendingJobRun) return;
  if (found) {
    selectedJob.value = normalizeUsageListItem(found);
    jobDetailOpen.value = true;
    pendingJobId.value = '';
  }
}

const exploreTrendsHref = computed(() =>
  activityHubHref(props.prefix, { tab: 'trends', period: period.value }),
);

const exploreJobShareHref = computed(() => {
  const jobId = usageJobId(selectedJob.value);
  if (!logsOnly.value || !jobId) return '';
  return activityHubHref(props.prefix, {
    tab: 'explore',
    period: period.value,
    model: modelFilter.value || undefined,
    job: jobId,
    type: typeFilter.value,
    q: searchQuery.value.trim() || undefined,
  });
});

watch(
  () => props.initialPeriod,
  (period) => {
    applyInitialPeriod(period);
  },
  { immediate: true },
);

watch(
  () => props.initialModelFilter,
  (model) => {
    applyInitialModelFilter(model);
  },
  { immediate: true },
);

watch(
  () => props.initialTypeFilter,
  (type) => {
    applyInitialTypeFilter(type);
  },
  { immediate: true },
);

watch(
  () => props.initialSearchQuery,
  (query) => {
    const next = (query || '').trim();
    if (next !== searchQuery.value.trim()) {
      applyInitialSearchQuery(next);
    }
  },
  { immediate: true },
);

watch(searchQuery, () => {
  scheduleSearchEmit();
  scheduleSearchDeepen();
});

watch(
  () => props.initialJobId,
  (jobId, previousJobId) => {
    const id = (jobId || '').trim();
    applyInitialJobId(id);
    if (!id || !logsOnly.value) return;
    if (jobDetailOpen.value && matchesUsageJobId(selectedJob.value, id)) return;
    // Initial mount: reloadRecords opens modal after list load
    if (previousJobId === undefined) return;
    if (loading.value) return;
    void tryOpenPendingJob();
  },
  { immediate: true },
);

watch(range, (value) => {
  if (trendsOnly.value) {
    chartDays.value = chartDaysForPeriod(periodFromRange(value));
  }
  emit('periodChange', rangeToStatsPeriod(value));
});

watch([range, typeFilter], () => {
  void reloadRecords();
});

onMounted(() => {
  void reloadRecords();
});
</script>

<template>
  <div
    class="or-usage-dashboard"
    :class="{ 'or-usage-dashboard--logs': logsOnly, 'or-usage-dashboard--trends': trendsOnly }"
  >
    <div v-if="showStatsBlocks && !trendsOnly" class="or-usage-banner" role="status">
      {{
        m(
          'Stats from Gommo usage-history (same source as 79ai). Sign in with your Gommo account.',
          'Thống kê từ Gommo usage-history (cùng nguồn 79ai). Cần đăng nhập đúng tài khoản Gommo.',
          'สถิติจาก Gommo usage-history (แหล่งเดียวกับ 79ai) — ต้องลงชื่อเข้าใช้บัญชี Gommo ที่ถูกต้อง',
        )
      }}
    </div>

    <p v-if="showStatsBlocks && !trendsOnly && showZeroHint" class="or-app-muted or-usage-note">
      {{
        m(
          'No usage in the selected range — try All time or run a job in Playground.',
          'Chưa có lượt dùng trong khoảng đã chọn — thử All time hoặc chạy job qua Playground.',
          'ยังไม่มีการใช้งานในช่วงที่เลือก — ลองตลอดเวลาหรือรันงานใน Playground',
        )
      }}
    </p>

    <div v-if="showStatsBlocks && trendsOnly" class="or-activity-overview-kpi-row or-usage-trends-kpi">
      <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
        <div class="or-activity-hub-kpi-main">
          <span class="or-activity-hub-kpi-label">{{ m('Jobs', 'Jobs', 'งาน') }}</span>
          <strong class="or-activity-hub-kpi-value">
            <template v-if="loading"><span class="or-activity-skeleton or-activity-skeleton--text" /></template>
            <template v-else>{{ (summary?.total ?? 0).toLocaleString() }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">{{ periodLabel }}</span>
        </div>
        <svg v-if="jobsSparkline && !loading" class="or-activity-sparkline" viewBox="0 0 72 28" width="72" height="28" aria-hidden="true">
          <path :d="jobsSparkline" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
        </svg>
      </div>
      <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
        <div class="or-activity-hub-kpi-main">
          <span class="or-activity-hub-kpi-label">{{ m('Net credits', 'Credit thực', 'เครดิตสุทธิ') }}</span>
          <strong class="or-activity-hub-kpi-value">
            <template v-if="loading"><span class="or-activity-skeleton or-activity-skeleton--text" /></template>
            <template v-else>{{ formatCredits(summary?.credit_net ?? 0) }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">{{ periodLabel }}</span>
        </div>
        <svg v-if="creditsSparkline && !loading" class="or-activity-sparkline or-activity-sparkline--credits" viewBox="0 0 72 28" width="72" height="28" aria-hidden="true">
          <path :d="creditsSparkline" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
        </svg>
      </div>
      <div class="or-activity-hub-kpi or-activity-hub-kpi--spark">
        <div class="or-activity-hub-kpi-main">
          <span class="or-activity-hub-kpi-label">{{ m('Success rate', 'Thành công', 'อัตราสำเร็จ') }}</span>
          <strong class="or-activity-hub-kpi-value">
            <template v-if="loading"><span class="or-activity-skeleton or-activity-skeleton--text" /></template>
            <template v-else>{{ successRate }}%</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">
            <template v-if="!loading && summary">{{ summary.success }}/{{ summary.total }}</template>
          </span>
        </div>
        <svg v-if="successSparkline && !loading" class="or-activity-sparkline or-activity-sparkline--success" viewBox="0 0 72 28" width="72" height="28" aria-hidden="true">
          <path :d="successSparkline" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
        </svg>
      </div>
      <div class="or-activity-hub-kpi">
        <span class="or-activity-hub-kpi-label">{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</span>
        <strong class="or-activity-hub-kpi-value">{{ formatCredits(credits) }}</strong>
        <span class="or-activity-hub-kpi-sub">{{ m('Current', 'Hiện tại', 'ปัจจุบัน') }}</span>
      </div>
    </div>

    <div v-else-if="showStatsBlocks" class="or-usage-stats or-usage-stats--wide">
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ (summary?.total ?? 0).toLocaleString() }}</p>
        <p class="or-usage-stat-label">{{ m('Total calls', 'Tổng lượt', 'จำนวนครั้งทั้งหมด') }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ (summary?.success ?? 0).toLocaleString() }}</p>
        <p class="or-usage-stat-label">
          {{ m('Success', 'Thành công', 'สำเร็จ') }}
          <span v-if="summary?.credit_success" class="or-usage-stat-sub">
            ({{ formatCredits(summary.credit_success) }})
          </span>
        </p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ (summary?.error ?? 0).toLocaleString() }}</p>
        <p class="or-usage-stat-label">
          {{ m('Failed', 'Thất bại', 'ล้มเหลว') }}
          <span v-if="summary?.credit_error" class="or-usage-stat-sub">
            ({{ formatCredits(summary.credit_error) }})
          </span>
        </p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(summary?.credit ?? 0) }}</p>
        <p class="or-usage-stat-label">{{ m('Credits charged', 'Credit trừ', 'เครดิตที่ใช้') }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(summary?.refund ?? 0) }}</p>
        <p class="or-usage-stat-label">{{ m('Refunded', 'Hoàn', 'คืนเครดิต') }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(summary?.credit_net ?? 0) }}</p>
        <p class="or-usage-stat-label">{{ m('Net credits', 'Credit thực', 'เครดิตสุทธิ') }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(credits) }}</p>
        <p class="or-usage-stat-label">{{ m('Available credits', 'Credits khả dụng', 'เครดิตคงเหลือ') }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ successRate }}%</p>
        <p class="or-usage-stat-label">{{ m('Success rate', 'Tỷ lệ thành công', 'อัตราสำเร็จ') }}</p>
      </div>
    </div>

    <div v-if="showStatsBlocks && !trendsOnly && typeBreakdown.length > 0" class="or-usage-type-breakdown">
      <h3 class="or-app-panel-title">{{ m('Breakdown by type', 'Phân bổ theo loại', 'การใช้งานตามประเภท') }}</h3>
      <div class="or-usage-type-bars">
        <div v-for="row in typeBreakdown" :key="row.jobType" class="or-usage-type-row">
          <span class="or-usage-type-label">{{ jobTypeLabel(row.jobType, locale) }}</span>
          <div class="or-usage-type-track" role="presentation">
            <div class="or-usage-type-fill" :style="{ width: `${row.percent}%` }" />
          </div>
          <span class="or-usage-type-meta">
            {{ row.count }} · {{ row.percent }}%
            <template v-if="row.creditNet > 0"> · {{ formatCredits(row.creditNet) }}</template>
          </span>
        </div>
      </div>
    </div>

    <div v-if="logsOnly && hasActiveExploreFilters" class="or-usage-explore-filter-chips">
      <div v-if="hasActiveModelFilter" class="or-usage-explore-filter-chip">
        <span class="or-usage-explore-filter-label">{{ m('Model', 'Model', 'โมเดล') }}</span>
        <code class="or-usage-model">{{ modelFilter }}</code>
        <button type="button" class="or-usage-explore-filter-clear" @click="clearModelFilter">
          {{ m('Clear filter', 'Xóa lọc', 'ล้างตัวกรอง') }}
        </button>
      </div>
      <div v-if="hasActiveTypeFilter" class="or-usage-explore-filter-chip">
        <span class="or-usage-explore-filter-label">{{ m('Type', 'Loại', 'ประเภท') }}</span>
        <span class="or-usage-type-chip" :class="`or-usage-type-chip--${typeFilter}`">
          {{ jobTypeLabel(typeFilter, locale) }}
        </span>
        <button type="button" class="or-usage-explore-filter-clear" @click="clearTypeFilter">
          {{ m('Clear filter', 'Xóa lọc', 'ล้างตัวกรอง') }}
        </button>
      </div>
      <div v-if="hasActiveSearchFilter" class="or-usage-explore-filter-chip">
        <span class="or-usage-explore-filter-label">{{ m('Search', 'Tìm', 'ค้นหา') }}</span>
        <code class="or-usage-model">{{ searchQuery.trim() }}</code>
        <button type="button" class="or-usage-explore-filter-clear" @click="clearSearchFilter">
          {{ m('Clear filter', 'Xóa lọc', 'ล้างตัวกรอง') }}
        </button>
      </div>
    </div>

    <div class="or-usage-toolbar" :class="{ 'or-usage-toolbar--sticky': logsOnly }">
      <div class="or-usage-filters">
        <div class="or-usage-filter-group" role="group" :aria-label="m('Time range', 'Khoảng thời gian', 'ช่วงเวลา')">
          <button
            v-for="opt in rangeOptions"
            :key="opt.id"
            type="button"
            class="or-usage-pill"
            :class="{ active: range === opt.id }"
            @click="range = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="or-usage-filter-group" role="group" :aria-label="m('Job type', 'Loại job', 'ประเภทงาน')">
          <button
            v-for="opt in typeOptions"
            :key="opt.id"
            type="button"
            class="or-usage-pill"
            :class="{ active: typeFilter === opt.id }"
            @click="setTypeFilter(opt.id)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="or-usage-toolbar-actions">
        <input
          v-if="!trendsOnly"
          v-model="searchQuery"
          type="search"
          class="or-usage-search"
          :placeholder="m('Search model or prompt…', 'Tìm model hoặc prompt…', 'ค้นหา model หรือ prompt…')"
        />
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" :disabled="loading" @click="reloadRecords">
          {{ loading ? m('Loading…', 'Đang tải…', 'กำลังโหลด…') : m('Refresh', 'Làm mới', 'รีเฟรช') }}
        </button>
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="exploreExporting || (filteredListItems.length === 0 && tableRows.length === 0)"
          @click="exportCsv"
        >
          {{
            exploreExporting
              ? m('Exporting…', 'Đang xuất…', 'กำลังส่งออก…')
              : m('Export CSV', 'Xuất CSV', 'ส่งออก CSV')
          }}
        </button>
      </div>
    </div>

    <p v-if="statsError && showStatsBlocks" class="or-app-error or-usage-note">
      {{ m('Stats:', 'Stats:', 'สถิติ:') }} {{ statsError }}
    </p>
    <p v-if="listError" class="or-app-error or-usage-note">
      {{ m('Job logs:', 'Job logs:', 'บันทึกงาน:') }} {{ listError }}
    </p>

    <ActivityUsageCharts
      v-if="showStatsBlocks && trendsOnly"
      :chart="statsData?.chart"
      :chart-days="chartDays"
      :locale="locale"
      :loading="loading"
    />

    <div v-if="showStatsBlocks" class="or-app-panel or-usage-chart-panel">
      <div class="or-usage-chart-head">
        <h3 class="or-app-panel-title">{{ m('Activity over time', 'Biểu đồ theo thời gian', 'กิจกรรมตามเวลา') }}</h3>
        <select
          v-if="!trendsOnly"
          v-model.number="chartDays"
          class="or-usage-chart-select"
          aria-label="Chart range"
        >
          <option :value="7">{{ m('7 days', '7 ngày', '7 วัน') }}</option>
          <option :value="14">{{ m('14 days', '14 ngày', '14 วัน') }}</option>
          <option :value="30">{{ m('30 days', '30 ngày', '30 วัน') }}</option>
        </select>
      </div>
      <div class="or-usage-chart-legend">
        <span class="or-usage-legend-item or-usage-legend-item--image">{{ m('Image', 'Ảnh', 'รูปภาพ') }}</span>
        <span class="or-usage-legend-item or-usage-legend-item--video">Video</span>
        <span class="or-usage-legend-item or-usage-legend-item--audio">Audio</span>
        <span class="or-usage-legend-item or-usage-legend-item--music">{{ m('Music', 'Nhạc', 'เพลง') }}</span>
      </div>
      <div v-if="loading" class="or-activity-skeleton or-activity-skeleton--chart" aria-hidden="true" />
      <div v-else-if="chartSeries.every((p) => p.total === 0)" class="or-usage-chart-empty or-app-muted">
        {{ m('No data in the selected range.', 'Chưa có dữ liệu trong khoảng đã chọn.', 'ไม่มีข้อมูลในช่วงที่เลือก') }}
      </div>
      <div v-else class="or-usage-chart" role="img" :aria-label="m('Generation chart', 'Biểu đồ lượt gen', 'กราฟการสร้าง')">
        <div v-for="(point, idx) in chartSeries" :key="`${point.label}-${idx}`" class="or-usage-chart-col">
          <div class="or-usage-chart-bar-track">
            <div class="or-usage-chart-stack" :style="{ height: `${colHeight(point.total)}%` }" :title="`${point.total} · ${formatCredits(point.credit)}`">
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

    <div v-if="showJobList" class="or-usage-table-wrap" :class="{ 'or-usage-explore-wrap': logsOnly }">
      <div class="or-usage-explore-head">
        <div>
          <h3 class="or-app-panel-title">{{ m('Job logs', 'Job logs', 'บันทึกงาน') }}</h3>
          <p v-if="logsOnly && (exploreLogSummary || searchDeepening)" class="or-usage-explore-meta or-app-muted">
            <template v-if="exploreLogSummary">{{ exploreLogSummary }}</template>
            <span v-if="hasActiveExploreFilters && exploreFilterSummary"> · {{ exploreFilterSummary }}</span>
            <span v-if="searchDeepening"> · {{ m('Scanning more pages…', 'Đang quét thêm trang…', 'กำลังสแกนหน้าถัดไป…') }}</span>
          </p>
        </div>
        <a
          v-if="logsOnly"
          :href="exploreTrendsHref"
          class="or-profile-section-link or-profile-section-link--sm"
        >
          {{ m('Trends', 'Trends', 'แนวโน้ม') }} →
        </a>
      </div>

      <div v-if="listLoading && filteredListItems.length === 0" class="or-activity-skeleton or-activity-skeleton--table" aria-hidden="true" />
      <div v-else-if="!listLoading && filteredListItems.length === 0" class="or-usage-explore-empty">
        <p class="or-app-muted or-usage-empty">{{ exploreEmptyMessage }}</p>
        <button
          v-if="hasActiveExploreFilters"
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          @click="clearAllExploreFilters"
        >
          {{ m('Clear all filters', 'Xóa tất cả bộ lọc', 'ล้างตัวกรองทั้งหมด') }}
        </button>
      </div>
      <div v-else class="or-app-panel or-usage-explore-panel">
        <div class="or-usage-table-scroll">
          <table class="or-usage-table or-usage-table--explore">
            <thead>
              <tr>
                <th>{{ m('Time', 'Thời gian', 'เวลา') }}</th>
                <th>{{ m('Type', 'Loại', 'ประเภท') }}</th>
                <th>Model</th>
                <th>Prompt</th>
                <th>{{ m('Credit', 'Credit', 'เครดิต') }}</th>
                <th>{{ m('Status', 'Trạng thái', 'สถานะ') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filteredListItems"
                :key="row.id_base || `${row.created_at}-${row.model}`"
                class="or-usage-explore-row or-usage-explore-row--clickable"
                tabindex="0"
                role="button"
                @click="openJobDetail(row)"
                @keydown.enter="openJobDetail(row)"
              >
                <td class="or-usage-td-time">
                  {{ formatUsageTime(listItemCreatedAt(row) || '', locale) }}
                </td>
                <td>
                  <span class="or-usage-type-chip" :class="`or-usage-type-chip--${row.type || 'image'}`">
                    {{ jobTypeLabel((row.type as UsageStatsType) || 'image', locale) }}
                  </span>
                </td>
                <td><code class="or-usage-model">{{ row.model || '—' }}</code></td>
                <td class="or-usage-td-prompt">
                  <span :title="row.prompt">{{ promptPreview(row.prompt) }}</span>
                </td>
                <td class="or-usage-td-credit">
                  {{ listItemCredit(row) > 0 ? formatCredits(listItemCredit(row)) : '—' }}
                </td>
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
      <div v-if="logsOnly && listHasMore && filteredListItems.length > 0" class="or-usage-load-more">
        <p class="or-usage-load-more-meta or-app-muted">
          {{
            m(
              `${listItems.length} jobs loaded${listHasMore ? ' — more available' : ''}`,
              `Đã tải ${listItems.length} job${listHasMore ? ' — còn thêm từ Gommo' : ''}`,
              `โหลดแล้ว ${listItems.length} งาน${listHasMore ? ' — ยังมีจาก Gommo' : ''}`,
            )
          }}
        </p>
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="listLoading || searchDeepening"
          @click="loadMoreList"
        >
          {{ listLoading ? m('Loading…', 'Đang tải…', 'กำลังโหลด…') : m('Load more', 'Tải thêm', 'โหลดเพิ่ม') }}
        </button>
      </div>
    </div>

    <div v-if="showStatsBlocks && (tableRows.length > 0 || (trendsOnly && loading))" class="or-usage-table-wrap">
      <h3 class="or-app-panel-title">{{ m('Daily summary', 'Tổng hợp theo ngày', 'สรุปรายวัน') }}</h3>
      <div v-if="loading && tableRows.length === 0" class="or-activity-skeleton or-activity-skeleton--table" aria-hidden="true" />
      <div v-else class="or-usage-table-scroll">
        <table class="or-usage-table or-usage-table--stats">
          <thead>
            <tr>
              <th>{{ m('Date', 'Ngày', 'วันที่') }}</th>
              <th v-if="showTypeCols">{{ m('Image', 'Ảnh', 'รูปภาพ') }}</th>
              <th v-if="showTypeCols">Video</th>
              <th v-if="showTypeCols">Audio</th>
              <th v-if="showTypeCols">{{ m('Music', 'Nhạc', 'เพลง') }}</th>
              <th>{{ m('Total', 'Tổng', 'รวม') }}</th>
              <th>{{ m('OK', 'OK', 'OK') }}</th>
              <th>{{ m('Err', 'Lỗi', 'ผิดพลาด') }}</th>
              <th>{{ m('Credit', 'Credit', 'เครดิต') }}</th>
              <th>{{ m('Refund', 'Hoàn', 'คืนเครดิต') }}</th>
              <th>{{ m('Net', 'Thực', 'สุทธิ') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableRows" :key="row.period">
              <td>{{ row.label }}</td>
              <td v-if="showTypeCols">{{ row.image }}</td>
              <td v-if="showTypeCols">{{ row.video }}</td>
              <td v-if="showTypeCols">{{ row.audio }}</td>
              <td v-if="showTypeCols">{{ row.music }}</td>
              <td>{{ row.total }}</td>
              <td>{{ row.success }}</td>
              <td>{{ row.error }}</td>
              <td>{{ row.credit > 0 ? formatCredits(row.credit) : '—' }}</td>
              <td>{{ row.refund > 0 ? formatCredits(row.refund) : '—' }}</td>
              <td>{{ row.credit_net > 0 ? formatCredits(row.credit_net) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UsageJobDetailModal
      :open="jobDetailOpen"
      :item="selectedJob"
      :locale="locale"
      :share-href="exploreJobShareHref"
      @close="closeJobDetail"
    />
  </div>
</template>
