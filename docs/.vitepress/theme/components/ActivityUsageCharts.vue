<script setup lang="ts">
import { computed } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { PortalLocale } from '../models/portal-locale';
import { formatCredits } from '../models/user-api';
import {
  areaSvgPaths,
  outcomeSeriesFromChart,
  sparklineValuesFromChart,
  type UsageStatsChart,
} from '../models/usage-stats';

const props = defineProps<{
  chart: UsageStatsChart | undefined;
  chartDays: number;
  locale: PortalLocale;
  loading?: boolean;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const creditValues = computed(() =>
  sparklineValuesFromChart(props.chart, props.chartDays, 'credits'),
);

const creditArea = computed(() => areaSvgPaths(creditValues.value, 280, 72));

const outcomeSeries = computed(() => outcomeSeriesFromChart(props.chart, props.chartDays));

const outcomeMax = computed(() => Math.max(1, ...outcomeSeries.value.map((p) => p.total)));

const creditTotal = computed(() => creditValues.value.reduce((sum, v) => sum + v, 0));

const outcomeTotals = computed(() =>
  outcomeSeries.value.reduce(
    (acc, p) => ({ success: acc.success + p.success, error: acc.error + p.error }),
    { success: 0, error: 0 },
  ),
);

function colHeight(total: number, max: number): number {
  return Math.round((total / max) * 100);
}

function segFlex(value: number): number {
  return value > 0 ? value : 0;
}
</script>

<template>
  <div class="or-activity-charts-row">
    <div class="or-app-panel or-activity-overview-widget">
      <div class="or-activity-hub-widget-head">
        <h3 class="or-app-panel-title">{{ m('Credits over time', 'Credit theo thời gian', 'เครดิตตามเวลา') }}</h3>
        <span v-if="!loading && creditTotal > 0" class="or-app-muted or-activity-overview-hint">
          {{ formatCredits(creditTotal) }}
        </span>
      </div>
      <div v-if="loading" class="or-activity-skeleton or-activity-skeleton--area" aria-hidden="true" />
      <p v-else-if="creditValues.every((v) => v === 0)" class="or-app-muted or-usage-chart-empty">
        {{ m('No credits yet.', 'Chưa có credit.', 'ยังไม่มีเครดิต') }}
      </p>
      <svg
        v-else
        class="or-activity-area-chart"
        viewBox="0 0 280 72"
        role="img"
        :aria-label="m('Credits chart', 'Biểu đồ credit', 'กราฟเครดิต')"
      >
        <defs>
          <linearGradient id="or-activity-credit-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.35" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <path
          v-if="creditArea.area"
          :d="creditArea.area"
          fill="url(#or-activity-credit-fill)"
          class="or-activity-area-fill"
        />
        <path
          v-if="creditArea.line"
          :d="creditArea.line"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="or-activity-area-line"
        />
      </svg>
    </div>

    <div class="or-app-panel or-activity-overview-widget">
      <div class="or-activity-hub-widget-head">
        <h3 class="or-app-panel-title">{{ m('Success vs failed', 'Thành công vs lỗi', 'สำเร็จ vs ล้มเหลว') }}</h3>
        <span
          v-if="!loading && outcomeTotals.success + outcomeTotals.error > 0"
          class="or-app-muted or-activity-overview-hint"
        >
          {{ outcomeTotals.success }} / {{ outcomeTotals.error }}
        </span>
      </div>
      <div class="or-usage-chart-legend or-activity-overview-legend">
        <span class="or-usage-legend-item or-activity-legend-item--success">
          {{ m('Success', 'Thành công', 'สำเร็จ') }}
        </span>
        <span class="or-usage-legend-item or-activity-legend-item--error">
          {{ m('Failed', 'Lỗi', 'ล้มเหลว') }}
        </span>
      </div>
      <div v-if="loading" class="or-activity-skeleton or-activity-skeleton--chart" aria-hidden="true" />
      <p v-else-if="outcomeSeries.every((p) => p.total === 0)" class="or-app-muted or-usage-chart-empty">
        {{ m('No data yet.', 'Chưa có dữ liệu.', 'ยังไม่มีข้อมูล') }}
      </p>
      <div
        v-else
        class="or-usage-chart or-activity-overview-chart or-activity-outcome-chart"
        role="img"
        :aria-label="m('Outcome chart', 'Biểu đồ kết quả', 'กราฟผลลัพธ์')"
      >
        <div v-for="(point, idx) in outcomeSeries" :key="`${point.label}-${idx}`" class="or-usage-chart-col">
          <div class="or-usage-chart-bar-track">
            <div
              class="or-usage-chart-stack"
              :style="{ height: `${colHeight(point.total, outcomeMax)}%` }"
              :title="`${point.success} ok · ${point.error} err`"
            >
              <div
                v-if="point.success > 0"
                class="or-usage-chart-seg or-activity-outcome-seg--success"
                :style="{ flexGrow: segFlex(point.success) }"
              />
              <div
                v-if="point.error > 0"
                class="or-usage-chart-seg or-activity-outcome-seg--error"
                :style="{ flexGrow: segFlex(point.error) }"
              />
            </div>
          </div>
          <span class="or-usage-chart-label">{{ point.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
