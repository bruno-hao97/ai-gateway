<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchUsageLogs, fetchUsageStats, formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import {
  chartSeriesFromStats,
  exportListCsv,
  exportStatsTableCsv,
  filterListItems,
  filterStatsTable,
  jobTypeLabel,
  listItemCredit,
  listItemCreatedAt,
  listItemStatus,
  periodFromRange,
  typeBreakdownFromSummary,
  type UsageListItem,
  type UsageStatsData,
  type UsageStatsType,
} from '../models/usage-stats';
import type { UsageRange } from '../models/usage-history';

const props = defineProps<{
  credits: number;
  isVi: boolean;
  prefix: string;
}>();

const loading = ref(false);
const listLoading = ref(false);
const loadError = ref('');
const statsData = ref<UsageStatsData | null>(null);
const listItems = ref<UsageListItem[]>([]);
const listPage = ref(1);
const listHasMore = ref(false);
const range = ref<UsageRange>('30d');
const typeFilter = ref<UsageStatsType | 'all'>('all');
const searchQuery = ref('');
const chartDays = ref(14);

const typeOptions = computed(() => [
  { id: 'all' as const, label: props.isVi ? 'Tất cả' : 'All' },
  { id: 'image' as const, label: props.isVi ? 'Ảnh' : 'Image' },
  { id: 'video' as const, label: 'Video' },
  { id: 'audio' as const, label: 'Audio' },
  { id: 'music' as const, label: props.isVi ? 'Nhạc' : 'Music' },
]);

