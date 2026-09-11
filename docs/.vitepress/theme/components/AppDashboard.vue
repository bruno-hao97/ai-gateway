<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import type { PlaygroundPortalLocale } from '../models/playground-locale-bridge';
import { useHybridLocale } from '../composables/use-hybrid-locale';
import { getStoredToken, getStoredDomain, importSessionFromUrl, loginUrlWithRedirect } from '../models/auth-api';
import {
  fetchBillingPackages,
  fetchBillingStatus,
  fetchMe,
  fetchTopupOrders,
  formatCredits,
  formatOrderDate,
  formatTopupOrderStatus,
  getCachedMe,
  getCredits,
  getDisplayName,
  getEmail,
  getAvatarUrl,
  getUsername,
  type CreditPackage,
  type MeResponse,
  type TopupOrder,
  type TopupOrderStatus,
} from '../models/user-api';
import AppNavIcon from './AppNavIcon.vue';
import AppChatPanel from './AppChatPanel.vue';
import ApiPlaygroundEmbed from './ApiPlaygroundEmbed.vue';
import CreditsCheckoutModal from './CreditsCheckoutModal.vue';
import ProfileUsagePanel from './ProfileUsagePanel.vue';
import ProfileActivityPanel from './ProfileActivityPanel.vue';
import OverviewUsageSection from './OverviewUsageSection.vue';
import OverviewRecentTopups from './OverviewRecentTopups.vue';
import OverviewOnboardingCard from './OverviewOnboardingCard.vue';
import AccessTokenPanel from './AccessTokenPanel.vue';
import FilesPanel from './FilesPanel.vue';
import { formatApproxUsd, formatPayTotalLine } from '../models/invoice-buyer';

const TOKEN_COPIED_STORAGE_KEY = 'gateway_token_copied';

interface AppNavItem {
  id?: string;
  label: string;
  href?: string;
  icon: string;
  disabled?: boolean;
  badge?: string;
}

type ProfileSection = 'general' | 'usage' | 'api' | 'activity' | 'logs';

const PROFILE_SECTIONS = new Set<ProfileSection>(['general', 'usage', 'api', 'activity', 'logs']);

const LOW_CREDITS_THRESHOLD = 10_000;

type OverviewUsageStats = {
  totalJobs: number;
  loaded: boolean;
  hasError: boolean;
};

const props = defineProps<{
  view: 'overview' | 'profile' | 'playground' | 'chat' | 'token' | 'credits' | 'files';
}>();

const route = useRoute();
const { isVi, prefix, locale: uiLocale } = useHybridLocale();

const ready = ref(false);
const me = ref<MeResponse | null>(getCachedMe());
const loadError = ref('');
const copied = ref(false);
const overviewUsageStats = ref<OverviewUsageStats>({
  totalJobs: 0,
  loaded: false,
  hasError: false,
});

const packages = ref<CreditPackage[]>([]);
const packagesLoading = ref(false);
const packagesError = ref('');
const topupOrders = ref<TopupOrder[]>([]);
const ordersLoading = ref(false);
const showStalePending = ref(false);

const PENDING_STALE_MS = 24 * 60 * 60 * 1000;

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
const billingReady = ref(true);
const checkoutOpen = ref(false);
const checkoutPackage = ref<CreditPackage | null>(null);
const checkoutToast = ref('');
let checkoutToastTimer: ReturnType<typeof setTimeout> | null = null;
const usagePanelRef = ref<InstanceType<typeof ProfileUsagePanel> | null>(null);
const logsPanelRef = ref<InstanceType<typeof ProfileUsagePanel> | null>(null);
const overviewUsageRef = ref<InstanceType<typeof OverviewUsageSection> | null>(null);
const accessTokenRef = ref<InstanceType<typeof AccessTokenPanel> | null>(null);
const filesPanelRef = ref<InstanceType<typeof FilesPanel> | null>(null);
const tokenCopiedEver = ref(false);

const playgroundLocale = computed((): PlaygroundPortalLocale => uiLocale.value);

