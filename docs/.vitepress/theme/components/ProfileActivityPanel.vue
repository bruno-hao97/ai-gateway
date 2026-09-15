<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { activityHubHref } from '../models/activity-hub-url';
import type { PortalLocale } from '../models/portal-locale';
import {
  formatCredits,
  formatOrderDate,
  formatTopupOrderStatus,
  type TopupOrder,
  type TopupOrderStatus,
} from '../models/user-api';
import type { UsageStatsPeriod, UsageStatsType } from '../models/usage-stats';
import ProfileActivityHeatmap from './ProfileActivityHeatmap.vue';

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
  credits: number;
  topupOrders: TopupOrder[];
  ordersLoading: boolean;
  /** Activity hub billing tab — top-ups only */
  billingOnly?: boolean;
  /** Shared period from Activity hub for cross-tab links */
  activityPeriod?: UsageStatsPeriod;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const { m } = usePortalCopy(computed(() => props.locale));

const PENDING_STALE_MS = 24 * 60 * 60 * 1000;
const showStalePending = ref(false);

const visibleTopupOrders = computed(() => {
  if (showStalePending.value) return props.topupOrders;
  const now = Date.now();
  return props.topupOrders.filter((order) => {
    if (order.status !== 'pending') return true;
    const created = Date.parse(order.createdAt);
    return Number.isFinite(created) && now - created < PENDING_STALE_MS;
  });
});

const hiddenPendingCount = computed(
  () => props.topupOrders.length - visibleTopupOrders.value.length,
);

const billingStats = computed(() => {
  const credited = props.topupOrders.filter((o) => o.status === 'credited' || o.status === 'paid');
  const pending = props.topupOrders.filter((o) => o.status === 'pending');
  const totalCredited = credited.reduce((sum, o) => sum + o.credits, 0);
  const lastOrder = props.topupOrders[0];
  return {
    totalCredited,
    orderCount: props.topupOrders.length,
    pendingCount: pending.length,
    creditedCount: credited.length,
    lastOrderLabel: lastOrder ? formatOrderDate(lastOrder.createdAt, props.locale) : '—',
  };
});

function orderStatusClass(status: TopupOrderStatus): string {
  if (status === 'credited' || status === 'paid') return 'or-app-order-status--ok';
  if (status === 'failed') return 'or-app-order-status--fail';
  return 'or-app-order-status--pending';
}

function activityHref(
  tab: 'overview' | 'trends' | 'explore',
  opts?: { type?: UsageStatsType },
): string {
  return activityHubHref(props.prefix, {
    tab,
    period: props.activityPeriod ?? '30d',
    type: opts?.type,
  });
}
</script>

