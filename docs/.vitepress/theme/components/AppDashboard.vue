<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import { getStoredToken, getStoredDomain } from '../models/auth-api';
import { playgroundEmbedUrl, playgroundOrigin, playgroundUrl } from '../models/gateway-base';
import {
  createTopup,
  fetchBillingPackages,
  fetchBillingStatus,
  fetchMe,
  formatCredits,
  getCachedMe,
  getCredits,
  getDisplayName,
  getEmail,
  getAvatarUrl,
  getUsername,
  type CreditPackage,
  type MeResponse,
  type TopupPayment,
} from '../models/user-api';

const props = defineProps<{
  view: 'overview' | 'profile' | 'playground' | 'token' | 'credits';
}>();

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));

const ready = ref(false);
const me = ref<MeResponse | null>(getCachedMe());
const loadError = ref('');
const copied = ref(false);

const packages = ref<CreditPackage[]>([]);
const packagesLoading = ref(false);
const packagesError = ref('');
const billingReady = ref(true);
const paying = ref<string | null>(null);
const payment = ref<TopupPayment | null>(null);
const playgroundFrame = ref<HTMLIFrameElement | null>(null);

const embedSrc = computed(() => playgroundEmbedUrl());
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

const navMain = computed(() => [
  { id: 'overview', label: isVi.value ? 'Tổng quan' : 'Overview', href: `${prefix.value}/app/` },
  { id: 'profile', label: isVi.value ? 'Hồ sơ' : 'Profile', href: `${prefix.value}/app/profile/` },
  { id: 'playground', label: 'Playground', href: `${prefix.value}/app/playground/` },
  { id: 'token', label: isVi.value ? 'Access token' : 'Access token', href: `${prefix.value}/app/token/` },
  { id: 'credits', label: isVi.value ? 'Credits' : 'Credits', href: `${prefix.value}/app/credits/` },
]);

const navLinks = computed(() => [
  { label: isVi.value ? 'Models' : 'Models', href: `${prefix.value}/models/` },
  { label: isVi.value ? 'So sánh' : 'Compare', href: `${prefix.value}/models/compare/` },
  { label: isVi.value ? 'Documentation' : 'Documentation', href: `${prefix.value}/quickstart` },
]);

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

