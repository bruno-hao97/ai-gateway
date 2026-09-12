<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getStoredDomain } from '../models/auth-api';
import {
  createByokProviderCredential,
  deleteByokCredential,
  fetchByokCredentials,
  fetchByokStatus,
  fetchByokUsage,
  linkGommoAccount,
  patchByokCredential,
  setPrimaryGommoAccount,
  testByokCredential,
  type ByokCredential,
  type ByokProviderInfo,
  type ByokStatus,
  type ByokUsageEvent,
  type ByokUsageSummary,
} from '../models/byok-api';

function formatCredits(value: number): string {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString();
}

const props = defineProps<{
  isVi: boolean;
  prefix: string;
  sessionDomain: string;
}>();

type TabId = 'providers' | 'gommo' | 'usage';

const activeTab = ref<TabId>('providers');
const loading = ref(true);
const error = ref('');
const status = ref<ByokStatus | null>(null);
const providerCreds = ref<ByokCredential[]>([]);
const gommoCreds = ref<ByokCredential[]>([]);
const usageSummary = ref<ByokUsageSummary | null>(null);
const usageEvents = ref<ByokUsageEvent[]>([]);

const providerSecret = ref('');
const providerLabel = ref('');
const selectedProvider = ref('openai');
const gommoDomain = ref('');
const gommoLabel = ref('');
const actionMessage = ref('');

const providers = computed(() => status.value?.providers ?? []);

const showBeta = computed(() => status.value?.beta !== false);

const betaLimitations = computed(() =>
  props.isVi
    ? [
        'BYOK đang beta — hành vi billing, fallback và provider có thể thay đổi.',
        'Chat BYOK: cần map model trong config/byok-model-map.json; không phải mọi model catalog đều hỗ trợ.',
        'Media/upload/audio: dùng Gommo primary account đã link — không dùng key OpenAI/Anthropic trực tiếp.',
        'Phí platform (% token) đang theo dõi thử nghiệm; chưa tương đương OpenRouter billing.',
        'Lưu key trên gateway (file local dev); production cần BYOK_ENCRYPTION_KEY và backup.',
      ]
    : [
        'BYOK is in beta — billing, fallback, and provider behavior may change.',
        'Chat BYOK requires a model map entry in config/byok-model-map.json; not every catalog model is supported.',
        'Media/upload/audio use your linked Gommo primary account — not direct OpenAI/Anthropic keys.',
        'Platform fee (% of tokens) is experimental tracking; not equivalent to OpenRouter billing yet.',
        'Keys are stored on the gateway host (file in dev); production needs BYOK_ENCRYPTION_KEY and backup.',
      ],
);

const sdkDocsHref = computed(() => `${props.prefix}/sdk/typescript/`);
const byokDocsHref = computed(() => `${props.prefix}/reference/byok`);
const chatDocsHref = computed(() => `${props.prefix}/reference/chat`);

const hasProviderKey = computed(() =>
  providers.value.some((provider) => provider.configured && provider.credentialCount > 0),
);

const quickStartSteps = computed(() => [
  {
    id: 'provider',
    done: hasProviderKey.value,
    label: props.isVi ? 'Thêm provider key (OpenAI / Anthropic)' : 'Add a provider key (OpenAI / Anthropic)',
    tab: 'providers' as TabId,
  },
  {
    id: 'gommo',
    done: Boolean(status.value?.gommoLinked),
    label: props.isVi ? 'Link Gommo account và đặt primary' : 'Link a Gommo account and set primary',
    tab: 'gommo' as TabId,
  },
  {
    id: 'chat',
    done: (usageSummary.value?.byokRequests ?? 0) > 0,
    label: props.isVi ? 'Gọi chat với model đã map (xem danh sách bên dưới)' : 'Call chat with a mapped model (see list below)',
    href: chatDocsHref.value,
  },
]);

const supportedChatModels = computed(() => status.value?.supportedChatModels ?? []);

const platformFeeHelp = computed(() =>
  props.isVi
    ? 'Phí platform (% token hoặc/request) tích lũy trên gateway. Trước mỗi request BYOK, gateway kiểm tra credit Gommo session — thiếu credit trả 402. Chưa tương đương billing OpenRouter.'
    : 'Platform fee (% of tokens or per request) accrues on the gateway ledger. Before each BYOK request, the gateway checks your session Gommo credits — insufficient balance returns 402. Not equivalent to OpenRouter billing yet.',
);

