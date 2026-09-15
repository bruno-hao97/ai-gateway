<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { activityHubHref } from '../models/activity-hub-url';
import { formatApproxUsd, formatPayTotalLine } from '../models/invoice-buyer';
import type { PortalLocale } from '../models/portal-locale';
import {
  fetchBillingPackages,
  fetchBillingStatus,
  fetchTopupOrders,
  formatCredits,
  formatOrderDate,
  formatTopupOrderStatus,
  type CreditPackage,
  type TopupOrder,
  type TopupOrderStatus,
} from '../models/user-api';
import CreditsCheckoutModal from './CreditsCheckoutModal.vue';

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
  credits: number;
  creditsLow: boolean;
  creditsApproxUsd: string;
  username: string;
  email: string;
}>();

const emit = defineEmits<{
  paid: [];
}>();

const { isVi, m } = usePortalCopy(computed(() => props.locale));

const numberLocale = computed(() =>
  props.locale === 'vi' ? 'vi-VN' : props.locale === 'th' ? 'th-TH' : 'en-US',
);

const PENDING_STALE_MS = 24 * 60 * 60 * 1000;

const packagesLoading = ref(true);
const packagesError = ref('');
const packages = ref<CreditPackage[]>([]);
const billingReady = ref(true);
const topupOrders = ref<TopupOrder[]>([]);
const ordersLoading = ref(false);
const ordersError = ref('');
const showStalePending = ref(false);
const checkoutOpen = ref(false);
const checkoutPackage = ref<CreditPackage | null>(null);
const checkoutToast = ref('');
let checkoutToastTimer: ReturnType<typeof setTimeout> | null = null;

const activityBillingHref = computed(() =>
  activityHubHref(props.prefix, { tab: 'billing', period: '30d' }),
);
const activityExploreHref = computed(() =>
  activityHubHref(props.prefix, { tab: 'explore', period: '30d' }),
);
const billingDocsHref = computed(() => `${props.prefix}/guides/billing-credits`);
const overviewHref = computed(() => `${props.prefix}/app/`);

const visibleTopupOrders = computed(() => {
  if (showStalePending.value) return topupOrders.value;
  const now = Date.now();
  return topupOrders.value.filter((order) => {
    if (order.status !== 'pending') return true;
    const created = Date.parse(order.createdAt);
    return Number.isFinite(created) && now - created < PENDING_STALE_MS;
  });
});

const hiddenPendingCount = computed(
  () => topupOrders.value.length - visibleTopupOrders.value.length,
);

const billingStats = computed(() => {
  const credited = topupOrders.value.filter((o) => o.status === 'credited' || o.status === 'paid');
  const pending = topupOrders.value.filter((o) => o.status === 'pending');
  const totalCredited = credited.reduce((sum, o) => sum + o.credits, 0);
  const lastOrder = topupOrders.value[0];
  return {
    totalCredited,
    orderCount: topupOrders.value.length,
    pendingCount: pending.length,
    creditedCount: credited.length,
    lastOrderLabel: lastOrder ? formatOrderDate(lastOrder.createdAt, props.locale) : '—',
  };
});

function orderStatusClass(status: TopupOrderStatus): string {
  return `or-app-order-status--${status}`;
}

async function loadTopupOrders() {
  if (!props.username) {
    topupOrders.value = [];
    ordersError.value = '';
    return;
  }
  ordersLoading.value = true;
  ordersError.value = '';
  try {
    topupOrders.value = await fetchTopupOrders(props.username, 20);
  } catch (e) {
    topupOrders.value = [];
    ordersError.value = e instanceof Error ? e.message : String(e);
  } finally {
    ordersLoading.value = false;
  }
}

async function reload() {
  packagesLoading.value = true;
  packagesError.value = '';
  try {
    const status = await fetchBillingStatus();
    billingReady.value = status.gommoPayment !== false;
    packages.value = await fetchBillingPackages();
    await loadTopupOrders();
  } catch (e) {
    packagesError.value = e instanceof Error ? e.message : String(e);
  } finally {
    packagesLoading.value = false;
  }
}

function onTopup(packageId: string) {
  if (!props.username) {
    packagesError.value = m(
      'Missing username — sign in again',
      'Thiếu username — đăng nhập lại',
      'ไม่มี username — กรุณาเข้าสู่ระบบอีกครั้ง',
    );
    return;
  }
  const pkg = packages.value.find((item) => item.id === packageId);
  if (!pkg) return;
  packagesError.value = '';
  checkoutPackage.value = pkg;
  checkoutOpen.value = true;
}

function closeCheckout() {
  checkoutOpen.value = false;
  checkoutPackage.value = null;
}

