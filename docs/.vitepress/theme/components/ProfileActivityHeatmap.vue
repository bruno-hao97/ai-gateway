<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchUsageStats } from '../models/user-api';
import { chartSeriesFromStats } from '../models/usage-stats';
import {
  buildHeatmapDays,
  computeHeatmapStreaks,
  type HeatmapDay,
} from '../models/usage-heatmap';

const props = defineProps<{
  isVi: boolean;
}>();

const loading = ref(true);
const error = ref('');
const days = ref<HeatmapDay[]>([]);

const stats = computed(() => computeHeatmapStreaks(days.value));

const hasActivity = computed(() => days.value.some((d) => d.count > 0));

function cellTitle(day: HeatmapDay): string {
  const jobs = props.isVi ? `${day.count} job` : `${day.count} jobs`;
  const label = day.label || (props.isVi ? 'Ngày' : 'Day');
  if (day.credit > 0) return `${label}: ${jobs}, ${day.credit} credits`;
  return `${label}: ${jobs}`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchUsageStats({
      period: '90d',
      type: 'all',
      language: props.isVi ? 'vi' : 'en',
    });
    const series = chartSeriesFromStats(data.chart, 90);
    days.value = buildHeatmapDays(series);
  } catch (e) {
    days.value = [];
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

defineExpose({ reload: load });
</script>

<template>
  <div class="or-profile-heatmap" aria-labelledby="profile-heatmap-title">
    <div class="or-profile-heatmap-head">
      <div>
        <h3 id="profile-heatmap-title" class="or-app-panel-title">
          {{ isVi ? 'Hoạt động job (90 ngày)' : 'Job activity (90 days)' }}
        </h3>
        <p class="or-profile-section-sub">
          {{
            isVi
              ? 'Lưới theo ngày từ Gommo usage-history — đậm hơn = nhiều job.'
              : 'Daily grid from Gommo usage-history — darker cells mean more jobs.'
          }}
        </p>
      </div>
    </div>

    <p v-if="loading" class="or-app-muted">{{ isVi ? 'Đang tải…' : 'Loading…' }}</p>
    <p v-else-if="error" class="or-app-error">{{ error }}</p>

    <template v-else>
      <div class="or-profile-heatmap-stats">
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ isVi ? 'Ngày có job' : 'Active days' }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.activeDays }}</strong>
        </div>
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ isVi ? 'Streak hiện tại' : 'Current streak' }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.currentStreak }}</strong>
        </div>
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ isVi ? 'Streak dài nhất' : 'Longest streak' }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.longestStreak }}</strong>
        </div>
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ isVi ? 'Tổng job' : 'Total jobs' }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.totalJobs.toLocaleString() }}</strong>
        </div>
      </div>

      <p v-if="!hasActivity" class="or-app-muted or-profile-heatmap-empty">
        {{ isVi ? 'Chưa có job trong 90 ngày — thử Playground.' : 'No jobs in the last 90 days — try Playground.' }}
      </p>

      <div
        v-else
        class="or-profile-heatmap-grid"
        role="img"
        :aria-label="isVi ? 'Biểu đồ hoạt động 90 ngày' : '90-day activity chart'"
      >
        <span
          v-for="day in days"
          :key="`${day.index}-${day.label}`"
          class="or-profile-heatmap-cell"
          :class="`or-profile-heatmap-cell--${day.level}`"
          :title="cellTitle(day)"
        />
      </div>

      <div class="or-profile-heatmap-legend" aria-hidden="true">
        <span>{{ isVi ? 'Ít' : 'Less' }}</span>
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--0" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--1" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--2" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--3" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--4" />
        <span>{{ isVi ? 'Nhiều' : 'More' }}</span>
      </div>
    </template>
  </div>
</template>
