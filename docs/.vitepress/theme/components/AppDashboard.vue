<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vitepress';
import { useVitepressUrlSync } from '../composables/use-vitepress-url-sync';
import type { PlaygroundPortalLocale } from '../models/playground-locale-bridge';
import { useHybridLocale } from '../composables/use-hybrid-locale';
import { getStoredToken, getStoredDomain, importSessionFromUrl, loginUrlWithRedirect } from '../models/auth-api';
import {
  fetchMe,
  fetchTopupOrders,
  formatCredits,
  getCachedMe,
  getCredits,
  getDisplayName,
  getEmail,
  getAvatarUrl,
  getUsername,
  type MeResponse,
  type TopupOrder,
} from '../models/user-api';
import AppNavIcon from './AppNavIcon.vue';
import AppChatPanel from './AppChatPanel.vue';
import ApiPlaygroundEmbed from './ApiPlaygroundEmbed.vue';
import CreditsPanel from './CreditsPanel.vue';
import ProfileLandingPanel from './ProfileLandingPanel.vue';
import ActivityHub from './ActivityHub.vue';
import OverviewUsageSection from './OverviewUsageSection.vue';
import OverviewRecentTopups from './OverviewRecentTopups.vue';
import OverviewOnboardingCard from './OverviewOnboardingCard.vue';
import AccessTokenPanel from './AccessTokenPanel.vue';
import ByokPanel from './ByokPanel.vue';
import FilesPanel from './FilesPanel.vue';
import ObservabilityPanel from './ObservabilityPanel.vue';
import { activityHubHref, PROFILE_USAGE_PREVIEW_PERIOD } from '../models/activity-hub-url';
import { formatApproxUsd } from '../models/invoice-buyer';
import { PORTAL_LOW_CREDITS_THRESHOLD } from '../models/portal-credits';

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

const LOW_CREDITS_THRESHOLD = PORTAL_LOW_CREDITS_THRESHOLD;

type OverviewUsageStats = {
  totalJobs: number;
  loaded: boolean;
  hasError: boolean;
};

