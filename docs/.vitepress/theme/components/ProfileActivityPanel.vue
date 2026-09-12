<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  formatCredits,
  formatOrderDate,
  formatTopupOrderStatus,
  type TopupOrder,
  type TopupOrderStatus,
} from '../models/user-api';
import ProfileActivityHeatmap from './ProfileActivityHeatmap.vue';

const props = defineProps<{
  isVi: boolean;
  prefix: string;
  credits: number;
  topupOrders: TopupOrder[];
  ordersLoading: boolean;
  /** Activity hub billing tab — top-ups only */
  billingOnly?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

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
    lastOrderLabel: lastOrder ? formatOrderDate(lastOrder.createdAt, props.isVi) : '—',
  };
});

function orderStatusClass(status: TopupOrderStatus): string {
  if (status === 'credited' || status === 'paid') return 'or-app-order-status--ok';
  if (status === 'failed') return 'or-app-order-status--fail';
  return 'or-app-order-status--pending';
}

function activityHref(tab: 'overview' | 'explore'): string {
  const base = `${props.prefix}/app/activity/`;
  if (tab === 'overview') return base;
  return `${base}?tab=explore`;
}
</script>

<template>
  <div class="or-app-activity" :class="{ 'or-activity-billing': billingOnly }">
    <template v-if="billingOnly">
      <div class="or-activity-overview-kpi-row or-activity-billing-kpi">
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ isVi ? 'Số dư' : 'Balance' }}</span>
          <strong class="or-activity-hub-kpi-value">{{ formatCredits(credits) }}</strong>
          <span class="or-activity-hub-kpi-sub">{{ isVi ? 'Hiện tại' : 'Current' }}</span>
        </div>
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ isVi ? 'Đã nạp' : 'Total topped up' }}</span>
          <strong class="or-activity-hub-kpi-value">
            <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
            <template v-else>{{ formatCredits(billingStats.totalCredited) }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">{{ billingStats.creditedCount }} {{ isVi ? 'đơn' : 'orders' }}</span>
        </div>
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ isVi ? 'Đơn nạp' : 'Top-up orders' }}</span>
          <strong class="or-activity-hub-kpi-value">
            <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
            <template v-else>{{ billingStats.orderCount }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">
            <template v-if="billingStats.pendingCount > 0">
              {{ billingStats.pendingCount }} {{ isVi ? 'đang chờ' : 'pending' }}
            </template>
            <template v-else>{{ isVi ? 'VietQR' : 'VietQR' }}</template>
          </span>
        </div>
        <div class="or-activity-hub-kpi">
          <span class="or-activity-hub-kpi-label">{{ isVi ? 'Đơn gần nhất' : 'Last order' }}</span>
          <strong class="or-activity-hub-kpi-value or-activity-billing-kpi-date">
            <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
            <template v-else>{{ billingStats.lastOrderLabel }}</template>
          </strong>
          <span class="or-activity-hub-kpi-sub">{{ isVi ? 'Gateway này' : 'This gateway' }}</span>
        </div>
      </div>

      <div class="or-activity-billing-links">
        <a :href="`${prefix}/app/credits/`" class="or-app-btn or-app-btn-primary or-app-btn-sm">
          {{ isVi ? 'Nạp credits' : 'Top up credits' }} →
        </a>
        <a :href="activityHref('overview')" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ isVi ? 'Overview' : 'Overview' }}
        </a>
        <a :href="activityHref('explore')" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ isVi ? 'Job logs' : 'Job logs' }}
        </a>
      </div>
    </template>

    <template v-else>
      <p class="or-app-muted or-app-activity-intro">
        {{
          isVi
            ? 'Billing & nạp credit — đơn VietQR và liên kết nhanh tới usage/logs.'
            : 'Billing & top-ups — VietQR orders and quick links to usage/logs.'
        }}
      </p>

      <ProfileActivityHeatmap :is-vi="isVi" />

      <div class="or-app-activity-grid">
        <a :href="`${prefix}/app/activity/?tab=trends`" class="or-app-activity-card">
          <h3>{{ isVi ? 'Usage & thống kê' : 'Usage & stats' }}</h3>
          <p>{{ isVi ? 'Credit thực, biểu đồ, tổng hợp theo ngày.' : 'Net credits, charts, daily summary.' }}</p>
          <span class="or-app-card-cta">{{ isVi ? 'Mở Usage' : 'Open Usage' }} →</span>
        </a>
        <a :href="`${prefix}/app/activity/?tab=explore`" class="or-app-activity-card">
          <h3>{{ isVi ? 'Nhật ký job' : 'Job logs' }}</h3>
          <p>{{ isVi ? 'Từng lần gen image, video, audio…' : 'Per-job image, video, audio history.' }}</p>
          <span class="or-app-card-cta">{{ isVi ? 'Xem logs' : 'View logs' }} →</span>
        </a>
        <a :href="`${prefix}/app/playground/`" class="or-app-activity-card">
          <h3>Playground</h3>
          <p>{{ isVi ? 'Chạy job thử trên gateway.' : 'Run jobs on the gateway.' }}</p>
          <span class="or-app-card-cta">{{ isVi ? 'Mở' : 'Open' }} →</span>
        </a>
        <a :href="`${prefix}/app/credits/`" class="or-app-activity-card">
          <h3>{{ isVi ? 'Nạp credits' : 'Top up credits' }}</h3>
          <p>
            {{ isVi ? 'Số dư hiện tại:' : 'Balance:' }}
            <strong>{{ formatCredits(credits) }}</strong>
          </p>
          <span class="or-app-card-cta">{{ isVi ? 'Wallet' : 'Wallet' }} →</span>
        </a>
      </div>
    </template>

    <div class="or-app-orders-head">
      <h3 class="or-app-panel-title">{{ isVi ? 'Nạp credit gần đây' : 'Recent top-ups' }}</h3>
      <button
        type="button"
        class="or-app-btn or-app-btn-ghost or-app-btn-sm"
        :disabled="ordersLoading"
        @click="emit('refresh')"
      >
        {{ ordersLoading ? (isVi ? 'Đang tải…' : 'Loading…') : isVi ? 'Làm mới' : 'Refresh' }}
      </button>
    </div>

    <div v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--table" aria-hidden="true" />
    <p v-else-if="visibleTopupOrders.length === 0" class="or-app-muted or-app-orders-empty">
      {{ isVi ? 'Chưa có đơn nạp trên gateway này.' : 'No top-ups on this gateway yet.' }}
      <a :href="`${prefix}/app/credits/`" class="or-profile-section-link">
        {{ isVi ? 'Nạp credits' : 'Top up credits' }} →
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
              ? isVi
                ? 'Ẩn đơn chờ cũ'
                : 'Hide stale pending'
              : isVi
                ? `Hiện thêm ${hiddenPendingCount} đơn chờ cũ`
                : `Show ${hiddenPendingCount} stale pending`
          }}
        </button>
        <table class="or-app-orders-table or-usage-table--explore">
          <thead>
            <tr>
              <th>{{ isVi ? 'Mã đơn' : 'Order' }}</th>
              <th>{{ isVi ? 'Credits' : 'Credits' }}</th>
              <th>{{ isVi ? 'Số tiền' : 'Amount' }}</th>
              <th>{{ isVi ? 'Trạng thái' : 'Status' }}</th>
              <th>{{ isVi ? 'Thời gian' : 'Date' }}</th>
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
                  {{ formatTopupOrderStatus(order.status, isVi) }}
                </span>
              </td>
              <td class="or-app-orders-date">{{ formatOrderDate(order.createdAt, isVi) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="visibleTopupOrders.length > 0" class="or-app-muted or-activity-billing-foot">
      <a :href="`${prefix}/app/credits/`">{{ isVi ? 'Nạp thêm trên Credits' : 'Top up on Credits' }} →</a>
    </p>
  </div>
</template>
