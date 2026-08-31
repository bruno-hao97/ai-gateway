<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useData, useRoute } from 'vitepress';
import { getStoredToken, getStoredDomain, importSessionFromUrl, loginUrlWithRedirect } from '../models/auth-api';
import { playgroundEmbedUrl, playgroundOrigin, playgroundUrl } from '../models/gateway-base';
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
import { appendUsageRecord, type UsageJobType } from '../models/usage-history';
import AppNavIcon from './AppNavIcon.vue';
import CreditsCheckoutModal from './CreditsCheckoutModal.vue';
import ProfileUsagePanel from './ProfileUsagePanel.vue';
import ProfileActivityPanel from './ProfileActivityPanel.vue';
import { formatApproxUsd, formatPayTotalLine } from '../models/invoice-buyer';

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

const props = defineProps<{
  view: 'overview' | 'profile' | 'playground' | 'token' | 'credits';
}>();

const { lang } = useData();
const route = useRoute();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));

function readEmbedQueryFromLocation(): { type?: string; model?: string; panel?: string } {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  return {
    type: q.get('type') || undefined,
    model: q.get('model') || undefined,
    panel: q.get('panel') || undefined,
  };
}

const embedQuery = ref(readEmbedQueryFromLocation());

const ready = ref(false);
const me = ref<MeResponse | null>(getCachedMe());
const loadError = ref('');
const copied = ref(false);

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
const playgroundFrame = ref<HTMLIFrameElement | null>(null);
const usagePanelRef = ref<InstanceType<typeof ProfileUsagePanel> | null>(null);
const logsPanelRef = ref<InstanceType<typeof ProfileUsagePanel> | null>(null);

const embedSrc = computed(() => playgroundEmbedUrl(embedQuery.value));
const playgroundExternalUrl = computed(() => playgroundUrl());

const credits = computed(() => getCredits(me.value));
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
  { id: 'playground', label: 'Playground', href: `${prefix.value}/app/playground/`, icon: 'terminal' },
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