function onCheckoutToast(message: string) {
  checkoutToast.value = message;
  if (checkoutToastTimer) clearTimeout(checkoutToastTimer);
  checkoutToastTimer = setTimeout(() => {
    checkoutToast.value = '';
  }, 3200);
}

async function onCheckoutPaid() {
  emit('paid');
  await loadTopupOrders();
}

onMounted(() => {
  void reload();
});

defineExpose({ reload });
</script>

<template>
  <div class="or-credits-page">
    <div v-if="creditsLow" class="or-overview-banner or-overview-banner--warn or-credits-banner" role="status">
      <p>
        {{
          m(
            `Low balance (${formatCredits(credits)} credits) — top up to avoid interrupted jobs.`,
            `Số dư thấp (${formatCredits(credits)} credits) — nạp thêm để tránh job bị dừng giữa chừng.`,
            `ยอดคงเหลือต่ำ (${formatCredits(credits)} credits) — เติมเงินเพื่อไม่ให้งานถูกขัดจังหวะ`,
          )
        }}
      </p>
    </div>

    <div class="or-activity-overview-kpi-row or-credits-kpi">
      <div class="or-activity-hub-kpi">
        <span class="or-activity-hub-kpi-label">{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</span>
        <strong class="or-activity-hub-kpi-value">{{ formatCredits(credits) }}</strong>
        <span v-if="creditsApproxUsd" class="or-activity-hub-kpi-sub">{{ creditsApproxUsd }}</span>
        <span v-else class="or-activity-hub-kpi-sub">{{ m('Gommo credits', 'Gommo credits', 'Gommo credits') }}</span>
      </div>
      <div class="or-activity-hub-kpi">
        <span class="or-activity-hub-kpi-label">{{ m('Total topped up', 'Đã nạp', 'เติมเงินรวม') }}</span>
        <strong class="or-activity-hub-kpi-value">
          <span v-if="ordersLoading && topupOrders.length === 0" class="or-activity-skeleton or-activity-skeleton--text" />
          <template v-else>{{ formatCredits(billingStats.totalCredited) }}</template>
        </strong>
        <span class="or-activity-hub-kpi-sub">{{ billingStats.creditedCount }} {{ m('orders', 'đơn', 'รายการ') }}</span>
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
        <span class="or-activity-hub-kpi-sub">{{ m('This gateway', 'Gateway này', 'เกตเวย์นี้') }}</span>
      </div>
    </div>

    <div class="or-credits-quicklinks">
      <a :href="activityBillingHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Activity Billing', 'Activity Billing', 'Activity Billing') }} →
      </a>
      <a :href="activityExploreHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Job logs', 'Job logs', 'Job logs') }} →
      </a>
      <a :href="overviewHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Overview', 'Overview', 'ภาพรวม') }} →
      </a>
      <a :href="billingDocsHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
        {{ m('Billing docs', 'Billing docs', 'เอกสาร billing') }} →
      </a>
    </div>

    <p v-if="!billingReady" class="or-app-alert or-app-alert-warn">
      {{
        m(
          'Gommo billing not ready — see GET /billing/status.',
          'Billing Gommo chưa sẵn sàng — xem GET /billing/status.',
          'Billing Gommo ยังไม่พร้อม — ดู GET /billing/status',
        )
      }}
    </p>

    <h2 class="or-credits-section-title">{{ m('Packages', 'Gói nạp', 'แพ็กเกจ') }}</h2>
    <p v-if="packagesLoading" class="or-app-muted">{{ m('Loading packages…', 'Đang tải gói…', 'กำลังโหลดแพ็กเกจ…') }}</p>
    <p v-else-if="packagesError" class="or-app-alert">{{ packagesError }}</p>
    <div v-else-if="packages.length === 0" class="or-app-panel or-app-empty">
      {{ m('No credit packages available.', 'Chưa có gói credit.', 'ยังไม่มีแพ็กเกจ credit') }}
    </div>
    <div v-else class="or-app-pkg-grid">
      <article
        v-for="pkg in packages"
        :key="pkg.id"
        class="or-app-pkg"
        :class="{ featured: pkg.featured }"
      >
        <span v-if="pkg.featured" class="or-app-pkg-ribbon">
          {{ m('BEST', 'BEST', 'BEST') }}
        </span>
        <div class="or-app-pkg-head">
          <h3>{{ pkg.name }}</h3>
          <span v-if="pkg.bonusPercent > 0" class="or-app-pkg-badge">
            +{{ pkg.bonusPercent }}% {{ m('Bonus', 'Thưởng', 'โบนัส') }}
          </span>
        </div>
        <p class="or-app-pkg-price">
          {{ pkg.amountVnd.toLocaleString(numberLocale) }} ₫
          <template v-if="!isVi"> · {{ formatApproxUsd(pkg.amountVnd) }}</template>
        </p>
        <p class="or-app-pkg-credits">{{ formatCredits(pkg.credits) }} credits</p>
        <p class="or-app-pkg-vat">{{ formatPayTotalLine(pkg.amountVnd, props.locale) }}</p>
        <button
          type="button"
          class="or-app-btn or-app-btn-sm"
          :class="pkg.featured ? 'or-app-btn-accent' : 'or-app-btn-primary'"
          @click="onTopup(pkg.id)"
        >
          {{ m('Top up', 'Nạp ngay', 'เติมเงิน') }}
        </button>
      </article>
    </div>

    <CreditsCheckoutModal
      :open="checkoutOpen"
      :pkg="checkoutPackage"
      :username="username"
      :default-email="email"
      :locale="locale"
      @close="closeCheckout"
      @paid="onCheckoutPaid"
      @toast="onCheckoutToast"
    />

    <p v-if="checkoutToast" class="or-checkout-toast" role="status">{{ checkoutToast }}</p>

    <div class="or-app-panel or-app-orders or-credits-orders">
      <div class="or-app-orders-head">
        <h2 class="or-app-panel-title or-credits-section-title or-credits-section-title--inline">
          {{ m('Top-up history', 'Lịch sử nạp', 'ประวัติเติมเงิน') }}
        </h2>
        <button
          type="button"
          class="or-app-btn or-app-btn-ghost or-app-btn-sm"
          :disabled="ordersLoading"
          @click="loadTopupOrders"
        >
          {{
            ordersLoading
              ? m('Loading…', 'Đang tải…', 'กำลังโหลด…')
              : m('Refresh', 'Làm mới', 'รีเฟรช')
          }}
        </button>
      </div>

      <p v-if="ordersError" class="or-app-alert" role="alert">{{ ordersError }}</p>

      <p v-if="ordersLoading && topupOrders.length === 0" class="or-app-muted">
        {{ m('Loading history…', 'Đang tải lịch sử…', 'กำลังโหลดประวัติ…') }}
      </p>
      <p v-else-if="!ordersError && visibleTopupOrders.length === 0" class="or-app-muted or-app-orders-empty">
        {{
          m(
            'No top-ups yet. Pick a VietQR package above to get started.',
            'Chưa có đơn nạp. Chọn gói VietQR ở trên để bắt đầu.',
            'ยังไม่มีการเติมเงิน เลือกแพ็กเกจ VietQR ด้านบนเพื่อเริ่มต้น',
          )
        }}
      </p>

      <div v-else class="or-app-orders-table-wrap">
        <table class="or-app-orders-table">
          <thead>
            <tr>
              <th>{{ m('Order', 'Mã đơn', 'คำสั่ง') }}</th>
              <th>{{ m('Credits', 'Credits', 'Credits') }}</th>
              <th>{{ m('Amount', 'Số tiền', 'จำนวนเงิน') }}</th>
              <th>{{ m('Status', 'Trạng thái', 'สถานะ') }}</th>
              <th>{{ m('Date', 'Thời gian', 'วันที่') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in visibleTopupOrders" :key="order.orderCode">
              <td><code>#{{ order.orderCode }}</code></td>
              <td>{{ formatCredits(order.credits) }}</td>
              <td>{{ order.amountVnd.toLocaleString(numberLocale) }} ₫</td>
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
    </div>

    <p class="or-app-muted or-credits-footnote">
      {{
        m(
          'Credits apply automatically after VietQR bank transfer (Gommo).',
          'Credits cộng tự động sau chuyển khoản VietQR (Gommo).',
          'Credits จะเข้าอัตโนมัติหลังโอน VietQR (Gommo)',
        )
      }}
      <a :href="billingDocsHref">{{ m('Billing docs', 'Tài liệu billing', 'เอกสาร billing') }}</a>
    </p>
  </div>
</template>

<style scoped>
.or-credits-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.or-credits-banner {
  margin-bottom: 1rem;
}

.or-credits-kpi {
  margin-bottom: 1rem;
}

.or-credits-quicklinks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.or-credits-section-title {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--or-text-muted, var(--vp-c-text-2));
}

.or-credits-section-title--inline {
  margin: 0;
  text-transform: none;
  letter-spacing: -0.01em;
  font-size: 0.9375rem;
  color: var(--or-text, inherit);
}

.or-credits-orders {
  margin-top: 1.5rem;
}

.or-credits-footnote {
  margin: 1rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.or-credits-footnote a {
  color: var(--or-accent, var(--vp-c-brand-1));
  text-decoration: none;
  margin-left: 0.35rem;
}

.or-credits-footnote a:hover {
  text-decoration: underline;
}
</style>
