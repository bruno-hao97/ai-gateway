<script setup lang="ts">
import { computed, ref } from 'vue';
import OverviewUsageSection from './OverviewUsageSection.vue';
import OverviewRecentTopups from './OverviewRecentTopups.vue';
import ProfileActivityHeatmap from './ProfileActivityHeatmap.vue';
import { formatCredits } from '../models/user-api';
import type { TopupOrder } from '../models/user-api';

const props = defineProps<{
  isVi: boolean;
  prefix: string;
  credits: number;
  email: string;
  username: string;
  displayName: string;
  loginDomain: string;
  maskedToken: string;
  copied: boolean;
  topupOrders: TopupOrder[];
  ordersLoading: boolean;
}>();

const emit = defineEmits<{
  copyToken: [];
}>();

const usageRef = ref<InstanceType<typeof OverviewUsageSection> | null>(null);
const heatmapRef = ref<InstanceType<typeof ProfileActivityHeatmap> | null>(null);

const usageDetailHref = computed(() => `${props.prefix}/app/activity/?tab=trends`);
const logsDetailHref = computed(() => `${props.prefix}/app/activity/?tab=explore`);
const activityDetailHref = computed(() => `${props.prefix}/app/activity/`);
const tokenHref = computed(() => `${props.prefix}/app/token/`);
const authDocsHref = computed(() => `${props.prefix}/authentication`);
const creditsHref = computed(() => `${props.prefix}/app/credits/`);

const anchorNav = computed(() => [
  { id: 'profile-usage', label: 'Usage' },
  { id: 'profile-activity', label: 'Activity' },
  { id: 'profile-api', label: props.isVi ? 'API access' : 'API access' },
  { id: 'profile-account', label: props.isVi ? 'Tài khoản' : 'Account' },
]);

async function reload() {
  await Promise.all([usageRef.value?.reload(), heatmapRef.value?.reload()]);
}

defineExpose({ reload });
</script>

<template>
  <div class="or-profile-landing">
    <nav class="or-profile-anchor-nav" :aria-label="isVi ? 'Mục hồ sơ' : 'Profile sections'">
      <a
        v-for="item in anchorNav"
        :key="item.id"
        :href="`#${item.id}`"
        class="or-profile-anchor-link"
      >
        {{ item.label }}
      </a>
    </nav>

    <section id="profile-usage" class="or-profile-section or-profile-section-card">
      <div class="or-profile-section-head">
        <div>
          <h2 class="or-profile-section-title or-profile-section-title--lg">Usage</h2>
          <p class="or-profile-section-sub">
            {{
              isVi
                ? 'Jobs và credit từ Gommo usage-history (7 ngày).'
                : 'Jobs and credits from Gommo usage-history (last 7 days).'
            }}
          </p>
        </div>
        <a :href="usageDetailHref" class="or-profile-section-link">
          {{ isVi ? 'Mở Trends' : 'Open Trends' }} →
        </a>
      </div>
      <OverviewUsageSection
        ref="usageRef"
        :credits="credits"
        :is-vi="isVi"
        :prefix="prefix"
        show-metric-toggle
      />
      <p class="or-profile-section-foot">
        <a :href="logsDetailHref" class="or-profile-section-link or-profile-section-link--sm">
          {{ isVi ? 'Xem toàn bộ job logs' : 'View all job logs' }} →
        </a>
      </p>
    </section>

    <section id="profile-activity" class="or-profile-section or-profile-section-card">
      <div class="or-profile-section-head">
        <div>
          <h2 class="or-profile-section-title or-profile-section-title--lg">Activity</h2>
          <p class="or-profile-section-sub">
            {{
              isVi
                ? 'Nạp credit và hoạt động billing trên gateway này.'
                : 'Top-ups and billing activity on this gateway.'
            }}
          </p>
        </div>
        <a :href="activityDetailHref" class="or-profile-section-link">
          {{ isVi ? 'Full activity' : 'Full activity' }} →
        </a>
      </div>
      <ProfileActivityHeatmap ref="heatmapRef" :is-vi="isVi" />

      <div class="or-profile-activity-kpi">
        <div class="or-profile-activity-kpi-item">
          <span class="or-profile-activity-kpi-label">{{ isVi ? 'Số dư' : 'Balance' }}</span>
          <strong class="or-profile-activity-kpi-value">{{ formatCredits(credits) }}</strong>
        </div>
        <div class="or-profile-activity-kpi-item">
          <span class="or-profile-activity-kpi-label">{{ isVi ? 'Đơn nạp' : 'Top-ups' }}</span>
          <strong class="or-profile-activity-kpi-value">{{ topupOrders.length }}</strong>
        </div>
      </div>
      <OverviewRecentTopups
        :orders="topupOrders"
        :loading="ordersLoading"
        :is-vi="isVi"
        :prefix="prefix"
      />
    </section>

    <section id="profile-api" class="or-profile-section or-profile-section-card">
      <div class="or-profile-section-head or-profile-section-head--panel">
        <div>
          <h2 class="or-profile-section-title or-profile-section-title--lg">
            {{ isVi ? 'API access' : 'API access' }}
          </h2>
          <p class="or-profile-section-sub">
            {{
              isVi
                ? 'Bearer token cho /gateway/* — snippet, health check và MCP trên trang Access token.'
                : 'Bearer token for /gateway/* — snippets, health checks, and MCP on the Access token page.'
            }}
          </p>
        </div>
        <a :href="tokenHref" class="or-app-btn or-app-btn-primary or-app-btn-sm">
          {{ isVi ? 'Access token' : 'Access token' }} →
        </a>
      </div>
      <div class="or-app-token-row">
        <code class="or-app-token-value">{{ maskedToken }}</code>
        <button type="button" class="or-app-btn or-app-btn-ghost" @click="emit('copyToken')">
          {{ copied ? (isVi ? 'Đã copy' : 'Copied') : isVi ? 'Copy' : 'Copy' }}
        </button>
      </div>
      <div class="or-profile-api-actions">
        <a :href="authDocsHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ isVi ? 'Tài liệu auth' : 'Auth docs' }}
        </a>
      </div>
    </section>

    <section id="profile-account" class="or-profile-section or-profile-section-card">
      <h2 class="or-profile-section-title or-profile-section-title--lg">
        {{ isVi ? 'Chi tiết tài khoản' : 'Account details' }}
      </h2>
      <p class="or-profile-section-sub">
        {{ isVi ? 'Thông tin Gommo từ /ai/me (read-only).' : 'Gommo account info from /ai/me (read-only).' }}
      </p>
      <dl class="or-app-profile-dl or-profile-account-dl">
        <div class="or-app-profile-row">
          <dt>{{ isVi ? 'Email' : 'Email' }}</dt>
          <dd>{{ email || '—' }}</dd>
        </div>
        <div class="or-app-profile-row">
          <dt>{{ isVi ? 'Username' : 'Username' }}</dt>
          <dd>{{ username || '—' }}</dd>
        </div>
        <div class="or-app-profile-row">
          <dt>{{ isVi ? 'Tên hiển thị' : 'Display name' }}</dt>
          <dd>{{ displayName }}</dd>
        </div>
        <div class="or-app-profile-row">
          <dt>{{ isVi ? 'Domain Gommo' : 'Gommo domain' }}</dt>
          <dd><code>{{ loginDomain }}</code></dd>
        </div>
      </dl>
      <div class="or-profile-account-actions">
        <a :href="creditsHref" class="or-app-btn or-app-btn-primary or-app-btn-sm">
          {{ isVi ? 'Nạp credits' : 'Top up credits' }}
        </a>
      </div>
    </section>
  </div>
</template>
