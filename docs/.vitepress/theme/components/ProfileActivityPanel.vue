<script setup lang="ts">
import {
  formatCredits,
  formatOrderDate,
  formatTopupOrderStatus,
  type TopupOrder,
  type TopupOrderStatus,
} from '../models/user-api';

defineProps<{
  isVi: boolean;
  prefix: string;
  credits: number;
  topupOrders: TopupOrder[];
  ordersLoading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

function orderStatusClass(status: TopupOrderStatus): string {
  if (status === 'credited' || status === 'paid') return 'or-app-order-status--ok';
  if (status === 'failed') return 'or-app-order-status--fail';
  return 'or-app-order-status--pending';
}
</script>

<template>
  <div class="or-app-activity">
    <p class="or-app-muted or-app-activity-intro">
      {{
        isVi
          ? 'Tóm tắt tài khoản — lịch sử nạp credit và liên kết nhanh tới usage.'
          : 'Account summary — top-up history and quick links to usage.'
      }}
    </p>

    <div class="or-app-activity-grid">
      <a :href="`${prefix}/app/profile/?section=usage`" class="or-app-activity-card">
        <h3>{{ isVi ? 'Usage & thống kê' : 'Usage & stats' }}</h3>
        <p>{{ isVi ? 'Credit thực, biểu đồ, tổng hợp theo ngày.' : 'Net credits, charts, daily summary.' }}</p>
        <span class="or-app-card-cta">{{ isVi ? 'Mở Usage' : 'Open Usage' }} →</span>
      </a>
      <a :href="`${prefix}/app/profile/?section=logs`" class="or-app-activity-card">
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

    <p v-if="ordersLoading && topupOrders.length === 0" class="or-app-muted">
      {{ isVi ? 'Đang tải…' : 'Loading…' }}
    </p>
    <p v-else-if="topupOrders.length === 0" class="or-app-muted or-app-orders-empty">
      {{ isVi ? 'Chưa có đơn nạp trên gateway này.' : 'No top-ups on this gateway yet.' }}
    </p>
    <div v-else class="or-app-orders-table-wrap">
      <table class="or-app-orders-table">
        <thead>
          <tr>
            <th>{{ isVi ? 'Mã đơn' : 'Order' }}</th>
            <th>{{ isVi ? 'Credits' : 'Credits' }}</th>
            <th>{{ isVi ? 'Trạng thái' : 'Status' }}</th>
            <th>{{ isVi ? 'Thời gian' : 'Date' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in topupOrders.slice(0, 10)" :key="order.orderCode">
            <td><code>#{{ order.orderCode }}</code></td>
            <td>{{ formatCredits(order.credits) }}</td>
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
    <p v-if="topupOrders.length > 0" class="or-app-muted">
      <a :href="`${prefix}/app/credits/`">{{ isVi ? 'Nạp thêm trên Credits' : 'Top up on Credits' }} →</a>
    </p>
  </div>
</template>