const credits = computed(() => getCredits(me.value));
const creditsLow = computed(() => credits.value < LOW_CREDITS_THRESHOLD);
const showLowCreditsBanner = computed(() => creditsLow.value);
const creditsApproxUsd = computed(() => (isVi.value ? '' : formatApproxUsd(credits.value)));
const overviewTopupPreview = computed(() => visibleTopupOrders.value.slice(0, 3));
const showNoJobsBanner = computed(
  () =>
    overviewUsageStats.value.loaded &&
    !overviewUsageStats.value.hasError &&
    overviewUsageStats.value.totalJobs === 0 &&
    tokenCopiedEver.value,
);
const hasOverviewJobs = computed(
  () => overviewUsageStats.value.loaded && overviewUsageStats.value.totalJobs > 0,
);

function onOverviewUsageStats(payload: { totalJobs: number; hasError: boolean }) {
  overviewUsageStats.value = {
    totalJobs: payload.totalJobs,
    loaded: true,
    hasError: payload.hasError,
  };
}
const displayName = computed(() => getDisplayName(me.value));
const username = computed(() => getUsername(me.value));
const email = computed(() => getEmail(me.value));
const avatarUrl = computed(() => getAvatarUrl(me.value));
const loginDomain = computed(() => getStoredDomain());
const profileInitials = computed(() => {
  const name = displayName.value;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
});
const token = computed(() => getStoredToken());
const maskedToken = computed(() => {
  const t = token.value;
  if (t.length <= 12) return t;
  return `${t.slice(0, 8)}…${t.slice(-4)}`;
});

const navDeveloper = computed((): AppNavItem[] => [
  { id: 'overview', label: isVi.value ? 'Tổng quan' : 'Overview', href: `${prefix.value}/app/`, icon: 'home' },
  {
    id: 'token',
    label: isVi.value ? 'Access token' : 'Access token',
    href: `${prefix.value}/app/token/`,
    icon: 'key',
  },
  {
    id: 'files',
    label: 'Files',
    href: `${prefix.value}/app/files/`,
    icon: 'folder',
    badge: 'beta',
  },
  { label: isVi.value ? 'Models' : 'Models', href: `${prefix.value}/models/`, icon: 'grid' },
  { label: isVi.value ? 'So sánh' : 'Compare', href: `${prefix.value}/models/compare/`, icon: 'compare' },
  {
    label: isVi.value ? 'Tài liệu' : 'Documentation',
    href: `${prefix.value}/quickstart`,
    icon: 'book',
  },
]);

const navAccount = computed((): AppNavItem[] => [
  { id: 'profile', label: isVi.value ? 'Hồ sơ' : 'Profile', href: `${prefix.value}/app/profile/`, icon: 'user' },
  { id: 'credits', label: isVi.value ? 'Credits' : 'Credits', href: `${prefix.value}/app/credits/`, icon: 'wallet' },
  {
    id: 'activity',
    label: 'Activity',
    href: `${prefix.value}/app/profile/?section=activity`,
    icon: 'activity',
  },
  {
    id: 'logs',
    label: isVi.value ? 'Nhật ký' : 'Logs',
    href: `${prefix.value}/app/profile/?section=logs`,
    icon: 'logs',
  },
]);

function readProfileSectionFromLocation(): ProfileSection {
  if (typeof window === 'undefined') return 'general';
  const s = new URLSearchParams(window.location.search).get('section');
  if (s && PROFILE_SECTIONS.has(s as ProfileSection)) return s as ProfileSection;
  return 'general';
}

const profileSection = ref<ProfileSection>(readProfileSectionFromLocation());

const profileTabs = computed(() => [
  { id: 'general' as const, label: isVi.value ? 'Chung' : 'General' },
  { id: 'usage' as const, label: 'Usage' },
  { id: 'logs' as const, label: isVi.value ? 'Nhật ký' : 'Logs' },
  { id: 'api' as const, label: isVi.value ? 'API access' : 'API access' },
  { id: 'activity' as const, label: 'Activity' },
]);

function profileSectionHref(section: ProfileSection): string {
  return `${prefix.value}/app/profile/?section=${section}`;
}

function isProfileSectionActive(section: ProfileSection): boolean {
  return profileSection.value === section;
}

const curlSnippet = computed(() => {
  const t = token.value;
  if (!t) return '';
  return `curl -X POST "${apiBaseDisplay.value}/gateway/jobs/image" \\
  -H "Authorization: Bearer ${t}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"MODEL_ID","prompt":"Hello"}'`;
});

const apiBaseDisplay = computed(() => {
  if (import.meta.env.DEV) return 'http://localhost:3001';
  const env = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  return env?.replace(/\/$/, '') || 'https://api.yourdomain.com';
});

