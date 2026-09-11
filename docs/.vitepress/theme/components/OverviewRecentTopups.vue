<script setup lang="ts">
import { computed } from 'vue';
import {
  formatCredits,
  formatOrderDate,
  formatTopupOrderStatus,
  type TopupOrder,
  type TopupOrderStatus,
} from '../models/user-api';

const props = defineProps<{
  orders: TopupOrder[];
  loading: boolean;
  isVi: boolean;
  prefix: string;
}>();

const activityHref = computed(() => `${props.prefix}/app/profile/?section=activity`);

function orderStatusClass(status: TopupOrderStatus): string {
  return `or-app-order-status--${status}`;
}
</script>

<template>
  <section class="or-overview-topups" aria-labelledby="overview-topups-title">
    <div class="or-overview-topups-head">
      <h2 id="overview-topups-title" class="or-app-panel-title">
        {{ isVi ? 'Nạp credit gần đây' : 'Recent top-ups' }}
      </h2>
      <a :href="activityHref" class="or-overview-usage-link or-overview-usage-link--sm">
        {{ isVi ? 'Xem Activity' : 'View Activity' }} →
      </a>
    </div>

    <p v-if="loading && orders.length === 0" class="or-app-muted or-overview-topups-empty">
      {{ isVi ? 'Đang tải…' : 'Loading…' }}
    </p>
    <p v-else-if="orders.length === 0" class="or-app-muted or-overview-topups-empty">
      {{ isVi ? 'Chưa có đơn nạp trên gateway này.' : 'No top-ups on this gateway yet.' }}
    </p>
    <ul v-else class="or-overview-topups-list">
      <li v-for="order in orders" :key="order.orderCode">
        <div class="or-overview-topups-main">
          <code class="or-overview-topups-code">#{{ order.orderCode }}</code>
          <span class="or-overview-topups-credits">{{ formatCredits(order.credits) }}</span>
        </div>
        <div class="or-overview-topups-meta">
          <span class="or-app-order-status" :class="orderStatusClass(order.status)">
            {{ formatTopupOrderStatus(order.status, isVi) }}
          </span>
          <span class="or-overview-topups-date">{{ formatOrderDate(order.createdAt, isVi) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