<template>
  <div class="or-app-activity" :class="{ 'or-activity-billing': billingOnly }">
    <template v-if="billingOnly">
      <div class="or-activity-overview-kpi-row or-activity-billing-kpi">
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</span>
          <strong class="or-activity-hub-kpi-value">{{ formatCredits(credits) }}</strong>
          <span class="or-activity-hub-kpi-sub">{{ m('Current', 'Hiện tại', 'ปัจจุบัน') }}</span>
        </div>
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ m('Total topped up', 'Đã nạp', 'เติมทั้งหมด') }}</span>
          <strong class="or-activity-hub-kpi-value">
            <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
            <template v-else>{{ formatCredits(billingStats.totalCredited) }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">{{ billingStats.creditedCount }} {{ m('orders', 'đơn', 'คำสั่ง') }}</span>
        </div>
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ m('Top-up orders', 'Đơn nạp', 'คำสั่งเติมเงิน') }}</span>
          <strong class="or-activity-hub-kpi-value">
            <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
            <template v-else>{{ billingStats.orderCount }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">
            <template v-if="billingStats.pendingCount > 0">
              {{ billingStats.pendingCount }} {{ m('pending', 'đang chờ', 'รอดำเนินการ') }}
            </template>
            <template v-else>VietQR</template>
          </span>
        </div>
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ m('Last order', 'Đơn gần nhất', 'คำสั่งล่าสุด') }}</span>
          <strong class="or-activity-hub-kpi-value or-activity-billing-kpi-date">
            <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
            <template v-else>{{ billingStats.lastOrderLabel }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">{{ m('This gateway', 'Gateway này', 'Gateway นี้') }}</span>
        </div>
      </div>

      <div class="or-activity-billing-links">
        <a :href="`${prefix}/app/credits/`" class="or-app-btn or-app-btn-primary or-app-btn-sm">
          {{ m('Top up credits', 'Nạp credits', 'เติมเครดิต') }} →
        </a>
        <a :href="activityHref('overview')" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Overview', 'Overview', 'ภาพรวม') }}
        </a>
        <a :href="activityHref('trends')" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Trends', 'Trends', 'แนวโน้ม') }}
        </a>
        <a :href="activityHref('explore')" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Job logs', 'Job logs', 'บันทึกงาน') }}
        </a>
        <a :href="`${prefix}/app/observability/`" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Observability', 'Observability', 'การสังเกต') }}
        </a>
      </div>
    </template>

    <template v-else>
      <p class="or-app-muted or-app-activity-intro">
        {{
          m(
            'Billing & top-ups — VietQR orders and quick links to usage/logs.',
            'Billing & nạp credit — đơn VietQR và liên kết nhanh tới usage/logs.',
            'Billing และเติมเครดิต — คำสั่ง VietQR และลิงก์ด่วนไป usage/logs',
          )
        }}
      </p>

      <ProfileActivityHeatmap :locale="locale" />

      <div class="or-app-activity-grid">
        <a :href="`${prefix}/app/activity/?tab=trends`" class="or-app-activity-card">
          <h3>{{ m('Usage & stats', 'Usage & thống kê', 'การใช้งานและสถิติ') }}</h3>
          <p>{{ m('Net credits, charts, daily summary.', 'Credit thực, biểu đồ, tổng hợp theo ngày.', 'เครดิตสุทธิ กราฟ สรุปรายวัน') }}</p>
          <span class="or-app-card-cta">{{ m('Open Usage', 'Mở Usage', 'เปิด Usage') }} →</span>
        </a>
        <a :href="`${prefix}/app/activity/?tab=explore`" class="or-app-activity-card">
          <h3>{{ m('Job logs', 'Nhật ký job', 'บันทึกงาน') }}</h3>
          <p>{{ m('Per-job image, video, audio history.', 'Từng lần gen image, video, audio…', 'ประวัติ image, video, audio ต่องาน') }}</p>
          <span class="or-app-card-cta">{{ m('View logs', 'Xem logs', 'ดู logs') }} →</span>
        </a>
        <a :href="`${prefix}/app/playground/`" class="or-app-activity-card">
          <h3>{{ m('Playground', 'Playground', 'สนามทดลอง') }}</h3>
          <p>{{ m('Run jobs on the gateway.', 'Chạy job thử trên gateway.', 'รันงานบน gateway') }}</p>
          <span class="or-app-card-cta">{{ m('Open', 'Mở', 'เปิด') }} →</span>
        </a>
        <a :href="`${prefix}/app/credits/`" class="or-app-activity-card">
          <h3>{{ m('Top up credits', 'Nạp credits', 'เติมเครดิต') }}</h3>
          <p>
            {{ m('Balance:', 'Số dư hiện tại:', 'ยอดคงเหลือ:') }}
            <strong>{{ formatCredits(credits) }}</strong>
          </p>
          <span class="or-app-card-cta">{{ m('Wallet', 'Wallet', 'Wallet') }} →</span>
        </a>
      </div>
    </template>

    <div class="or-app-orders-head">
      <h3 class="or-app-panel-title">{{ m('Recent top-ups', 'Nạp credit gần đây', 'เติมเครดิตล่าสุด') }}</h3>
      <button
        type="button"
        class="or-app-btn or-app-btn-ghost or-app-btn-sm"
        :disabled="ordersLoading"
        @click="emit('refresh')"
      >
        {{ ordersLoading ? m('Loading…', 'Đang tải…', 'กำลังโหลด…') : m('Refresh', 'Làm mới', 'รีเฟรช') }}
      </button>
    </div>

    <div v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--table" aria-hidden="true" />
    <p v-else-if="visibleTopupOrders.length === 0" class="or-app-muted or-app-orders-empty">
      {{ m('No top-ups on this gateway yet.', 'Chưa có đơn nạp trên gateway này.', 'ยังไม่มีการเติมเงินบน gateway นี้') }}
      <a :href="`${prefix}/app/credits/`" class="or-profile-section-link">
        {{ m('Top up credits', 'Nạp credits', 'เติมเครดิต') }} →
      </a>
    </p>
    <div v-else class="or-app-panel or-activity-billing-orders">
      <div class="or-app-orders-table-wrap">
        <button
          v-if="hiddenPendingCount > 0"
          type="button"
          class="or-app-orders-pending-toggle"
          @click="showStalePending = !showStalePending"
        >
          {{
            showStalePending
              ? m('Hide stale pending', 'Ẩn đơn chờ cũ', 'ซ่อนคำสั่งรอเก่า')
              : m(
                  `Show ${hiddenPendingCount} stale pending`,
                  `Hiện thêm ${hiddenPendingCount} đơn chờ cũ`,
                  `แสดงคำสั่งรอเก่า ${hiddenPendingCount} รายการ`,
                )
          }}
        </button>
        <table class="or-app-orders-table or-usage-table--explore">
          <thead>
            <tr>
              <th>{{ m('Order', 'Mã đơn', 'คำสั่ง') }}</th>
              <th>{{ m('Credits', 'Credits', 'เครดิต') }}</th>
              <th>{{ m('Amount', 'Số tiền', 'จำนวนเงิน') }}</th>
              <th>{{ m('Status', 'Trạng thái', 'สถานะ') }}</th>
              <th>{{ m('Date', 'Thời gian', 'วันที่') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in visibleTopupOrders.slice(0, billingOnly ? 20 : 10)"
              :key="order.orderCode"
              class="or-usage-explore-row"
            >
              <td><code>#{{ order.orderCode }}</code></td>
              <td>{{ formatCredits(order.credits) }}</td>
              <td class="or-app-muted">{{ order.amountVnd.toLocaleString() }} ₫</td>
              <td>
                <span class="or-app-order-status" :class="orderStatusClass(order.status)">
                  {{ formatTopupOrderStatus(order.status, locale) }}
                </span>
              </td>
              <td class="or-app-orders-date">{{ formatOrderDate(order.createdAt, locale) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="visibleTopupOrders.length > 0" class="or-app-muted or-activity-billing-foot">
      <a :href="`${prefix}/app/credits/`">{{ m('Top up on Credits', 'Nạp thêm trên Credits', 'เติมเพิ่มใน Credits') }} →</a>
    </p>
  </div>
</template>