function isActive(id: string): boolean {
  return props.view === id;
}

function isImmersiveView(): boolean {
  return props.view === 'playground' || props.view === 'chat';
}

/** Playground + chat: browse without docs login (connect/send still needs token). */
function isPublicAppView(): boolean {
  return props.view === 'playground' || props.view === 'chat';
}

function isAccountNavActive(item: AppNavItem): boolean {
  if (!item.id) return false;
  if (item.id === 'credits') return props.view === 'credits';
  if (props.view !== 'profile') return false;
  const section = profileSection.value;
  if (item.id === 'activity') return section === 'activity';
  if (item.id === 'logs') return section === 'logs';
  if (item.id === 'profile') return section === 'general' || section === 'api' || section === 'usage';
  return false;
}

async function reloadUsagePanels() {
  if (profileSection.value === 'usage') {
    await usagePanelRef.value?.reloadRecords();
  }
  if (profileSection.value === 'logs') {
    await logsPanelRef.value?.reloadRecords();
  }
}

function readTokenCopiedFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(TOKEN_COPIED_STORAGE_KEY) === '1';
}

function markTokenCopied() {
  tokenCopiedEver.value = true;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_COPIED_STORAGE_KEY, '1');
  }
}

async function refreshProfile() {
  loadError.value = '';
  try {
    me.value = await fetchMe();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
}

async function refreshOverview() {
  await refreshProfile();
  await loadTopupOrders();
  await overviewUsageRef.value?.reload();
}

async function refreshTokenView() {
  await refreshProfile();
  await accessTokenRef.value?.reload();
}

async function refreshFilesView() {
  await refreshProfile();
  await filesPanelRef.value?.reload();
}

async function loadTopupOrders() {
  if (!username.value) {
    topupOrders.value = [];
    return;
  }
  ordersLoading.value = true;
  try {
    topupOrders.value = await fetchTopupOrders(username.value, 20);
  } catch {
    topupOrders.value = [];
  } finally {
    ordersLoading.value = false;
  }
}

async function loadCreditsView() {
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

function orderStatusClass(status: TopupOrderStatus): string {
  return `or-app-order-status--${status}`;
}

function onTopup(packageId: string) {
  if (!username.value) {
    packagesError.value = isVi.value ? 'Thiếu username — đăng nhập lại' : 'Missing username — sign in again';
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
  await refreshProfile();
  await loadTopupOrders();
}

async function copyToken() {
  if (!token.value) return;
  try {
    await navigator.clipboard.writeText(token.value);
    markTokenCopied();
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    /* ignore */
  }
}

async function copySnippet() {
  if (!curlSnippet.value) return;
  try {
    await navigator.clipboard.writeText(curlSnippet.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    /* ignore */
  }
}

async function loadProfileView() {
  profileSection.value = readProfileSectionFromLocation();
  await refreshProfile();
  await loadTopupOrders();
  await reloadUsagePanels();
}

onMounted(async () => {
  importSessionFromUrl();
  tokenCopiedEver.value = readTokenCopiedFlag();
  if (!getStoredToken()) {
    if (!isPublicAppView()) {
      const returnPath = route.path + (typeof window !== 'undefined' ? window.location.search : '');
      window.location.href = loginUrlWithRedirect(returnPath, prefix.value as '' | '/vi');
      return;
    }
    ready.value = true;
    return;
  }
  await refreshProfile();
  if (props.view === 'credits') {
    await loadCreditsView();
  }
  if (props.view === 'profile') {
    await loadProfileView();
  }
  if (props.view === 'overview') {
    await loadTopupOrders();
  }
  ready.value = true;
});

watch(
  () => route.fullPath,
  () => {
    if (props.view === 'profile') {
      profileSection.value = readProfileSectionFromLocation();
      if (profileSection.value === 'activity') {
        void loadTopupOrders();
      }
      void reloadUsagePanels();
    }
  },
);
</script>

<template>
  <div
    class="or-catalog or-app"
    :class="{
      'or-app-has-playground': isImmersiveView(),
      'or-app-chat-layout': view === 'chat',
      'or-app-playground-layout': view === 'playground',
    }"
  >
    <aside v-if="view !== 'chat' && view !== 'playground'" class="or-sidebar">
      <div class="or-app-workspace" aria-label="Workspace">
        <button type="button" class="or-app-workspace-btn" disabled>
          <span>{{ isVi ? 'Workspace mặc định' : 'Default workspace' }}</span>
          <AppNavIcon name="chevron" />
        </button>
      </div>

      <nav class="or-app-nav" aria-label="App">
        <p class="or-app-nav-label">{{ isVi ? 'Developer' : 'Developer' }}</p>
        <template v-for="item in navDeveloper" :key="item.label">
          <a
            v-if="item.href"
            :href="item.href"
            class="or-app-nav-link"
            :class="{ active: item.id && isActive(item.id) }"
          >
            <AppNavIcon :name="item.icon" />
            <span class="or-app-nav-text">{{ item.label }}</span>
            <span v-if="item.badge" class="or-app-nav-badge">{{ item.badge }}</span>
          </a>
        </template>

        <p class="or-app-nav-label or-app-nav-label-account">{{ isVi ? 'Account' : 'Account' }}</p>
        <template v-for="item in navAccount" :key="item.id || item.label">
          <a
            v-if="item.href && !item.disabled"
            :href="item.href"
            class="or-app-nav-link"
            :class="{ active: item.id ? (item.id === 'profile' || item.id === 'credits' || item.id === 'activity' || item.id === 'logs' ? isAccountNavActive(item) : isActive(item.id)) : false }"
          >
            <AppNavIcon :name="item.icon" />
            <span class="or-app-nav-text">{{ item.label }}</span>
          </a>
          <span
            v-else
            class="or-app-nav-link or-app-nav-link-disabled"
            :aria-disabled="true"
          >
            <AppNavIcon :name="item.icon" />
            <span class="or-app-nav-text">{{ item.label }}</span>
            <span v-if="item.badge" class="or-app-nav-badge">{{ item.badge }}</span>
          </span>
        </template>
      </nav>

      <div class="or-app-sidebar-foot">
        <p class="or-app-sidebar-credits">{{ formatCredits(credits) }} credits</p>
        <p v-if="username" class="or-app-sidebar-user">@{{ username }}</p>
      </div>
    </aside>

    <div class="or-main or-app-main" :class="{ 'or-app-main-playground': isImmersiveView() }">
      <header v-if="view !== 'chat' && view !== 'playground'" class="or-app-header">
        <div>
          <h1 class="or-app-title">
            <template v-if="view === 'overview'">{{ isVi ? 'Tổng quan' : 'Overview' }}</template>
            <template v-else-if="view === 'profile'">{{ isVi ? 'Hồ sơ' : 'Profile' }}</template>
            <template v-else-if="view === 'playground'">Playground</template>
            <template v-else-if="view === 'chat'">Chat</template>
            <template v-else-if="view === 'token'">Access token</template>
            <template v-else-if="view === 'files'">
              Files <span class="or-app-title-badge">beta</span>
            </template>
            <template v-else-if="view === 'credits'">{{ isVi ? 'Credits' : 'Credits' }}</template>
          </h1>
          <p v-if="view !== 'playground'" class="or-app-subtitle">
            <template v-if="view === 'overview'">
              {{
                isVi
                  ? 'Workspace gateway — credits, job và liên kết nhanh tới Playground, tài liệu.'
                  : 'Your gateway workspace — credits, jobs, and quick links to Playground and docs.'
              }}
            </template>
            <template v-else-if="view === 'profile'">
              <template v-if="profileSection === 'usage'">
                {{ isVi ? 'Thống kê usage và credit từ Gommo.' : 'Usage stats and credits from Gommo.' }}
              </template>
              <template v-else-if="profileSection === 'logs'">
                {{ isVi ? 'Nhật ký từng job từ usage-history.' : 'Per-job logs from usage-history.' }}
              </template>
              <template v-else-if="profileSection === 'activity'">
                {{ isVi ? 'Hoạt động tài khoản và nạp credit.' : 'Account activity and top-ups.' }}
              </template>
              <template v-else>
                {{
                  isVi
                    ? 'Thông tin tài khoản Gommo từ /ai/me.'
                    : 'Your Gommo account details from /ai/me.'
                }}
              </template>
            </template>
            <template v-else-if="view === 'token'">
              {{
                isVi
                  ? 'Credential console — token, trạng thái kết nối và snippet tích hợp.'
                  : 'Credential console — token, connection status, and integration snippets.'
              }}
            </template>
            <template v-else-if="view === 'files'">
              {{
                isVi
                  ? 'Upload ảnh/video và duyệt album Gommo — dùng URL trong job hoặc Playground.'
                  : 'Upload images and videos and browse your Gommo album — use URLs in jobs or Playground.'
              }}
            </template>
            <template v-else-if="view === 'credits'">
              {{
                isVi
                  ? 'Nạp credit qua Gommo (VietQR) — credits cộng tự động sau khi chuyển khoản.'
                  : 'Top up via Gommo (VietQR) — credits apply automatically after bank transfer.'
              }}
            </template>
          </p>
          <p v-else class="or-app-subtitle">
            {{
              isVi
                ? 'Tạo ảnh/video — catalog từ gateway, job async wait.'
                : 'Generate image/video — catalog from gateway, async wait jobs.'
            }}
          </p>
        </div>
        <div class="or-app-header-actions">
          <button
            v-if="view === 'profile'"
            type="button"
            class="or-app-btn or-app-btn-ghost"
            disabled
            title="Gommo profile is read-only via /ai/me"
          >
            {{ isVi ? 'Lưu thay đổi' : 'Save edits' }}
          </button>
          <span class="or-app-credits-pill">{{ formatCredits(credits) }} credits</span>
          <button
            type="button"
            class="or-app-btn or-app-btn-ghost"
            @click="
              view === 'profile'
                ? loadProfileView()
                : view === 'overview'
                  ? refreshOverview()
                  : view === 'token'
                    ? refreshTokenView()
                    : view === 'files'
                      ? refreshFilesView()
                      : refreshProfile()
            "
          >
            {{ isVi ? 'Làm mới' : 'Refresh' }}
          </button>
        </div>
      </header>

      <div v-if="!ready" class="or-app-loading">
        {{ isVi ? 'Đang tải…' : 'Loading…' }}
      </div>

      <div v-else-if="loadError && view !== 'playground' && view !== 'chat'" class="or-app-alert">{{ loadError }}</div>

      <template v-else>
        <!-- Playground embed -->
        <section v-if="view === 'playground'" class="or-app-playground-wrap">
          <ApiPlaygroundEmbed :locale="playgroundLocale" />
        </section>

        <!-- Chat -->
        <section v-else-if="view === 'chat'" class="or-app-chat-wrap">
          <AppChatPanel :credits="credits" :on-credits-refresh="refreshProfile" />
        </section>

        <!-- Overview -->
        <section v-else-if="view === 'overview'" class="or-app-section">
          <div class="or-app-hero or-app-hero--overview">
            <div class="or-app-profile-hero or-app-hero-profile">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt=""
                class="or-app-profile-hero-avatar or-app-profile-avatar-img"
              />
              <div v-else class="or-app-profile-hero-avatar">{{ profileInitials }}</div>
              <div class="or-app-profile-hero-text">
                <p class="or-app-hero-kicker">{{ isVi ? 'Xin chào' : 'Welcome back' }}</p>
                <h2 class="or-app-profile-hero-name">{{ displayName }}</h2>
                <p v-if="username" class="or-app-profile-hero-handle">@{{ username }}</p>
                <p class="or-app-hero-balance">
                  {{ isVi ? 'Số dư' : 'Balance' }}:
                  <strong>{{ formatCredits(credits) }}</strong> credits
                  <span v-if="creditsApproxUsd" class="or-app-hero-balance-usd">{{ creditsApproxUsd }}</span>
                </p>
              </div>
            </div>
            <div class="or-overview-hero-actions">
              <a :href="`${prefix}/app/playground/`" class="or-app-btn or-app-btn-primary">
                {{ isVi ? 'Mở Playground' : 'Open Playground' }}
              </a>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost"
                :disabled="!token"
                @click="copyToken"
              >
                {{ copied ? (isVi ? 'Đã copy!' : 'Copied!') : isVi ? 'Copy token' : 'Copy token' }}
              </button>
              <a
                v-if="creditsLow && !showLowCreditsBanner"
                :href="`${prefix}/app/credits/`"
                class="or-app-btn or-app-btn-ghost"
              >
                {{ isVi ? 'Nạp credits' : 'Top up credits' }}
              </a>
            </div>
          </div>

          <div v-if="showLowCreditsBanner" class="or-overview-banner or-overview-banner--warn" role="status">
            <p>
              {{
                isVi
                  ? `Số dư thấp (${formatCredits(credits)} credits) — nạp thêm để tránh job bị dừng giữa chừng.`
                  : `Low balance (${formatCredits(credits)} credits) — top up to avoid interrupted jobs.`
              }}
            </p>
            <a :href="`${prefix}/app/credits/`" class="or-overview-banner-link">
              {{ isVi ? 'Nạp ngay' : 'Top up' }} →
            </a>
          </div>

          <div v-if="showNoJobsBanner" class="or-overview-banner or-overview-banner--info" role="status">
            <p>
              {{
                isVi
                  ? 'Chưa có job trong 7 ngày qua — chạy thử image hoặc video trong Playground.'
                  : 'No jobs in the last 7 days — try an image or video job in Playground.'
              }}
            </p>
            <a :href="`${prefix}/app/playground/`" class="or-overview-banner-link">
              {{ isVi ? 'Mở Playground' : 'Open Playground' }} →
            </a>
          </div>

          <OverviewUsageSection
            ref="overviewUsageRef"
            :credits="credits"
            :is-vi="isVi"
            :prefix="prefix"
            @stats-loaded="onOverviewUsageStats"
          />

          <div class="or-overview-secondary">
            <OverviewRecentTopups
              :orders="overviewTopupPreview"
              :loading="ordersLoading"
              :is-vi="isVi"
              :prefix="prefix"
            />
            <OverviewOnboardingCard
              :is-vi="isVi"
              :prefix="prefix"
              :token-copied="tokenCopiedEver"
              :has-jobs="hasOverviewJobs"
            />
          </div>

          <h2 class="or-overview-links-title">{{ isVi ? 'Tài liệu' : 'Resources' }}</h2>
          <div class="or-app-grid or-app-grid--overview">
            <a :href="`${prefix}/quickstart`" class="or-app-card">
              <h3>Quickstart</h3>
              <p>{{ isVi ? 'Tích hợp gateway REST — login, models, tạo job.' : 'Gateway REST integration — login, models, create jobs.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Đọc hướng dẫn' : 'Read guide' }} →</span>
            </a>
            <a :href="`${prefix}/mcp/`" class="or-app-card">
              <h3>{{ isVi ? 'MCP (Cursor & IDE)' : 'MCP (Cursor & IDE)' }}</h3>
              <p>
                {{
                  isVi
                    ? '10 tools ảnh/video — cấu hình Cursor, Claude Desktop.'
                    : '10 image/video tools — set up Cursor, Claude Desktop.'
                }}
              </p>
              <span class="or-app-card-cta">{{ isVi ? 'Cấu hình MCP' : 'Set up MCP' }} →</span>
            </a>
            <a :href="`${prefix}/authentication`" class="or-app-card">
              <h3>{{ isVi ? 'Authentication' : 'Authentication' }}</h3>
              <p>{{ isVi ? 'Bearer token, domain Gommo, và các mode tích hợp.' : 'Bearer token, Gommo domain, and integration modes.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Xem auth' : 'View auth' }} →</span>
            </a>
          </div>
        </section>

        <!-- Profile -->
        <section v-else-if="view === 'profile'" class="or-app-section or-app-profile">
          <div class="or-app-profile-hero">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt=""
              class="or-app-profile-hero-avatar or-app-profile-avatar-img"
            />
            <div v-else class="or-app-profile-hero-avatar">{{ profileInitials }}</div>
            <div class="or-app-profile-hero-text">
              <h2 class="or-app-profile-hero-name">{{ displayName }}</h2>
              <p v-if="email" class="or-app-profile-hero-email">{{ email }}</p>
              <p v-if="username" class="or-app-profile-hero-handle">@{{ username }}</p>
            </div>
          </div>

          <nav class="or-app-profile-tabs" aria-label="Profile sections">
            <a
              v-for="tab in profileTabs"
              :key="tab.id"
              :href="profileSectionHref(tab.id)"
              class="or-app-profile-tab"
              :class="{ active: isProfileSectionActive(tab.id) }"
            >
              {{ tab.label }}
            </a>
          </nav>

          <!-- General -->
          <div v-if="profileSection === 'general'" class="or-app-profile-panel">
            <dl class="or-app-profile-dl">
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
            <div class="or-app-profile-actions">
              <a :href="`${prefix}/app/credits/`" class="or-app-btn or-app-btn-primary">
                {{ isVi ? 'Nạp credits' : 'Top up credits' }}
              </a>
              <a :href="profileSectionHref('api')" class="or-app-btn or-app-btn-ghost">
                {{ isVi ? 'API access' : 'API access' }}
              </a>
              <a :href="`${prefix}/authentication`" class="or-app-btn or-app-btn-ghost">
                {{ isVi ? 'Tài liệu auth' : 'Auth docs' }}
              </a>
            </div>
          </div>

          <!-- Usage -->
          <div v-else-if="profileSection === 'usage'" class="or-app-profile-panel">
            <ProfileUsagePanel
              ref="usagePanelRef"
              :credits="credits"
              :is-vi="isVi"
              :prefix="prefix"
            />
          </div>

          <!-- API access -->
          <div v-else-if="profileSection === 'api'" class="or-app-profile-panel">
            <div class="or-app-panel or-token-profile-shortcut">
              <h3 class="or-app-panel-title">{{ isVi ? 'Gommo Bearer token' : 'Gommo Bearer token' }}</h3>
              <p class="or-app-panel-desc">
                {{
                  isVi
                    ? 'Một session token cho /gateway/* — snippet, health check và MCP trên trang Access token.'
                    : 'One session token for /gateway/* — snippets, health checks, and MCP on the Access token page.'
                }}
              </p>
              <div class="or-app-token-row">
                <code class="or-app-token-value">{{ maskedToken }}</code>
                <button type="button" class="or-app-btn or-app-btn-ghost" @click="copyToken">
                  {{ copied ? (isVi ? 'Đã copy' : 'Copied') : isVi ? 'Copy' : 'Copy' }}
                </button>
              </div>
              <div class="or-token-profile-shortcut-actions">
                <a :href="`${prefix}/app/token/`" class="or-app-btn or-app-btn-primary">
                  {{ isVi ? 'Mở Access token' : 'Open Access token' }} →
                </a>
                <a :href="`${prefix}/authentication`" class="or-app-btn or-app-btn-ghost">
                  {{ isVi ? 'Tài liệu auth' : 'Auth docs' }}
                </a>
              </div>
            </div>
          </div>

          <!-- Logs -->
          <div v-else-if="profileSection === 'logs'" class="or-app-profile-panel">
            <ProfileUsagePanel
              ref="logsPanelRef"
              mode="logs"
              :credits="credits"
              :is-vi="isVi"
              :prefix="prefix"
            />
          </div>

          <!-- Activity -->
          <div v-else-if="profileSection === 'activity'" class="or-app-profile-panel">
            <ProfileActivityPanel
              :is-vi="isVi"
              :prefix="prefix"
              :credits="credits"
              :topup-orders="topupOrders"
              :orders-loading="ordersLoading"
              @refresh="loadTopupOrders"
            />
          </div>

          <div v-else class="or-app-profile-panel or-app-profile-panel--fallback">
            <p class="or-app-muted">
              <a :href="profileSectionHref('general')">{{ isVi ? 'Về tab Chung' : 'Go to General' }}</a>
            </p>
          </div>
        </section>

        <!-- Token -->
        <section v-else-if="view === 'token'" class="or-app-section or-app-section--token">
          <AccessTokenPanel
            ref="accessTokenRef"
            :is-vi="isVi"
            :prefix="prefix"
            :token="token"
            :masked-token="maskedToken"
            :display-name="displayName"
            :username="username"
            :credits="credits"
            :domain="loginDomain"
            @token-copied="markTokenCopied"
          />
        </section>

        <!-- Files -->
        <section v-else-if="view === 'files'" class="or-app-section or-app-section--files">
          <FilesPanel ref="filesPanelRef" :is-vi="isVi" :prefix="prefix" />
        </section>

        <!-- Credits -->
        <section v-else-if="view === 'credits'" class="or-app-section">
          <p v-if="!billingReady" class="or-app-alert or-app-alert-warn">
            {{
              isVi
                ? 'Billing Gommo chưa sẵn sàng — xem GET /billing/status.'
                : 'Gommo billing not ready — see GET /billing/status.'
            }}
          </p>

          <p v-if="packagesLoading" class="or-app-muted">
            {{ isVi ? 'Đang tải gói…' : 'Loading packages…' }}
          </p>
          <p v-else-if="packagesError" class="or-app-alert">{{ packagesError }}</p>

          <div v-else-if="packages.length === 0" class="or-app-panel or-app-empty">
            {{ isVi ? 'Chưa có gói credit.' : 'No credit packages available.' }}
          </div>

          <div v-else class="or-app-pkg-grid">
            <article
              v-for="pkg in packages"
              :key="pkg.id"
              class="or-app-pkg"
              :class="{ featured: pkg.featured }"
            >
              <span v-if="pkg.featured" class="or-app-pkg-ribbon">
                {{ isVi ? 'BEST' : 'BEST' }}
              </span>
              <div class="or-app-pkg-head">
                <h3>{{ pkg.name }}</h3>
                <span v-if="pkg.bonusPercent > 0" class="or-app-pkg-badge">
                  +{{ pkg.bonusPercent }}% {{ isVi ? 'Thưởng' : 'Bonus' }}
                </span>
              </div>
              <p class="or-app-pkg-price">
                {{ pkg.amountVnd.toLocaleString(isVi ? 'vi-VN' : 'en-US') }} ₫
                <template v-if="!isVi"> · {{ formatApproxUsd(pkg.amountVnd) }}</template>
              </p>
              <p class="or-app-pkg-credits">{{ formatCredits(pkg.credits) }} credits</p>
              <p class="or-app-pkg-vat">{{ formatPayTotalLine(pkg.amountVnd, isVi) }}</p>
              <button
                type="button"
                class="or-app-btn"
                :class="pkg.featured ? 'or-app-btn-accent' : 'or-app-btn-ghost'"
                @click="onTopup(pkg.id)"
              >
                {{ isVi ? 'Nạp ngay' : 'Top up' }}
              </button>
            </article>
          </div>

          <CreditsCheckoutModal
            :open="checkoutOpen"
            :pkg="checkoutPackage"
            :username="username"
            :default-email="email"
            :is-vi="isVi"
            @close="closeCheckout"
            @paid="onCheckoutPaid"
            @toast="onCheckoutToast"
          />

          <p v-if="checkoutToast" class="or-checkout-toast" role="status">{{ checkoutToast }}</p>

          <div class="or-app-panel or-app-orders">
            <div class="or-app-orders-head">
              <h3 class="or-app-panel-title">
                {{ isVi ? 'Lịch sử nạp' : 'Top-up history' }}
              </h3>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :disabled="ordersLoading"
                @click="loadTopupOrders"
              >
                {{ ordersLoading ? (isVi ? 'Đang tải…' : 'Loading…') : isVi ? 'Làm mới' : 'Refresh' }}
              </button>
            </div>

            <p v-if="ordersLoading && topupOrders.length === 0" class="or-app-muted">
              {{ isVi ? 'Đang tải lịch sử…' : 'Loading history…' }}
            </p>
            <p v-else-if="visibleTopupOrders.length === 0" class="or-app-muted or-app-orders-empty">
              {{
                isVi
                  ? 'Chưa có đơn nạp. Tạo đơn VietQR ở trên để bắt đầu.'
                  : 'No top-ups yet. Create a VietQR order above to get started.'
              }}
            </p>

            <div v-else class="or-app-orders-table-wrap">
              <table class="or-app-orders-table">
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
                  <tr v-for="order in visibleTopupOrders" :key="order.orderCode">
                    <td><code>#{{ order.orderCode }}</code></td>
                    <td>{{ formatCredits(order.credits) }}</td>
                    <td>
                      {{ order.amountVnd.toLocaleString(isVi ? 'vi-VN' : 'en-US') }} ₫
                    </td>
                    <td>
                      <span
                        class="or-app-order-status"
                        :class="orderStatusClass(order.status)"
                      >
                        {{ formatTopupOrderStatus(order.status, isVi) }}
                      </span>
                    </td>
                    <td class="or-app-orders-date">
                      {{ formatOrderDate(order.createdAt, isVi) }}
                    </td>
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
                  ? isVi
                    ? 'Ẩn đơn chờ cũ'
                    : 'Hide stale pending'
                  : isVi
                    ? `Hiện thêm ${hiddenPendingCount} đơn chờ cũ`
                    : `Show ${hiddenPendingCount} stale pending`
              }}
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