const props = defineProps<{
  view:
    | 'overview'
    | 'profile'
    | 'playground'
    | 'chat'
    | 'token'
    | 'credits'
    | 'files'
    | 'byok'
    | 'observability'
    | 'activity';
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
const profileLandingRef = ref<InstanceType<typeof ProfileLandingPanel> | null>(null);
const creditsPanelRef = ref<InstanceType<typeof CreditsPanel> | null>(null);
const activityHubRef = ref<InstanceType<typeof ActivityHub> | null>(null);
const overviewUsageRef = ref<InstanceType<typeof OverviewUsageSection> | null>(null);
const accessTokenRef = ref<InstanceType<typeof AccessTokenPanel> | null>(null);
const byokPanelRef = ref<InstanceType<typeof ByokPanel> | null>(null);
const filesPanelRef = ref<InstanceType<typeof FilesPanel> | null>(null);
const observabilityPanelRef = ref<InstanceType<typeof ObservabilityPanel> | null>(null);
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

const overviewActivityHref = computed(() =>
  activityHubHref(prefix.value, { period: PROFILE_USAGE_PREVIEW_PERIOD }),
);

const creditsHref = computed(() => `${prefix.value}/app/credits/`);

const overviewWorkspaceCards = computed(() => [
  {
    id: 'activity',
    title: 'Activity',
    desc: isVi.value
      ? 'Usage, trends, job logs và billing — analytics đầy đủ.'
      : 'Usage, trends, job logs, and billing — full analytics.',
    href: overviewActivityHref.value,
    cta: isVi.value ? 'Mở Activity' : 'Open Activity',
  },
  {
    id: 'token',
    title: isVi.value ? 'Access token' : 'Access token',
    desc: isVi.value
      ? 'Bearer token, snippet Gateway và kiểm tra kết nối.'
      : 'Bearer token, Gateway snippets, and connection checks.',
    href: `${prefix.value}/app/token/`,
    cta: isVi.value ? 'Mở token' : 'Open token',
  },
  {
    id: 'credits',
    title: isVi.value ? 'Credits' : 'Credits',
    desc: isVi.value
      ? 'Nạp VietQR, KPI số dư và lịch sử đơn — credits cộng tự động.'
      : 'VietQR top-up, balance KPIs, and order history — credits apply automatically.',
    href: `${prefix.value}/app/credits/`,
    cta: isVi.value ? 'Nạp credits' : 'Top up',
  },
  {
    id: 'byok',
    title: 'BYOK',
    badge: 'beta',
    desc: isVi.value
      ? 'Provider key cho chat, link Gommo cho media — hybrid BYOK.'
      : 'Provider keys for chat, linked Gommo for media — hybrid BYOK.',
    href: `${prefix.value}/app/byok/`,
    cta: isVi.value ? 'Mở BYOK' : 'Open BYOK',
  },
  {
    id: 'files',
    title: isVi.value ? 'Files' : 'Files',
    badge: 'beta',
    desc: isVi.value
      ? 'Upload ảnh/video và album Gommo — copy URL cho jobs.'
      : 'Upload images/videos and Gommo album — copy URLs for jobs.',
    href: `${prefix.value}/app/files/`,
    cta: isVi.value ? 'Mở Files' : 'Open Files',
  },
  {
    id: 'observability',
    title: 'Observability',
    badge: 'beta',
    desc: isVi.value
      ? 'Webhook job (beta), mirror local và usage Gommo.'
      : 'Job webhooks (beta), local mirror, and Gommo usage.',
    href: `${prefix.value}/app/observability/`,
    cta: isVi.value ? 'Mở Observability' : 'Open Observability',
  },
]);

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
  {
    id: 'observability',
    label: 'Observability',
    href: `${prefix.value}/app/observability/`,
    icon: 'observability',
    badge: 'beta',
  },
  {
    id: 'byok',
    label: 'BYOK',
    href: `${prefix.value}/app/byok/`,
    icon: 'key',
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
    href: `${prefix.value}/app/activity/`,
    icon: 'activity',
  },
  {
    id: 'logs',
    label: isVi.value ? 'Nhật ký' : 'Logs',
    href: `${prefix.value}/app/activity/?tab=explore`,
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

function profileSectionHref(section: ProfileSection): string {
  return `${prefix.value}/app/profile/?section=${section}`;
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

function readProfileHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash;
}

function readActivityTab(): string {
  if (typeof window === 'undefined') return 'overview';
  return new URLSearchParams(window.location.search).get('tab') || 'overview';
}

function redirectLegacyProfileSection(section: ProfileSection): boolean {
  if (typeof window === 'undefined') return false;
  if (section === 'usage') {
    window.location.replace(`${prefix.value}/app/activity/?tab=trends`);
    return true;
  }
  if (section === 'logs') {
    window.location.replace(`${prefix.value}/app/activity/?tab=explore`);
    return true;
  }
  if (section === 'activity') {
    window.location.replace(`${prefix.value}/app/activity/`);
    return true;
  }
  return false;
}

function isAccountNavActive(item: AppNavItem): boolean {
  if (!item.id) return false;
  if (item.id === 'credits') return props.view === 'credits';
  if (item.id === 'activity') {
    return props.view === 'activity' && readActivityTab() !== 'explore';
  }
  if (item.id === 'logs') {
    return props.view === 'activity' && readActivityTab() === 'explore';
  }
  if (props.view !== 'profile') return false;
  if (item.id === 'profile') return profileSection.value === 'general';
  return false;
}

function scrollProfileHash() {
  if (profileSection.value !== 'general' || typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (!hash) return;
  requestAnimationFrame(() => {
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function reloadUsagePanels() {
  if (profileSection.value === 'general') {
    await profileLandingRef.value?.reload();
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

async function refreshByokView() {
  await refreshProfile();
  await byokPanelRef.value?.reload();
}

async function refreshObservabilityView() {
  await refreshProfile();
  await observabilityPanelRef.value?.reload();
}

async function refreshActivityView() {
  await refreshProfile();
  await loadTopupOrders();
  await activityHubRef.value?.reload();
}

async function refreshCreditsView() {
  await refreshProfile();
  await creditsPanelRef.value?.reload();
  await loadTopupOrders();
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

async function onCreditsPaid() {
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
  if (redirectLegacyProfileSection(profileSection.value)) return;
  await refreshProfile();
  await loadTopupOrders();
  await reloadUsagePanels();
  scrollProfileHash();
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
  if (props.view === 'profile') {
    await loadProfileView();
  }
  if (props.view === 'activity') {
    await refreshActivityView();
  }
  if (props.view === 'overview') {
    await loadTopupOrders();
  }
  ready.value = true;
});

function syncDashboardFromLocation() {
  if (props.view === 'profile') {
    profileSection.value = readProfileSectionFromLocation();
    if (redirectLegacyProfileSection(profileSection.value)) return;
    if (profileSection.value === 'general') {
      void loadTopupOrders();
    }
    void reloadUsagePanels();
    scrollProfileHash();
  }
  if (props.view === 'activity') {
    void refreshActivityView();
  }
}

useVitepressUrlSync(syncDashboardFromLocation);
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
        <a :href="creditsHref" class="or-app-sidebar-credits or-app-sidebar-credits-link">
          {{ formatCredits(credits) }} credits
        </a>
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
            <template v-else-if="view === 'byok'">
              BYOK <span class="or-app-title-badge">beta</span>
            </template>
            <template v-else-if="view === 'observability'">
              Observability <span class="or-app-title-badge">beta</span>
            </template>
            <template v-else-if="view === 'activity'">Activity</template>
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
              <template v-if="profileSection === 'api'">
                {{ isVi ? 'Bearer token và liên kết Access token.' : 'Bearer token and Access token shortcuts.' }}
              </template>
              <template v-else>
                {{
                  isVi
                    ? 'Xem trước usage, activity và API access — mở Activity để phân tích đầy đủ.'
                    : 'Usage preview, activity summary, and API access — open Activity for full analytics.'
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
            <template v-else-if="view === 'byok'">
              {{
                isVi
                  ? 'Beta — mang key provider cho chat; Gommo account cho media. Map model và phí platform có thể thay đổi.'
                  : 'Beta — bring provider keys for chat; Gommo accounts for media. Model map and platform fees may change.'
              }}
            </template>
            <template v-else-if="view === 'observability'">
              {{
                isVi
                  ? 'Beta — usage Gommo, mirror local và webhook job (giới hạn; xem ghi chú trên trang).'
                  : 'Beta — Gommo usage, local mirror, and job webhooks (limited scope; see on-page notes).'
              }}
            </template>
            <template v-else-if="view === 'activity'">
              {{
                isVi
                  ? 'Job và credit trên gateway — Overview, Trends, Explore, Billing.'
                  : 'Jobs and credits on the gateway — Overview, Trends, Explore, Billing.'
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
          <a :href="creditsHref" class="or-app-credits-pill">{{ formatCredits(credits) }} credits</a>
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
                      : view === 'byok'
                        ? refreshByokView()
                        : view === 'observability'
                          ? refreshObservabilityView()
                          : view === 'activity'
                            ? refreshActivityView()
                            : view === 'credits'
                              ? refreshCreditsView()
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
              <a :href="overviewActivityHref" class="or-app-btn or-app-btn-ghost">
                {{ isVi ? 'Activity' : 'Activity' }}
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

          <h2 class="or-overview-links-title">{{ isVi ? 'Workspace' : 'Workspace' }}</h2>
          <div class="or-app-grid or-app-grid--overview or-overview-workspace">
            <a
              v-for="card in overviewWorkspaceCards"
              :key="card.id"
              :href="card.href"
              class="or-app-card"
            >
              <h3>
                {{ card.title }}
                <span v-if="card.badge" class="or-app-title-badge">{{ card.badge }}</span>
              </h3>
              <p>{{ card.desc }}</p>
              <span class="or-app-card-cta">{{ card.cta }} →</span>
            </a>
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
            <a :href="`${prefix}/guides/portal-smoke`" class="or-app-card">
              <h3>{{ isVi ? 'Portal smoke test' : 'Portal smoke test' }}</h3>
              <p>
                {{
                  isVi
                    ? 'Checklist một lần chạy sau đổi UI portal — Activity, BYOK, Credits…'
                    : 'One-pass checklist after portal UI changes — Activity, BYOK, Credits…'
                }}
              </p>
              <span class="or-app-card-cta">{{ isVi ? 'Mở checklist' : 'Open checklist' }} →</span>
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

          <ProfileLandingPanel
            v-if="profileSection === 'general'"
            ref="profileLandingRef"
            :is-vi="isVi"
            :prefix="prefix"
            :credits="credits"
            :email="email"
            :username="username"
            :display-name="displayName"
            :login-domain="loginDomain"
            :masked-token="maskedToken"
            :copied="copied"
            :topup-orders="topupOrders"
            :orders-loading="ordersLoading"
            @copy-token="copyToken"
          />

          <div v-else-if="profileSection === 'api'" class="or-profile-detail">
            <a :href="profileSectionHref('general')" class="or-profile-back">
              ← {{ isVi ? 'Hồ sơ' : 'Profile' }}
            </a>

          <div class="or-app-profile-panel">
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

        <!-- BYOK -->
        <section v-else-if="view === 'byok'" class="or-app-section or-app-section--byok">
          <ByokPanel
            ref="byokPanelRef"
            :is-vi="isVi"
            :prefix="prefix"
            :session-domain="loginDomain"
          />
        </section>

        <!-- Files -->
        <section v-else-if="view === 'files'" class="or-app-section or-app-section--files">
          <FilesPanel ref="filesPanelRef" :is-vi="isVi" :prefix="prefix" />
        </section>

        <!-- Activity hub -->
        <section v-else-if="view === 'activity'" class="or-app-section or-app-section--activity">
          <ActivityHub
            ref="activityHubRef"
            :is-vi="isVi"
            :prefix="prefix"
            :credits="credits"
            :topup-orders="topupOrders"
            :orders-loading="ordersLoading"
            @refresh="loadTopupOrders"
          />
        </section>

        <!-- Observability -->
        <section v-else-if="view === 'observability'" class="or-app-section or-app-section--observability">
          <ObservabilityPanel
            ref="observabilityPanelRef"
            :is-vi="isVi"
            :prefix="prefix"
            :credits="credits"
          />
        </section>

        <!-- Credits -->
        <section v-else-if="view === 'credits'" class="or-app-section or-app-section--credits">
          <CreditsPanel
            ref="creditsPanelRef"
            :is-vi="isVi"
            :prefix="prefix"
            :credits="credits"
            :credits-low="creditsLow"
            :credits-approx-usd="creditsApproxUsd"
            :username="username"
            :email="email"
            @paid="onCreditsPaid"
          />
        </section>
      </template>
    </div>
  </div>
</template>