async function refreshProfile() {
  loadError.value = '';
  try {
    me.value = await fetchMe();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
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

function sendTokenToPlayground() {
  const iframe = playgroundFrame.value;
  const origin = playgroundOrigin();
  const t = getStoredToken();
  if (!iframe?.contentWindow || !origin || !t) return;
  iframe.contentWindow.postMessage(
    { type: 'ai-gateway-token', token: t, domain: getStoredDomain() },
    origin,
  );
}

function onPlaygroundLoad() {
  sendTokenToPlayground();
  window.setTimeout(sendTokenToPlayground, 300);
}

async function loadProfileView() {
  profileSection.value = readProfileSectionFromLocation();
  await refreshProfile();
  await loadTopupOrders();
  await reloadUsagePanels();
}

function onPlaygroundUsageMessage(event: MessageEvent) {
  const origin = playgroundOrigin();
  if (origin && event.origin !== origin) return;
  const data = event.data;
  if (!data || data.type !== 'ai-gateway-usage' || !data.record) return;
  const r = data.record as {
    jobType?: UsageJobType;
    model?: string;
    prompt?: string;
    status?: 'success' | 'failed' | 'pending';
    credits?: number | null;
    jobId?: string;
    resultUrl?: string;
  };
  appendUsageRecord({
    jobType: r.jobType || 'other',
    model: r.model || '—',
    prompt: r.prompt || '',
    status: r.status || 'success',
    credits: r.credits ?? null,
    jobId: r.jobId,
    resultUrl: r.resultUrl,
    source: 'playground',
  });
}

onMounted(async () => {
  importSessionFromUrl();
  if (props.view === 'playground') {
    embedQuery.value = readEmbedQueryFromLocation();
  }
  if (!getStoredToken()) {
    const returnPath = route.path + (typeof window !== 'undefined' ? window.location.search : '');
    window.location.href = loginUrlWithRedirect(returnPath, prefix.value as '' | '/vi');
    return;
  }
  await refreshProfile();
  if (props.view === 'credits') {
    await loadCreditsView();
  }
  if (props.view === 'profile') {
    await loadProfileView();
  }
  ready.value = true;
  window.addEventListener('message', onPlaygroundUsageMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', onPlaygroundUsageMessage);
});

watch(
  () => route.fullPath,
  () => {
    if (props.view === 'playground') {
      embedQuery.value = readEmbedQueryFromLocation();
    }
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
  <div class="or-catalog or-app" :class="{ 'or-app-has-playground': view === 'playground' }">
    <aside class="or-sidebar">
      <div class="or-app-brand">
        <a :href="`${prefix}/app/`" class="or-app-brand-link">
          <span class="or-app-logo">⬡</span>
          <span class="or-app-brand-title">AI Gateway</span>
        </a>
      </div>

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

    <div class="or-main or-app-main" :class="{ 'or-app-main-playground': view === 'playground' }">
      <header class="or-app-header">
        <div>
          <h1 class="or-app-title">
            <template v-if="view === 'overview'">{{ isVi ? 'Tổng quan' : 'Overview' }}</template>
            <template v-else-if="view === 'profile'">{{ isVi ? 'Hồ sơ' : 'Profile' }}</template>
            <template v-else-if="view === 'playground'">Playground</template>
            <template v-else-if="view === 'token'">Access token</template>
            <template v-else>{{ isVi ? 'Credits' : 'Credits' }}</template>
          </h1>
          <p v-if="view !== 'playground'" class="or-app-subtitle">
            <template v-if="view === 'overview'">
              {{
                isVi
                  ? 'Quản lý tài khoản và truy cập nhanh tới models, playground, billing.'
                  : 'Manage your account and jump to models, playground, and billing.'
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
                  ? 'Bearer token Gommo — dùng cho /gateway/* và proxy.'
                  : 'Your Gommo Bearer token for /gateway/* and proxy routes.'
              }}
            </template>
            <template v-else>
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
                ? 'Thử jobs, chat, upload — token được đồng bộ từ dashboard.'
                : 'Try jobs, chat, upload — token syncs from your dashboard session.'
            }}
          </p>
        </div>
        <div class="or-app-header-actions">
          <a
            v-if="view === 'playground'"
            :href="playgroundExternalUrl"
            target="_blank"
            rel="noreferrer"
            class="or-app-btn or-app-btn-ghost"
          >
            {{ isVi ? 'Mở tab mới' : 'Open in new tab' }} ↗
          </a>
          <button
            v-if="view === 'profile'"
            type="button"
            class="or-app-btn or-app-btn-ghost"
            disabled
            title="Gommo profile is read-only via /ai/me"
          >
            {{ isVi ? 'Lưu thay đổi' : 'Save edits' }}
          </button>
          <span v-if="view !== 'playground'" class="or-app-credits-pill">{{ formatCredits(credits) }} credits</span>
          <button
            v-if="view !== 'playground'"
            type="button"
            class="or-app-btn or-app-btn-ghost"
            @click="view === 'profile' ? loadProfileView() : refreshProfile()"
          >
            {{ isVi ? 'Làm mới' : 'Refresh' }}
          </button>
        </div>
      </header>

      <div v-if="!ready" class="or-app-loading">
        {{ isVi ? 'Đang tải…' : 'Loading…' }}
      </div>

      <div v-else-if="loadError && view !== 'playground'" class="or-app-alert">{{ loadError }}</div>

      <template v-else>
        <!-- Playground embed -->
        <section v-if="view === 'playground'" class="or-app-playground-wrap">
          <iframe
            ref="playgroundFrame"
            :src="embedSrc"
            class="or-app-playground-frame"
            title="AI Gateway Playground"
            @load="onPlaygroundLoad"
          />
        </section>

        <!-- Overview -->
        <section v-else-if="view === 'overview'" class="or-app-section">
          <div class="or-app-hero">
            <p class="or-app-hero-kicker">{{ isVi ? 'Xin chào' : 'Welcome back' }}</p>
            <h2 class="or-app-hero-name">{{ displayName }}</h2>
            <p class="or-app-hero-balance">
              {{ isVi ? 'Số dư' : 'Balance' }}:
              <strong>{{ formatCredits(credits) }}</strong> credits
            </p>
          </div>

          <div class="or-app-grid">
            <a :href="`${prefix}/models/`" class="or-app-card">
              <h3>{{ isVi ? 'Models catalog' : 'Models catalog' }}</h3>
              <p>{{ isVi ? 'Duyệt model image, video, chat…' : 'Browse image, video, chat models…' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Mở catalog' : 'Open catalog' }} →</span>
            </a>
            <a :href="`${prefix}/models/compare/`" class="or-app-card">
              <h3>{{ isVi ? 'So sánh models' : 'Compare models' }}</h3>
              <p>{{ isVi ? 'Credits và metadata side-by-side.' : 'Credits and metadata side-by-side.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'So sánh' : 'Compare' }} →</span>
            </a>
            <a :href="`${prefix}/app/playground/`" class="or-app-card">
              <h3>Playground</h3>
              <p>{{ isVi ? 'Thử job, chat, upload trong portal.' : 'Try jobs, chat, upload in the portal.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Mở playground' : 'Open playground' }} →</span>
            </a>
            <a :href="`${prefix}/app/credits/`" class="or-app-card">
              <h3>{{ isVi ? 'Nạp credits' : 'Top up credits' }}</h3>
              <p>{{ isVi ? 'Gói credit qua Gommo.' : 'Credit packages via Gommo.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Wallet' : 'Wallet' }} →</span>
            </a>
            <a :href="`${prefix}/app/token/`" class="or-app-card">
              <h3>Access token</h3>
              <p>{{ isVi ? 'Copy Bearer cho API client.' : 'Copy Bearer for your API client.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Xem token' : 'View token' }} →</span>
            </a>
            <a :href="`${prefix}/app/profile/?section=usage`" class="or-app-card">
              <h3>Usage</h3>
              <p>{{ isVi ? 'Thống kê credit và lịch sử job.' : 'Credit stats and job history.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Xem usage' : 'View usage' }} →</span>
            </a>
            <a :href="`${prefix}/app/profile/`" class="or-app-card">
              <h3>{{ isVi ? 'Hồ sơ' : 'Profile' }}</h3>
              <p>{{ isVi ? 'Email, username và số dư credit.' : 'Email, username, and credit balance.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Xem hồ sơ' : 'View profile' }} →</span>
            </a>
            <a :href="`${prefix}/quickstart`" class="or-app-card">
              <h3>Quickstart</h3>
              <p>{{ isVi ? 'Hướng dẫn tích hợp gateway REST.' : 'Gateway REST integration guide.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Đọc docs' : 'Read docs' }} →</span>
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
            <div class="or-app-panel">
              <h3 class="or-app-panel-title">{{ isVi ? 'Gommo Bearer token' : 'Gommo Bearer token' }}</h3>
              <p class="or-app-panel-desc">
                {{
                  isVi
                    ? 'Một access token cho /gateway/* — không phải nhiều API keys như OpenRouter.'
                    : 'One access token for /gateway/* — not multiple platform API keys.'
                }}
              </p>
              <div class="or-app-token-row">
                <code class="or-app-token-value">{{ maskedToken }}</code>
                <button type="button" class="or-app-btn or-app-btn-primary" @click="copyToken">
                  {{ copied ? (isVi ? 'Đã copy' : 'Copied') : isVi ? 'Copy token' : 'Copy token' }}
                </button>
              </div>
            </div>
            <div class="or-app-panel">
              <h3 class="or-app-panel-title">curl</h3>
              <pre class="or-app-code"><code>{{ curlSnippet }}</code></pre>
              <button type="button" class="or-app-btn or-app-btn-ghost" @click="copySnippet">
                {{ isVi ? 'Copy curl' : 'Copy curl' }}
              </button>
            </div>
            <p class="or-app-muted">
              <a :href="`${prefix}/app/token/`">{{ isVi ? 'Trang Access token đầy đủ' : 'Full Access token page' }}</a>
              ·
              <a :href="`${prefix}/authentication`">{{ isVi ? 'Tài liệu auth' : 'Auth docs' }}</a>
            </p>
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
        <section v-else-if="view === 'token'" class="or-app-section">
          <div class="or-app-panel">
            <h3 class="or-app-panel-title">{{ isVi ? 'Bearer token' : 'Bearer token' }}</h3>
            <p class="or-app-panel-desc">
              {{
                isVi
                  ? 'Gửi header Authorization: Bearer <token> cho /gateway/jobs, chat, upload…'
                  : 'Send Authorization: Bearer <token> for /gateway/jobs, chat, upload…'
              }}
            </p>
            <div class="or-app-token-row">
              <code class="or-app-token-value">{{ maskedToken }}</code>
              <button type="button" class="or-app-btn or-app-btn-primary" @click="copyToken">
                {{ copied ? (isVi ? 'Đã copy' : 'Copied') : isVi ? 'Copy token' : 'Copy token' }}
              </button>
            </div>
          </div>

          <div class="or-app-panel">
            <h3 class="or-app-panel-title">curl</h3>
            <pre class="or-app-code"><code>{{ curlSnippet }}</code></pre>
            <button type="button" class="or-app-btn or-app-btn-ghost" @click="copySnippet">
              {{ isVi ? 'Copy curl' : 'Copy curl' }}
            </button>
          </div>
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