async function refreshProfile() {
  loadError.value = '';
  try {
    me.value = await fetchMe();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
}

async function loadCreditsView() {
  packagesLoading.value = true;
  packagesError.value = '';
  try {
    const status = await fetchBillingStatus();
    billingReady.value = Boolean(status.payosConfigured && status.merchantReady);
    packages.value = await fetchBillingPackages();
  } catch (e) {
    packagesError.value = e instanceof Error ? e.message : String(e);
  } finally {
    packagesLoading.value = false;
  }
}

async function onTopup(packageId: string) {
  if (!username.value) {
    packagesError.value = isVi.value ? 'Thiếu username — đăng nhập lại' : 'Missing username — sign in again';
    return;
  }
  paying.value = packageId;
  payment.value = null;
  packagesError.value = '';
  try {
    payment.value = await createTopup(username.value, packageId);
    await refreshProfile();
  } catch (e) {
    packagesError.value = e instanceof Error ? e.message : String(e);
  } finally {
    paying.value = null;
  }
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

onMounted(async () => {
  if (!getStoredToken()) {
    window.location.href = `${prefix.value}/login/`;
    return;
  }
  await refreshProfile();
  if (props.view === 'credits') {
    await loadCreditsView();
  }
  ready.value = true;
});
</script>

<template>
  <div class="or-catalog or-app" :class="{ 'or-app-has-playground': view === 'playground' }">
    <aside class="or-sidebar">
      <div class="or-app-brand">
        <span class="or-app-logo">⬡</span>
        <div>
          <p class="or-app-brand-title">AI Gateway</p>
          <p class="or-app-brand-sub">{{ isVi ? 'Workspace' : 'Workspace' }}</p>
        </div>
      </div>

      <nav class="or-app-nav" aria-label="App">
        <p class="or-app-nav-label">{{ isVi ? 'Platform' : 'Platform' }}</p>
        <a
          v-for="item in navMain"
          :key="item.id"
          :href="item.href"
          class="or-app-nav-link"
          :class="{ active: isActive(item.id) }"
        >
          {{ item.label }}
        </a>

        <p class="or-app-nav-label">{{ isVi ? 'Khám phá' : 'Explore' }}</p>
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="or-app-nav-link"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noreferrer' : undefined"
        >
          {{ link.label }}
          <span v-if="link.external" class="or-app-ext">↗</span>
        </a>
      </nav>

      <a :href="`${prefix}/app/profile/`" class="or-app-user">
        <p class="or-app-user-name">{{ displayName }}</p>
        <p class="or-app-user-credits">{{ formatCredits(credits) }} credits</p>
        <p v-if="username" class="or-app-user-meta">@{{ username }}</p>
      </a>
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
              {{
                isVi
                  ? 'Thông tin tài khoản Gommo từ /ai/me.'
                  : 'Your Gommo account details from /ai/me.'
              }}
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
                  ? 'Nạp credit qua PayOS trên gateway.'
                  : 'Top up credits via PayOS on the gateway.'
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
          <span v-if="view !== 'playground'" class="or-app-credits-pill">{{ formatCredits(credits) }} credits</span>
          <button
            v-if="view !== 'playground'"
            type="button"
            class="or-app-btn or-app-btn-ghost"
            @click="refreshProfile"
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
              <p>{{ isVi ? 'PayOS packages trên gateway.' : 'PayOS packages on the gateway.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Wallet' : 'Wallet' }} →</span>
            </a>
            <a :href="`${prefix}/app/token/`" class="or-app-card">
              <h3>Access token</h3>
              <p>{{ isVi ? 'Copy Bearer cho API client.' : 'Copy Bearer for your API client.' }}</p>
              <span class="or-app-card-cta">{{ isVi ? 'Xem token' : 'View token' }} →</span>
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
        <section v-else-if="view === 'profile'" class="or-app-section">
          <div class="or-app-profile-head">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt=""
              class="or-app-profile-avatar or-app-profile-avatar-img"
            />
            <div v-else class="or-app-profile-avatar">{{ profileInitials }}</div>
            <div>
              <h2 class="or-app-profile-name">{{ displayName }}</h2>
              <p v-if="username" class="or-app-muted">@{{ username }}</p>
            </div>
          </div>

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
              <dt>{{ isVi ? 'Credits' : 'Credits' }}</dt>
              <dd>{{ formatCredits(credits) }}</dd>
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
            <a :href="`${prefix}/app/token/`" class="or-app-btn or-app-btn-ghost">
              Access token
            </a>
            <a :href="`${prefix}/authentication`" class="or-app-btn or-app-btn-ghost">
              {{ isVi ? 'Tài liệu auth' : 'Auth docs' }}
            </a>
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
                ? 'PayOS hoặc merchant chưa cấu hình trên server — xem GET /billing/status.'
                : 'PayOS or merchant not configured on server — see GET /billing/status.'
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
            <div
              v-for="pkg in packages"
              :key="pkg.id"
              class="or-app-pkg"
              :class="{ featured: pkg.featured }"
            >
              <div class="or-app-pkg-head">
                <h3>{{ pkg.name }}</h3>
                <span v-if="pkg.bonusPercent > 0" class="or-app-pkg-badge">+{{ pkg.bonusPercent }}%</span>
              </div>
              <p class="or-app-pkg-meta">
                {{ formatCredits(pkg.credits) }} credits ·
                {{ pkg.amountVnd.toLocaleString(isVi ? 'vi-VN' : 'en-US') }} ₫
              </p>
              <button
                type="button"
                class="or-app-btn"
                :class="pkg.featured ? 'or-app-btn-primary' : 'or-app-btn-ghost'"
                :disabled="paying === pkg.id"
                @click="onTopup(pkg.id)"
              >
                {{ paying === pkg.id ? (isVi ? 'Đang tạo…' : 'Creating…') : isVi ? 'Nạp ngay' : 'Top up' }}
              </button>
            </div>
          </div>

          <div v-if="payment" class="or-app-panel or-app-payment">
            <h3 class="or-app-panel-title">PayOS</h3>
            <p class="or-app-muted">Order #{{ payment.orderCode }}</p>
            <img
              v-if="payment.qrImage"
              :src="payment.qrImage"
              alt="PayOS QR"
              class="or-app-qr"
            />
            <a
              v-if="payment.url"
              :href="payment.url"
              target="_blank"
              rel="noreferrer"
              class="or-app-btn or-app-btn-primary or-app-pay-link"
            >
              {{ isVi ? 'Mở trang thanh toán' : 'Open payment page' }} ↗
            </a>
            <p v-if="payment.bankTransfer" class="or-app-muted or-app-bank">
              {{ payment.bankTransfer.amountFormatted }} · {{ payment.bankTransfer.content }}
            </p>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