const fallbackHelp = computed(() =>
  props.isVi
    ? 'Khi provider key lỗi: bật = thử lại bằng credit Gommo session; tắt = trả lỗi provider, không fallback.'
    : 'When the provider key fails: on = retry with session Gommo credits; off = return the provider error with no fallback.',
);

function formatModelId(model: { gatewayModelId: string; gommoServer?: string }): string {
  if (model.gommoServer) return `${model.gatewayModelId}::${model.gommoServer}`;
  return model.gatewayModelId;
}

function goToTab(tab: TabId) {
  activeTab.value = tab;
}

function providerStatusLabel(provider: ByokProviderInfo): string {
  if (provider.configured) {
    return props.isVi
      ? `${provider.credentialCount} key`
      : `${provider.credentialCount} key${provider.credentialCount === 1 ? '' : 's'}`;
  }
  return props.isVi ? 'Chưa cấu hình' : 'Not configured';
}

async function reload() {
  loading.value = true;
  error.value = '';
  actionMessage.value = '';
  try {
    status.value = await fetchByokStatus();
    providerCreds.value = await fetchByokCredentials('provider');
    gommoCreds.value = await fetchByokCredentials('gommo');
    const usage = await fetchByokUsage(7, 20);
    usageSummary.value = usage.summary;
    usageEvents.value = usage.events;
    if (!gommoDomain.value) {
      gommoDomain.value = props.sessionDomain.trim() || getStoredDomain();
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function onAddProviderKey() {
  actionMessage.value = '';
  try {
    await createByokProviderCredential({
      providerSlug: selectedProvider.value,
      secret: providerSecret.value,
      label: providerLabel.value || undefined,
    });
    providerSecret.value = '';
    providerLabel.value = '';
    actionMessage.value = props.isVi ? 'Đã lưu provider key.' : 'Provider key saved.';
    await reload();
  } catch (e) {
    actionMessage.value = e instanceof Error ? e.message : String(e);
  }
}

async function onLinkGommo() {
  actionMessage.value = '';
  try {
    await linkGommoAccount({
      domain: gommoDomain.value.trim(),
      label: gommoLabel.value || undefined,
      setPrimary: true,
    });
    gommoLabel.value = '';
    actionMessage.value = props.isVi ? 'Đã liên kết Gommo account.' : 'Gommo account linked.';
    await reload();
  } catch (e) {
    actionMessage.value = e instanceof Error ? e.message : String(e);
  }
}

async function onDeleteCredential(id: string) {
  await deleteByokCredential(id);
  await reload();
}

async function onTestCredential(id: string) {
  const result = await testByokCredential(id);
  actionMessage.value = result.message;
}

async function onSetPrimary(id: string) {
  await setPrimaryGommoAccount(id);
  actionMessage.value = props.isVi ? 'Đã đặt primary account.' : 'Primary account updated.';
  await reload();
}

async function onToggleFallback(cred: ByokCredential) {
  await patchByokCredential(cred.id, { sharedFallback: !cred.sharedFallback });
  await reload();
}

function formatUsageTime(at: string): string {
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return at;
  return new Date(ms).toLocaleString();
}

onMounted(() => {
  gommoDomain.value = props.sessionDomain.trim() || getStoredDomain();
  void reload();
});

defineExpose({ reload });
</script>

<template>
  <div class="or-byok">
    <aside v-if="showBeta" class="or-obs-beta-notice" aria-label="BYOK beta limitations">
      <div class="or-obs-beta-notice-head">
        <span class="or-obs-pill or-obs-pill--beta">Beta</span>
        <strong class="or-obs-beta-notice-title">
          {{ isVi ? 'Giới hạn hiện tại' : 'Current limitations' }}
        </strong>
      </div>
      <ul class="or-obs-beta-notice-list">
        <li v-for="(line, index) in betaLimitations" :key="index">{{ line }}</li>
      </ul>
      <p class="or-obs-beta-notice-foot">
        <a :href="byokDocsHref" class="or-obs-beta-notice-link">
          {{ isVi ? 'Tài liệu BYOK đầy đủ →' : 'Full BYOK reference →' }}
        </a>
        ·
        <a :href="sdkDocsHref" class="or-obs-beta-notice-link">
          SDK
        </a>
      </p>
    </aside>

    <section
      v-if="status && !loading && !error"
      class="or-overview-onboarding or-byok-quickstart"
      aria-labelledby="or-byok-quickstart-title"
    >
      <h2 id="or-byok-quickstart-title" class="or-overview-onboarding-title">
        {{ isVi ? 'Bắt đầu' : 'Get started' }}
      </h2>
      <p class="or-overview-onboarding-sub">
        {{
          isVi
            ? 'Ba bước hybrid BYOK — key cho chat, Gommo cho media.'
            : 'Three hybrid BYOK steps — keys for chat, Gommo for media.'
        }}
      </p>
      <ol class="or-overview-onboarding-list">
        <li
          v-for="(step, index) in quickStartSteps"
          :key="step.id"
          class="or-overview-onboarding-step"
          :class="{ 'or-overview-onboarding-step--done': step.done }"
        >
          <span class="or-overview-onboarding-marker" aria-hidden="true">
            {{ step.done ? '✓' : index + 1 }}
          </span>
          <button
            v-if="step.tab"
            type="button"
            class="or-byok-quickstart-link"
            @click="goToTab(step.tab!)"
          >
            {{ step.label }}
          </button>
          <a v-else :href="step.href" class="or-overview-onboarding-link">{{ step.label }}</a>
        </li>
      </ol>
    </section>

    <div class="or-byok-tabs" role="tablist">
      <button
        type="button"
        class="or-byok-tab"
        :class="{ active: activeTab === 'providers' }"
        @click="activeTab = 'providers'"
      >
        {{ isVi ? 'Provider' : 'Providers' }}
      </button>
      <button
        type="button"
        class="or-byok-tab"
        :class="{ active: activeTab === 'gommo' }"
        @click="activeTab = 'gommo'"
      >
        {{ isVi ? 'Tài khoản Gommo' : 'Gommo accounts' }}
      </button>
      <button
        type="button"
        class="or-byok-tab"
        :class="{ active: activeTab === 'usage' }"
        @click="activeTab = 'usage'"
      >
        {{ isVi ? 'Usage' : 'Usage' }}
      </button>
    </div>

    <div v-if="status && !loading && !error" class="or-byok-meta or-app-panel">
      <p class="or-app-muted" :title="platformFeeHelp">
        {{
          isVi
            ? `Phí platform: ${status.platformFeePercent}% · Fallback mặc định: ${status.defaultSharedFallback ? 'bật' : 'tắt'}`
            : `Platform fee: ${status.platformFeePercent}% · Default fallback: ${status.defaultSharedFallback ? 'on' : 'off'}`
        }}
        <span class="or-byok-help" aria-hidden="true">?</span>
      </p>
      <p
        v-if="status.platformFeePercent > 0 || (status.platformFees?.outstandingCredits ?? 0) > 0"
        class="or-app-muted"
        :title="platformFeeHelp"
      >
        {{
          isVi
            ? `Phí tích lũy: ${formatCredits(status.platformFees?.outstandingCredits ?? 0)} · Credit platform (session): ${formatCredits(status.platformCredits ?? 0)}`
            : `Accrued fees: ${formatCredits(status.platformFees?.outstandingCredits ?? 0)} · Platform credits (session): ${formatCredits(status.platformCredits ?? 0)}`
        }}
      </p>
    </div>

    <p v-if="loading" class="or-app-muted">{{ isVi ? 'Đang tải…' : 'Loading…' }}</p>
    <p v-else-if="error" class="or-app-alert">{{ error }}</p>

    <template v-else>
      <p v-if="actionMessage" class="or-app-muted">{{ actionMessage }}</p>

      <div v-if="activeTab === 'providers'" class="or-byok-panel">
        <p class="or-app-muted">
          {{
            isVi
              ? 'Chat /gateway/chat và /v1/chat/completions dùng key provider khi có map model. Media jobs vẫn qua Gommo.'
              : 'Chat /gateway/chat and /v1/chat/completions use provider keys when a model map exists. Media jobs still use Gommo.'
          }}
        </p>

        <div v-if="supportedChatModels.length" class="or-app-panel or-byok-models">
          <h3>{{ isVi ? 'Model chat BYOK (gateway map)' : 'BYOK chat models (gateway map)' }}</h3>
          <p class="or-app-muted">
            {{
              isVi
                ? 'Chỉ các model sau dùng key provider. Operator thêm model mới trong config/byok-model-map.json.'
                : 'Only these models use your provider key. Operators add new models in config/byok-model-map.json.'
            }}
          </p>
          <ul class="or-byok-model-list">
            <li v-for="model in supportedChatModels" :key="`${model.gatewayModelId}-${model.gommoServer || ''}`">
              <code>{{ formatModelId(model) }}</code>
              <span class="or-app-muted"> · {{ model.byokProvider }} → {{ model.upstreamModel }}</span>
            </li>
          </ul>
        </div>

        <ul class="or-byok-provider-list">
          <li v-for="provider in providers" :key="provider.slug" class="or-byok-provider-row">
            <div>
              <strong>{{ provider.name }}</strong>
              <span class="or-app-muted"> · {{ providerStatusLabel(provider) }}</span>
            </div>
            <span v-if="!provider.chatSupported" class="or-app-title-badge" :title="isVi ? 'Chat chưa hỗ trợ provider này' : 'Chat not supported for this provider yet'">beta</span>
          </li>
        </ul>

        <div class="or-app-panel or-byok-form">
          <h3>{{ isVi ? 'Thêm provider key' : 'Add provider key' }}</h3>
          <label class="or-byok-field">
            <span>Provider</span>
            <select v-model="selectedProvider">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label class="or-byok-field">
            <span>{{ isVi ? 'API key' : 'API key' }}</span>
            <input v-model="providerSecret" type="password" autocomplete="off" />
          </label>
          <label class="or-byok-field">
            <span>{{ isVi ? 'Nhãn (tuỳ chọn)' : 'Label (optional)' }}</span>
            <input v-model="providerLabel" type="text" />
          </label>
          <button type="button" class="or-app-btn or-app-btn-accent" @click="onAddProviderKey">
            {{ isVi ? 'Lưu key' : 'Save key' }}
          </button>
        </div>

        <div v-if="providerCreds.length" class="or-app-panel">
          <h3>{{ isVi ? 'Keys đã lưu' : 'Saved keys' }}</h3>
          <article v-for="cred in providerCreds" :key="cred.id" class="or-byok-cred">
            <div>
              <strong>{{ cred.providerSlug }}</strong>
              <span class="or-app-muted"> · {{ cred.secretHint }}</span>
              <p v-if="cred.label" class="or-app-muted">{{ cred.label }}</p>
            </div>
            <div class="or-byok-cred-actions">
              <button type="button" class="or-app-btn or-app-btn-ghost" @click="onTestCredential(cred.id)">
                Test
              </button>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost"
                :title="fallbackHelp"
                @click="onToggleFallback(cred)"
              >
                {{ cred.sharedFallback ? (isVi ? 'Fallback: bật' : 'Fallback: on') : (isVi ? 'Fallback: tắt' : 'Fallback: off') }}
              </button>
              <button type="button" class="or-app-btn or-app-btn-ghost" @click="onDeleteCredential(cred.id)">
                {{ isVi ? 'Xóa' : 'Delete' }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-else-if="activeTab === 'gommo'" class="or-byok-panel">
        <p v-if="status?.primaryGommo?.primary" class="or-app-panel or-byok-meta">
          {{
            isVi
              ? `Media jobs dùng primary: ${status.primaryGommo.primary.domain} (@${status.primaryGommo.primary.username || '—'})`
              : `Media jobs use primary: ${status.primaryGommo.primary.domain} (@${status.primaryGommo.primary.username || '—'})`
          }}
        </p>
        <p class="or-app-muted">
          {{
            isVi
              ? 'Liên kết domain Gommo bằng session đang đăng nhập — media/upload/audio trừ credit trên account primary.'
              : 'Link a Gommo domain with your current login session — media/upload/audio bill against the primary account.'
          }}
        </p>

        <div class="or-app-panel or-byok-form">
          <h3>{{ isVi ? 'Liên kết account' : 'Link account' }}</h3>
          <label class="or-byok-field">
            <span>Domain</span>
            <input v-model="gommoDomain" type="text" placeholder="79ai.net" />
          </label>
          <label class="or-byok-field">
            <span>{{ isVi ? 'Nhãn (tuỳ chọn)' : 'Label (optional)' }}</span>
            <input v-model="gommoLabel" type="text" />
          </label>
          <button type="button" class="or-app-btn or-app-btn-accent" @click="onLinkGommo">
            {{ isVi ? 'Liên kết session hiện tại' : 'Link current session' }}
          </button>
        </div>

        <div v-if="gommoCreds.length" class="or-app-panel">
          <h3>{{ isVi ? 'Accounts' : 'Accounts' }}</h3>
          <article v-for="cred in gommoCreds" :key="cred.id" class="or-byok-cred">
            <div>
              <strong>{{ cred.gommoDomain || cred.label }}</strong>
              <span v-if="cred.isPrimary" class="or-app-title-badge">primary</span>
              <p class="or-app-muted">
                @{{ cred.gommoUsername || '—' }} · {{ cred.secretHint }}
              </p>
            </div>
            <div class="or-byok-cred-actions">
              <button
                v-if="!cred.isPrimary"
                type="button"
                class="or-app-btn or-app-btn-ghost"
                @click="onSetPrimary(cred.id)"
              >
                {{ isVi ? 'Đặt primary' : 'Set primary' }}
              </button>
              <button type="button" class="or-app-btn or-app-btn-ghost" @click="onTestCredential(cred.id)">
                Test
              </button>
              <button type="button" class="or-app-btn or-app-btn-ghost" @click="onDeleteCredential(cred.id)">
                {{ isVi ? 'Xóa' : 'Delete' }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="or-byok-panel">
        <p class="or-app-muted">
          {{
            isVi
              ? 'Thống kê 7 ngày — request BYOK vs platform (Gommo fallback).'
              : 'Last 7 days — BYOK vs platform (Gommo fallback) requests.'
          }}
        </p>

        <div v-if="usageSummary" class="or-byok-usage-grid">
          <article class="or-app-panel or-byok-usage-card">
            <h3>BYOK</h3>
            <p class="or-byok-usage-value">{{ usageSummary.byokRequests }}</p>
            <p class="or-app-muted">{{ isVi ? 'request' : 'requests' }}</p>
          </article>
          <article class="or-app-panel or-byok-usage-card">
            <h3>Platform</h3>
            <p class="or-byok-usage-value">{{ usageSummary.platformRequests }}</p>
            <p class="or-app-muted">{{ isVi ? 'request Gommo' : 'Gommo requests' }}</p>
          </article>
          <article class="or-app-panel or-byok-usage-card">
            <h3>{{ isVi ? 'Lỗi BYOK' : 'BYOK errors' }}</h3>
            <p class="or-byok-usage-value">{{ usageSummary.byokErrors }}</p>
          </article>
          <article class="or-app-panel or-byok-usage-card">
            <h3>{{ isVi ? 'Phí BYOK' : 'BYOK fees' }}</h3>
            <p class="or-byok-usage-value">{{ formatCredits(usageSummary.totalPlatformFeeCredits) }}</p>
            <p class="or-app-muted">{{ isVi ? 'credit (7 ngày)' : 'credits (7d)' }}</p>
          </article>
        </div>

        <div v-if="usageEvents.length" class="or-app-panel">
          <h3>{{ isVi ? 'Gần đây' : 'Recent' }}</h3>
          <article v-for="event in usageEvents" :key="event.id" class="or-byok-usage-row">
            <div>
              <strong>{{ event.source }}</strong>
              <span class="or-app-muted"> · {{ event.provider || '—' }} · {{ event.model }}</span>
            </div>
            <div class="or-app-muted">
              {{ formatUsageTime(event.at) }}
              · {{ event.latencyMs }}ms
              · {{ event.ok ? 'ok' : event.errorCode || 'err' }}
            </div>
          </article>
        </div>
        <p v-else class="or-app-muted">{{ isVi ? 'Chưa có usage.' : 'No usage yet.' }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.or-byok-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.or-byok .or-obs-beta-notice {
  margin-bottom: 1rem;
}

.or-byok-quickstart {
  margin-bottom: 1rem;
}

.or-byok-quickstart-link {
  font: inherit;
  color: var(--or-accent, var(--vp-c-brand-1));
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.or-byok-quickstart-link:hover {
  opacity: 0.85;
}

.or-byok-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  margin-left: 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  font-size: 0.65rem;
  vertical-align: middle;
  cursor: help;
}

.or-byok-model-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}

.or-byok-model-list li {
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.875rem;
}

.or-byok-model-list code {
  font-size: 0.8125rem;
}

.or-byok-models {
  margin-bottom: 1rem;
}

.or-byok-tab {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: inherit;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
}

.or-byok-tab.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.or-byok-provider-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}

.or-byok-provider-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.or-byok-form {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.or-byok-field {
  display: grid;
  gap: 0.35rem;
}

.or-byok-field input,
.or-byok-field select {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: inherit;
}

.or-byok-cred {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.or-byok-cred-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: flex-start;
}

.or-byok-meta {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
}

.or-byok-usage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.or-byok-usage-card {
  text-align: center;
}

.or-byok-usage-value {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.or-byok-usage-row {
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
</style>
