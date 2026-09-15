<script setup lang="ts">
import { computed, ref } from 'vue';
import OverviewUsageSection from './OverviewUsageSection.vue';
import OverviewRecentTopups from './OverviewRecentTopups.vue';
import ProfileActivityHeatmap from './ProfileActivityHeatmap.vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { activityHubHref, PROFILE_USAGE_PREVIEW_PERIOD } from '../models/activity-hub-url';
import type { PortalLocale } from '../models/portal-locale';
import { formatCredits } from '../models/user-api';
import type { TopupOrder } from '../models/user-api';

const props = defineProps<{
  locale: PortalLocale;
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

const { m } = usePortalCopy(computed(() => props.locale));

const usageRef = ref<InstanceType<typeof OverviewUsageSection> | null>(null);
const heatmapRef = ref<InstanceType<typeof ProfileActivityHeatmap> | null>(null);

const usageDetailHref = computed(() =>
  activityHubHref(props.prefix, { tab: 'trends', period: PROFILE_USAGE_PREVIEW_PERIOD }),
);
const logsDetailHref = computed(() =>
  activityHubHref(props.prefix, { tab: 'explore', period: PROFILE_USAGE_PREVIEW_PERIOD }),
);
const activityDetailHref = computed(() =>
  activityHubHref(props.prefix, { period: PROFILE_USAGE_PREVIEW_PERIOD }),
);
const tokenHref = computed(() => `${props.prefix}/app/token/`);
const authDocsHref = computed(() => `${props.prefix}/authentication`);
const creditsHref = computed(() => `${props.prefix}/app/credits/`);

const anchorNav = computed(() => [
  { id: 'profile-usage', label: m('Usage', 'Usage', 'การใช้งาน') },
  { id: 'profile-activity', label: m('Activity', 'Activity', 'กิจกรรม') },
  { id: 'profile-api', label: m('API access', 'API access', 'การเข้าถึง API') },
  { id: 'profile-account', label: m('Account', 'Tài khoản', 'บัญชี') },
]);

async function reload() {
  await Promise.all([usageRef.value?.reload(), heatmapRef.value?.reload()]);
}

defineExpose({ reload });
</script>

<template>
  <div class="or-profile-landing">
    <nav class="or-profile-anchor-nav" :aria-label="m('Profile sections', 'Mục hồ sơ', 'ส่วนโปรไฟล์')">
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
          <h2 class="or-profile-section-title or-profile-section-title--lg">
            {{ m('Usage', 'Usage', 'การใช้งาน') }}
            <span class="or-profile-period-pill">7d</span>
          </h2>
          <p class="or-profile-section-sub">
            {{
              m(
                'Jobs and credits from Gommo usage-history — same period as Activity links from here.',
                'Jobs và credit từ Gommo usage-history — cùng period với Activity khi mở từ đây.',
                'งานและเครดิตจาก Gommo usage-history — ช่วงเวลาเดียวกับลิงก์ Activity จากที่นี่',
              )
            }}
          </p>
        </div>
        <a :href="usageDetailHref" class="or-profile-section-link">
          {{ m('Open Trends', 'Mở Trends', 'เปิด Trends') }} →
        </a>
      </div>
      <OverviewUsageSection
        ref="usageRef"
        :credits="credits"
        :locale="locale"
        :prefix="prefix"
        show-metric-toggle
      />
      <p class="or-profile-section-foot">
        <a :href="logsDetailHref" class="or-profile-section-link or-profile-section-link--sm">
          {{ m('View all job logs', 'Xem toàn bộ job logs', 'ดู job logs ทั้งหมด') }} →
        </a>
      </p>
    </section>

    <section id="profile-activity" class="or-profile-section or-profile-section-card">
      <div class="or-profile-section-head">
        <div>
          <h2 class="or-profile-section-title or-profile-section-title--lg">
            {{ m('Activity', 'Activity', 'กิจกรรม') }}
          </h2>
          <p class="or-profile-section-sub">
            {{
              m(
                'Top-ups and billing activity on this gateway.',
                'Nạp credit và hoạt động billing trên gateway này.',
                'เติมเครดิตและกิจกรรม billing บน gateway นี้',
              )
            }}
          </p>
        </div>
        <a :href="activityDetailHref" class="or-profile-section-link">
          {{ m('Full activity', 'Full activity', 'กิจกรรมทั้งหมด') }} →
        </a>
      </div>
      <ProfileActivityHeatmap ref="heatmapRef" :locale="locale" />

      <div class="or-profile-activity-kpi">
        <div class="or-profile-activity-kpi-item">
          <span class="or-profile-activity-kpi-label">{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</span>
          <strong class="or-profile-activity-kpi-value">{{ formatCredits(credits) }}</strong>
        </div>
        <div class="or-profile-activity-kpi-item">
          <span class="or-profile-activity-kpi-label">{{ m('Top-ups', 'Đơn nạp', 'การเติมเงิน') }}</span>
          <strong class="or-profile-activity-kpi-value">{{ topupOrders.length }}</strong>
        </div>
      </div>
      <OverviewRecentTopups
        :orders="topupOrders"
        :loading="ordersLoading"
        :locale="locale"
        :prefix="prefix"
      />
    </section>

    <section id="profile-api" class="or-profile-section or-profile-section-card">
      <div class="or-profile-section-head or-profile-section-head--panel">
        <div>
          <h2 class="or-profile-section-title or-profile-section-title--lg">
            {{ m('API access', 'API access', 'การเข้าถึง API') }}
          </h2>
          <p class="or-profile-section-sub">
            {{
              m(
                'Gommo Bearer token for api.gommo.net and v2.api.gommo.net — snippets and MCP on the Access token page.',
                'Bearer token Gommo cho api.gommo.net và v2.api.gommo.net — snippet và MCP trên trang Access token.',
                'Gommo Bearer token สำหรับ api.gommo.net และ v2.api.gommo.net — snippet และ MCP ในหน้า Access token',
              )
            }}
          </p>
        </div>
        <a :href="tokenHref" class="or-app-btn or-app-btn-primary or-app-btn-sm">
          {{ m('Access token', 'Access token', 'Access token') }} →
        </a>
      </div>
      <div class="or-app-token-row">
        <code class="or-app-token-value">{{ maskedToken }}</code>
        <button type="button" class="or-app-btn or-app-btn-ghost" @click="emit('copyToken')">
          {{ copied ? m('Copied', 'Đã copy', 'คัดลอกแล้ว') : m('Copy', 'Copy', 'คัดลอก') }}
        </button>
      </div>
      <div class="or-profile-api-actions">
        <a :href="authDocsHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Auth docs', 'Tài liệu auth', 'เอกสาร auth') }}
        </a>
      </div>
    </section>

    <section id="profile-account" class="or-profile-section or-profile-section-card">
      <h2 class="or-profile-section-title or-profile-section-title--lg">
        {{ m('Account details', 'Chi tiết tài khoản', 'รายละเอียดบัญชี') }}
      </h2>
      <p class="or-profile-section-sub">
        {{ m('Gommo account info from /ai/me (read-only).', 'Thông tin Gommo từ /ai/me (read-only).', 'ข้อมูลบัญชี Gommo จาก /ai/me (read-only)') }}
      </p>
      <dl class="or-app-profile-dl or-profile-account-dl">
        <div class="or-app-profile-row">
          <dt>{{ m('Email', 'Email', 'อีเมล') }}</dt>
          <dd>{{ email || '—' }}</dd>
        </div>
        <div class="or-app-profile-row">
          <dt>{{ m('Username', 'Username', 'ชื่อผู้ใช้') }}</dt>
          <dd>{{ username || '—' }}</dd>
        </div>
        <div class="or-app-profile-row">
          <dt>{{ m('Display name', 'Tên hiển thị', 'ชื่อที่แสดง') }}</dt>
          <dd>{{ displayName }}</dd>
        </div>
        <div class="or-app-profile-row">
          <dt>{{ m('Gommo domain', 'Domain Gommo', 'โดเมน Gommo') }}</dt>
          <dd><code>{{ loginDomain }}</code></dd>
        </div>
      </dl>
      <div class="or-profile-account-actions">
        <a :href="creditsHref" class="or-app-btn or-app-btn-primary or-app-btn-sm">
          {{ m('Top up credits', 'Nạp credits', 'เติมเครดิต') }}
        </a>
      </div>
    </section>
  </div>
</template>
