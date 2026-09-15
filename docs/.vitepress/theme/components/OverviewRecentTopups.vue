<script setup lang="ts">
import { computed } from 'vue';
import { activityHubHref, PROFILE_USAGE_PREVIEW_PERIOD } from '../models/activity-hub-url';
import { pickMsg, type PortalLocale } from '../models/portal-locale';
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
  locale: PortalLocale;
  prefix: string;
}>();

const isVi = computed(() => props.locale === 'vi');

function m(en: string, vi: string, th?: string): string {
  return pickMsg(props.locale, en, vi, th);
}

const activityHref = computed(() =>
  activityHubHref(props.prefix, { tab: 'billing', period: PROFILE_USAGE_PREVIEW_PERIOD }),
);

function orderStatusClass(status: TopupOrderStatus): string {
  return `or-app-order-status--${status}`;
}
</script>

<template>
  <section class="or-overview-topups" aria-labelledby="overview-topups-title">
    <div class="or-overview-topups-head">
      <h2 id="overview-topups-title" class="or-app-panel-title">
        {{ m('Recent top-ups', 'Nạp credit gần đây', 'เติมเครดิตล่าสุด') }}
      </h2>
      <a :href="activityHref" class="or-overview-usage-link or-overview-usage-link--sm">
        {{ m('View Activity', 'Xem Activity', 'ดูกิจกรรม') }} →
      </a>
    </div>

    <p v-if="loading && orders.length === 0" class="or-app-muted or-overview-topups-empty">
      {{ m('Loading…', 'Đang tải…', 'กำลังโหลด…') }}
    </p>
    <p v-else-if="orders.length === 0" class="or-app-muted or-overview-topups-empty">
      {{ m('No top-ups on this gateway yet.', 'Chưa có đơn nạp trên gateway này.', 'ยังไม่มีการเติมเครดิตบนเกตเวยนี้') }}
    </p>
    <ul v-else class="or-overview-topups-list">
      <li v-for="order in orders" :key="order.orderCode">
        <div class="or-overview-topups-main">
          <code class="or-overview-topups-code">#{{ order.orderCode }}</code>
          <span class="or-overview-topups-credits">{{ formatCredits(order.credits) }}</span>
        </div>
        <div class="or-overview-topups-meta">
          <span class="or-app-order-status" :class="orderStatusClass(order.status)">
            {{ formatTopupOrderStatus(order.status, locale) }}
          </span>
          <span class="or-overview-topups-date">{{ formatOrderDate(order.createdAt, locale) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
