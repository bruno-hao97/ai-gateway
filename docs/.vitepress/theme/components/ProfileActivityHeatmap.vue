<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import type { PortalLocale } from '../models/portal-locale';
import { portalUsageStatsLanguage } from '../models/portal-gommo-lang';
import { fetchUsageStats } from '../models/user-api';
import { chartSeriesFromStats } from '../models/usage-stats';
import {
  buildHeatmapDays,
  computeHeatmapStreaks,
  type HeatmapDay,
} from '../models/usage-heatmap';

const props = defineProps<{
  locale: PortalLocale;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const loading = ref(true);
const error = ref('');
const days = ref<HeatmapDay[]>([]);

const stats = computed(() => computeHeatmapStreaks(days.value));

const hasActivity = computed(() => days.value.some((d) => d.count > 0));

function usageLanguage(): 'vi' | 'en' {
  return portalUsageStatsLanguage(props.locale);
}

function cellTitle(day: HeatmapDay): string {
  const jobs =
    props.locale === 'vi'
      ? `${day.count} job`
      : props.locale === 'th'
        ? `${day.count} งาน`
        : `${day.count} job${day.count === 1 ? '' : 's'}`;
  const label = day.label || m('Day', 'Ngày', 'วัน');
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
      language: usageLanguage(),
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
          {{ m('Job activity (90 days)', 'Hoạt động job (90 ngày)', 'กิจกรรมงาน (90 วัน)') }}
        </h3>
        <p class="or-profile-section-sub">
          {{
            m(
              'Daily grid from Gommo usage-history — darker cells mean more jobs.',
              'Lưới theo ngày từ Gommo usage-history — đậm hơn = nhiều job.',
              'ตารางรายวันจาก Gommo usage-history — เซลล์เข้มขึ้น = งานมากขึ้น',
            )
          }}
        </p>
      </div>
    </div>

    <p v-if="loading" class="or-app-muted">{{ m('Loading…', 'Đang tải…', 'กำลังโหลด…') }}</p>
    <p v-else-if="error" class="or-app-error">{{ error }}</p>

    <template v-else>
      <div class="or-profile-heatmap-stats">
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ m('Active days', 'Ngày có job', 'วันที่มีงาน') }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.activeDays }}</strong>
        </div>
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ m('Current streak', 'Streak hiện tại', 'สตรีคปัจจุบัน') }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.currentStreak }}</strong>
        </div>
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ m('Longest streak', 'Streak dài nhất', 'สตรีคยาวสุด') }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.longestStreak }}</strong>
        </div>
        <div class="or-profile-heatmap-stat">
          <span class="or-profile-heatmap-stat-label">{{ m('Total jobs', 'Tổng job', 'งานทั้งหมด') }}</span>
          <strong class="or-profile-heatmap-stat-value">{{ stats.totalJobs.toLocaleString() }}</strong>
        </div>
      </div>

      <p v-if="!hasActivity" class="or-app-muted or-profile-heatmap-empty">
        {{ m('No jobs in the last 90 days — try Playground.', 'Chưa có job trong 90 ngày — thử Playground.', 'ไม่มีงานใน 90 วันที่ผ่านมา — ลองสนามทดลอง') }}
      </p>

      <div
        v-else
        class="or-profile-heatmap-grid"
        role="img"
        :aria-label="m('90-day activity chart', 'Biểu đồ hoạt động 90 ngày', 'กราฟกิจกรรม 90 วัน')"
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
        <span>{{ m('Less', 'Ít', 'น้อย') }}</span>
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--0" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--1" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--2" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--3" />
        <span class="or-profile-heatmap-cell or-profile-heatmap-cell--4" />
        <span>{{ m('More', 'Nhiều', 'มาก') }}</span>
      </div>
    </template>
  </div>
</template>