const rangeOptions = computed(() => [
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

const filteredListItems = computed(() =>
  filterListItems(listItems.value, {
    type: typeFilter.value,
    query: searchQuery.value,
  }),
);

const showZeroHint = computed(
  () => !loading.value && !loadError.value && statsData.value != null && (summary.value?.total ?? 0) === 0,
);

const period = computed(() => periodFromRange(range.value));

async function loadList(reset = true) {
  if (reset) {
    listPage.value = 1;
    listItems.value = [];
  }
  listLoading.value = true;
  try {
    const data = await fetchUsageLogs({
      period: period.value,
      type: typeFilter.value,
      language: 'VI',
      page: listPage.value,
      limit: 30,
    });
    listItems.value = reset ? data.items : [...listItems.value, ...data.items];
    listHasMore.value = Boolean(data.has_more) || data.items.length >= (data.limit ?? 30);
  } catch {
    if (reset) listItems.value = [];
    listHasMore.value = false;
  }
  listLoading.value = false;
}

async function reloadRecords() {
  loading.value = true;
  loadError.value = '';
  try {
    statsData.value = await fetchUsageStats({
      period: period.value,
      type: typeFilter.value,
      language: 'vi',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|network|load/i.test(msg)) {
      loadError.value = props.isVi
        ? 'Không kết nối được gateway :3001 — chạy npm run dev rồi Refresh.'
        : 'Cannot reach gateway :3001 — run npm run dev, then Refresh.';
    } else {
      loadError.value = msg;
    }
    statsData.value = null;
  }
  await loadList(true);
  loading.value = false;
}

async function loadMoreList() {
  if (listLoading.value || !listHasMore.value) return;
  listPage.value += 1;
  await loadList(false);
}

defineExpose({ reloadRecords });

function exportCsv() {
  const csv =
    filteredListItems.value.length > 0
      ? exportListCsv(filteredListItems.value)
      : exportStatsTableCsv(tableRows.value);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usage-${statsData.value?.period || 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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

watch([range, typeFilter], () => {
  void reloadRecords();
});

onMounted(() => {
  void reloadRecords();
});
</script>

<template>
  <div class="or-usage-dashboard">
    <div class="or-usage-banner" role="status">
      {{
        isVi
          ? 'Thống kê từ Gommo usage-history. Đăng nhập cùng tài khoản 79ai; hoặc ?access_token=...&device_id=... trên URL (một lần).'
          : 'Stats from Gommo usage-history. Sign in with the same 79ai account, or use ?access_token=...&device_id=... once in the URL.'
      }}
    </div>

    <p v-if="showZeroHint" class="or-app-error or-usage-note">
      {{
        isVi
          ? 'Stats = 0: token docs có thể khác session 79ai. Đăng xuất → đăng nhập lại, hoặc mở Usage với access_token từ Network 79ai.'
          : 'Stats = 0: docs token may differ from your 79ai session. Sign out and sign in again, or open Usage with access_token from 79ai Network tab.'
      }}
    </p>

    <div class="or-usage-stats or-usage-stats--wide">
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ (summary?.total ?? 0).toLocaleString() }}</p>
        <p class="or-usage-stat-label">{{ isVi ? 'Tổng lượt' : 'Total calls' }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ (summary?.success ?? 0).toLocaleString() }}</p>
        <p class="or-usage-stat-label">
          {{ isVi ? 'Thành công' : 'Success' }}
          <span v-if="summary?.credit_success" class="or-usage-stat-sub">
            ({{ formatCredits(summary.credit_success) }})
          </span>
        </p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ (summary?.error ?? 0).toLocaleString() }}</p>
        <p class="or-usage-stat-label">
          {{ isVi ? 'Thất bại' : 'Failed' }}
          <span v-if="summary?.credit_error" class="or-usage-stat-sub">
            ({{ formatCredits(summary.credit_error) }})
          </span>
        </p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(summary?.credit ?? 0) }}</p>
        <p class="or-usage-stat-label">{{ isVi ? 'Credit trừ' : 'Credits charged' }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(summary?.refund ?? 0) }}</p>
        <p class="or-usage-stat-label">{{ isVi ? 'Hoàn' : 'Refunded' }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(summary?.credit_net ?? 0) }}</p>
        <p class="or-usage-stat-label">{{ isVi ? 'Credit thực' : 'Net credits' }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ formatCredits(credits) }}</p>
        <p class="or-usage-stat-label">{{ isVi ? 'Credits khả dụng' : 'Available credits' }}</p>
      </div>
      <div class="or-usage-stat-card">
        <p class="or-usage-stat-value">{{ successRate }}%</p>
        <p class="or-usage-stat-label">{{ isVi ? 'Tỷ lệ thành công' : 'Success rate' }}</p>
      </div>
    </div>

    <div v-if="typeBreakdown.length > 0" class="or-usage-type-breakdown">
      <h3 class="or-app-panel-title">{{ isVi ? 'Phân bổ theo loại' : 'Breakdown by type' }}</h3>
      <div class="or-usage-type-bars">
        <div v-for="row in typeBreakdown" :key="row.jobType" class="or-usage-type-row">
          <span class="or-usage-type-label">{{ jobTypeLabel(row.jobType, isVi) }}</span>
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

    <div class="or-usage-toolbar">
      <div class="or-usage-filters">
        <div class="or-usage-filter-group" role="group" :aria-label="isVi ? 'Khoảng thời gian' : 'Time range'">
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
        <div class="or-usage-filter-group" role="group" :aria-label="isVi ? 'Loại job' : 'Job type'">
          <button
            v-for="opt in typeOptions"
            :key="opt.id"
            type="button"
            class="or-usage-pill"
            :class="{ active: typeFilter === opt.id }"
            @click="typeFilter = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="or-usage-toolbar-actions">
        <input
          v-model="searchQuery"
          type="search"
          class="or-usage-search"
          :placeholder="isVi ? 'Tìm model hoặc prompt…' : 'Search model or prompt…'"
        />
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" :disabled="loading" @click="reloadRecords">
          {{ loading ? (isVi ? 'Đang tải…' : 'Loading…') : isVi ? 'Làm mới' : 'Refresh' }}
        </button>
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="filteredListItems.length === 0 && tableRows.length === 0"
          @click="exportCsv"
        >
          {{ isVi ? 'Xuất CSV' : 'Export CSV' }}
        </button>
      </div>
    </div>

    <p v-if="loadError" class="or-app-error or-usage-note">{{ loadError }}</p>

    <div class="or-app-panel or-usage-chart-panel">
      <div class="or-usage-chart-head">
        <h3 class="or-app-panel-title">{{ isVi ? 'Biểu đồ theo thời gian' : 'Activity over time' }}</h3>
        <select v-model.number="chartDays" class="or-usage-chart-select" aria-label="Chart range">
          <option :value="7">{{ isVi ? '7 ngày' : '7 days' }}</option>
          <option :value="14">{{ isVi ? '14 ngày' : '14 days' }}</option>
          <option :value="30">{{ isVi ? '30 ngày' : '30 days' }}</option>
        </select>
      </div>
      <div class="or-usage-chart-legend">
        <span class="or-usage-legend-item or-usage-legend-item--image">{{ isVi ? 'Ảnh' : 'Image' }}</span>
        <span class="or-usage-legend-item or-usage-legend-item--video">Video</span>
        <span class="or-usage-legend-item or-usage-legend-item--audio">Audio</span>
        <span class="or-usage-legend-item or-usage-legend-item--music">{{ isVi ? 'Nhạc' : 'Music' }}</span>
      </div>
      <div v-if="chartSeries.every((p) => p.total === 0)" class="or-usage-chart-empty or-app-muted">
        {{ isVi ? 'Chưa có dữ liệu trong khoảng đã chọn.' : 'No data in the selected range.' }}
      </div>
      <div v-else class="or-usage-chart" role="img" :aria-label="isVi ? 'Biểu đồ lượt gen' : 'Generation chart'">
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

    <div class="or-usage-table-wrap">
      <h3 class="or-app-panel-title">{{ isVi ? 'Lịch sử từng job' : 'Job history' }}</h3>
      <p v-if="!loading && !listLoading && filteredListItems.length === 0" class="or-app-muted or-usage-empty">
        {{ isVi ? 'Chưa có bản ghi trong khoảng đã chọn.' : 'No records in the selected range.' }}
      </p>
      <div v-else class="or-usage-table-scroll">
        <table class="or-usage-table">
          <thead>
            <tr>
              <th>{{ isVi ? 'Thời gian' : 'Time' }}</th>
              <th>{{ isVi ? 'Loại' : 'Type' }}</th>
              <th>Model</th>
              <th>Prompt</th>
              <th>{{ isVi ? 'Credit' : 'Credit' }}</th>
              <th>{{ isVi ? 'Trạng thái' : 'Status' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredListItems" :key="row.id_base || `${row.created_at}-${row.model}`">
              <td class="or-usage-td-time">
                {{ formatUsageTime(listItemCreatedAt(row) || '', isVi) }}
              </td>
              <td>{{ jobTypeLabel((row.type as UsageStatsType) || 'image', isVi) }}</td>
              <td><code class="or-usage-model">{{ row.model || '—' }}</code></td>
              <td class="or-usage-td-prompt">
                <span :title="row.prompt">{{ row.prompt || '—' }}</span>
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
      <div v-if="listHasMore" class="or-usage-load-more">
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="listLoading"
          @click="loadMoreList"
        >
          {{ listLoading ? (isVi ? 'Đang tải…' : 'Loading…') : isVi ? 'Xem thêm' : 'Load more' }}
        </button>
      </div>
    </div>

    <div v-if="tableRows.length > 0" class="or-usage-table-wrap">
      <h3 class="or-app-panel-title">{{ isVi ? 'Tổng hợp theo ngày' : 'Daily summary' }}</h3>
      <div class="or-usage-table-scroll">
        <table class="or-usage-table or-usage-table--stats">
          <thead>
            <tr>
              <th>{{ isVi ? 'Ngày' : 'Date' }}</th>
              <th v-if="showTypeCols">{{ isVi ? 'Ảnh' : 'Image' }}</th>
              <th v-if="showTypeCols">Video</th>
              <th v-if="showTypeCols">Audio</th>
              <th v-if="showTypeCols">{{ isVi ? 'Nhạc' : 'Music' }}</th>
              <th>{{ isVi ? 'Tổng' : 'Total' }}</th>
              <th>{{ isVi ? 'OK' : 'OK' }}</th>
              <th>{{ isVi ? 'Lỗi' : 'Err' }}</th>
              <th>{{ isVi ? 'Credit' : 'Credit' }}</th>
              <th>{{ isVi ? 'Hoàn' : 'Refund' }}</th>
              <th>{{ isVi ? 'Thực' : 'Net' }}</th>
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
  </div>
</template>
