<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { activityHubHref } from '../models/activity-hub-url';
import { getStoredDomain } from '../models/auth-api';
import type { PortalLocale } from '../models/portal-locale';
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
  locale: PortalLocale;
  prefix: string;
  sessionDomain: string;
}>();

const { m } = usePortalCopy(computed(() => props.locale));

type TabId = 'providers' | 'gommo' | 'usage';

const activeTab = ref<TabId>('providers');
const loading = ref(true);
const refreshing = ref(false);
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
const actionSuccess = ref('');
const actionError = ref('');
const credentialActionId = ref('');

const providers = computed(() => status.value?.providers ?? []);

const showBeta = computed(() => status.value?.beta !== false);

const betaLimitations = computed(() => [
  m(
    'BYOK is in beta — billing, fallback, and provider behavior may change.',
    'BYOK đang beta — hành vi billing, fallback và provider có thể thay đổi.',
    'BYOK อยู่ในช่วงเบต้า — การเรียกเก็บเงิน fallback และพฤติกรรมของ provider อาจเปลี่ยนแปลง',
  ),
  m(
    'Chat BYOK requires a model map entry in config/byok-model-map.json; not every catalog model is supported.',
    'Chat BYOK: cần map model trong config/byok-model-map.json; không phải mọi model catalog đều hỗ trợ.',
    'Chat BYOK ต้องมีรายการ map model ใน config/byok-model-map.json; ไม่ใช่ทุก model ในแคตตาล็อกที่รองรับ',
  ),
  m(
    'Media/upload/audio use your linked Gommo primary account — not direct OpenAI/Anthropic keys.',
    'Media/upload/audio: dùng Gommo primary account đã link — không dùng key OpenAI/Anthropic trực tiếp.',
    'Media/upload/audio ใช้บัญชี Gommo primary ที่เชื่อมแล้ว — ไม่ใช้ key OpenAI/Anthropic โดยตรง',
  ),
  m(
    'Platform fee (% of tokens) is experimental tracking; not equivalent to OpenRouter billing yet.',
    'Phí platform (% token) đang theo dõi thử nghiệm; chưa tương đương OpenRouter billing.',
    'ค่าธรรมเนียมแพลตฟอร์ม (% token) เป็นการติดตามทดลอง; ยังไม่เทียบเท่า OpenRouter billing',
  ),
  m(
    'Keys are stored on the gateway host (file in dev); production needs BYOK_ENCRYPTION_KEY and backup.',
    'Lưu key trên gateway (file local dev); production cần BYOK_ENCRYPTION_KEY và backup.',
    'เก็บ key บน gateway host (ไฟล์ใน dev); production ต้องมี BYOK_ENCRYPTION_KEY และ backup',
  ),
]);

const sdkDocsHref = computed(() => `${props.prefix}/sdk/typescript/`);
const byokDocsHref = computed(() => `${props.prefix}/reference/byok`);
const chatDocsHref = computed(() => `${props.prefix}/reference/chat`);
const tokenHref = computed(() => `${props.prefix}/app/token/`);
const chatAppHref = computed(() => `${props.prefix}/app/chat/`);
const activityHref = computed(() => activityHubHref(props.prefix, { tab: 'trends', period: '7d' }));

const hasProviderKey = computed(() =>
  providers.value.some((provider) => provider.configured && provider.credentialCount > 0),
);

const quickStartSteps = computed(() => [
  {
    id: 'provider',
    done: hasProviderKey.value,
    label: m(
      'Add a provider key (OpenAI / Anthropic)',
      'Thêm provider key (OpenAI / Anthropic)',
      'เพิ่ม provider key (OpenAI / Anthropic)',
    ),
    tab: 'providers' as TabId,
  },
  {
    id: 'gommo',
    done: Boolean(status.value?.gommoLinked),
    label: m(
      'Link a Gommo account and set primary',
      'Link Gommo account và đặt primary',
      'เชื่อมบัญชี Gommo และตั้ง primary',
    ),
    tab: 'gommo' as TabId,
  },
  {
    id: 'chat',
    done: (usageSummary.value?.byokRequests ?? 0) > 0,
    label: m(
      'Call chat with a mapped model (see list below)',
      'Gọi chat với model đã map (xem danh sách bên dưới)',
      'เรียก chat ด้วย model ที่ map แล้ว (ดูรายการด้านล่าง)',
    ),
    href: chatDocsHref.value,
  },
]);

const supportedChatModels = computed(() => status.value?.supportedChatModels ?? []);

const platformFeeHelp = computed(() =>
  m(
    'Platform fee (% of tokens or per request) accrues on the gateway ledger. Before each BYOK request, the gateway checks your session Gommo credits — insufficient balance returns 402. Not equivalent to OpenRouter billing yet.',
    'Phí platform (% token hoặc/request) tích lũy trên gateway. Trước mỗi request BYOK, gateway kiểm tra credit Gommo session — thiếu credit trả 402. Chưa tương đương billing OpenRouter.',
    'ค่าธรรมเนียมแพลตฟอร์ม (% token หรือต่อ request) สะสมบน gateway ก่อนแต่ละ BYOK request gateway ตรวจ credit Gommo ของเซสชัน — ยอดไม่พอคืน 402 ยังไม่เทียบเท่า OpenRouter billing',
  ),
);

const fallbackHelp = computed(() =>
  m(
    'When the provider key fails: on = retry with session Gommo credits; off = return the provider error with no fallback.',
    'Khi provider key lỗi: bật = thử lại bằng credit Gommo session; tắt = trả lỗi provider, không fallback.',
    'เมื่อ provider key ล้มเหลว: เปิด = ลองใหม่ด้วย credit Gommo ของเซสชัน; ปิด = คืนข้อผิดพลาดจาก provider โดยไม่ fallback',
  ),
);

function formatModelId(model: { gatewayModelId: string; gommoServer?: string }): string {
  if (model.gommoServer) return `${model.gatewayModelId}::${model.gommoServer}`;
  return model.gatewayModelId;
}

function goToTab(tab: TabId) {
  activeTab.value = tab;
}

function clearActionFeedback() {
  actionSuccess.value = '';
  actionError.value = '';
}

function setActionSuccess(message: string) {
  actionError.value = '';
  actionSuccess.value = message;
}

function setActionError(message: string) {
  actionSuccess.value = '';
  actionError.value = message;
}

function credentialLabel(cred: ByokCredential): string {
  if (cred.kind === 'gommo') {
    return cred.gommoDomain || cred.label || cred.id;
  }
  return cred.label || `${cred.providerSlug} · ${cred.secretHint}`;
}

function eventStatusLabel(event: ByokUsageEvent): string {
  if (event.ok) return 'OK';
  return event.errorCode || m('Error', 'Lỗi', 'ข้อผิดพลาด');
}

function eventStatusTone(event: ByokUsageEvent): 'ok' | 'error' {
  return event.ok ? 'ok' : 'error';
}

function eventSourceLabel(event: ByokUsageEvent): string {
  return event.source === 'byok' ? 'BYOK' : 'Platform';
}

function eventSourceTone(event: ByokUsageEvent): 'byok' | 'platform' {
  return event.source === 'byok' ? 'byok' : 'platform';
}

function providerStatusLabel(provider: ByokProviderInfo): string {
  if (provider.configured) {
    const count = provider.credentialCount;
    if (count === 1) return m('1 key', '1 key', '1 key');
    return m(`${count} keys`, `${count} key`, `${count} key`);
  }
  return m('Not configured', 'Chưa cấu hình', 'ยังไม่ได้ตั้งค่า');
}

async function reload(opts?: { initial?: boolean }) {
  const isInitial = opts?.initial ?? !status.value;
  if (isInitial) {
    loading.value = true;
  } else {
    refreshing.value = true;
  }
  error.value = '';
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
    refreshing.value = false;
  }
}

async function onAddProviderKey() {
  clearActionFeedback();
  try {
    await createByokProviderCredential({
      providerSlug: selectedProvider.value,
      secret: providerSecret.value,
      label: providerLabel.value || undefined,
    });
    providerSecret.value = '';
    providerLabel.value = '';
    await reload();
    setActionSuccess(m('Provider key saved.', 'Đã lưu provider key.', 'บันทึก provider key แล้ว'));
  } catch (e) {
    setActionError(e instanceof Error ? e.message : String(e));
  }
}

async function onLinkGommo() {
  clearActionFeedback();
  try {
    await linkGommoAccount({
      domain: gommoDomain.value.trim(),
      label: gommoLabel.value || undefined,
      setPrimary: true,
    });
    gommoLabel.value = '';
    await reload();
    setActionSuccess(m('Gommo account linked.', 'Đã liên kết Gommo account.', 'เชื่อมบัญชี Gommo แล้ว'));
  } catch (e) {
    setActionError(e instanceof Error ? e.message : String(e));
  }
}

async function onDeleteCredential(cred: ByokCredential) {
  const label = credentialLabel(cred);
  const prompt = m(`Delete credential "${label}"?`, `Xóa credential "${label}"?`, `ลบ credential "${label}"?`);
  if (!window.confirm(prompt)) return;

  credentialActionId.value = cred.id;
  clearActionFeedback();
  try {
    await deleteByokCredential(cred.id);
    await reload();
    setActionSuccess(m('Credential deleted.', 'Đã xóa credential.', 'ลบ credential แล้ว'));
  } catch (e) {
    setActionError(e instanceof Error ? e.message : String(e));
  } finally {
    credentialActionId.value = '';
  }
}

async function onTestCredential(id: string) {
  credentialActionId.value = id;
  clearActionFeedback();
  try {
    const result = await testByokCredential(id);
    if (result.ok) {
      setActionSuccess(result.message || m('Test passed.', 'Test thành công.', 'ทดสอบผ่าน'));
    } else {
      setActionError(result.message || m('Test failed.', 'Test thất bại.', 'ทดสอบล้มเหลว'));
    }
    await reload();
  } catch (e) {
    setActionError(e instanceof Error ? e.message : String(e));
  } finally {
    credentialActionId.value = '';
  }
}

async function onSetPrimary(id: string) {
  clearActionFeedback();
  try {
    await setPrimaryGommoAccount(id);
    await reload();
    setActionSuccess(m('Primary account updated.', 'Đã đặt primary account.', 'อัปเดต primary account แล้ว'));
  } catch (e) {
    setActionError(e instanceof Error ? e.message : String(e));
  }
}

async function onToggleFallback(cred: ByokCredential) {
  clearActionFeedback();
  try {
    await patchByokCredential(cred.id, { sharedFallback: !cred.sharedFallback });
    await reload();
    setActionSuccess(
      cred.sharedFallback
        ? m('Gommo fallback disabled.', 'Đã tắt Gommo fallback.', 'ปิด Gommo fallback แล้ว')
        : m('Gommo fallback enabled.', 'Đã bật Gommo fallback.', 'เปิด Gommo fallback แล้ว'),
    );
  } catch (e) {
    setActionError(e instanceof Error ? e.message : String(e));
  }
}

function formatUsageTime(at: string): string {
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return at;
  return new Date(ms).toLocaleString();
}

onMounted(() => {
  gommoDomain.value = props.sessionDomain.trim() || getStoredDomain();
  void reload({ initial: true });
});

defineExpose({
  reload: () => reload({ initial: false }),
});
</script>

<template>
  <div class="or-byok">
    <aside v-if="showBeta" class="or-obs-beta-notice" aria-label="BYOK beta limitations">
      <div class="or-obs-beta-notice-head">
        <span class="or-obs-pill or-obs-pill--beta">Beta</span>
        <strong class="or-obs-beta-notice-title">
          {{ m('Current limitations', 'Giới hạn hiện tại', 'ข้อจำกัดปัจจุบัน') }}
        </strong>
      </div>
      <ul class="or-obs-beta-notice-list">
        <li v-for="(line, index) in betaLimitations" :key="index">{{ line }}</li>
      </ul>
      <p class="or-obs-beta-notice-foot">
        <a :href="byokDocsHref" class="or-obs-beta-notice-link">
          {{ m('Full BYOK reference →', 'Tài liệu BYOK đầy đủ →', 'เอกสาร BYOK ฉบับเต็ม →') }}
        </a>
        ·
        <a :href="sdkDocsHref" class="or-obs-beta-notice-link">
          SDK
        </a>
      </p>
    </aside>

    <section
      v-if="status && !error"
      class="or-overview-onboarding or-byok-quickstart"
      :class="{ 'or-byok-quickstart--refreshing': refreshing }"
      aria-labelledby="or-byok-quickstart-title"
    >
      <h2 id="or-byok-quickstart-title" class="or-overview-onboarding-title">
        {{ m('Get started', 'Bắt đầu', 'เริ่มต้น') }}
      </h2>
      <p class="or-overview-onboarding-sub">
        {{
          m(
            'Three hybrid BYOK steps — keys for chat, Gommo for media.',
            'Ba bước hybrid BYOK — key cho chat, Gommo cho media.',
            'สามขั้นตอน hybrid BYOK — key สำหรับ chat, Gommo สำหรับ media',
          )
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
        {{ m('Providers', 'Provider', 'Providers') }}
      </button>
      <button
        type="button"
        class="or-byok-tab"
        :class="{ active: activeTab === 'gommo' }"
        @click="activeTab = 'gommo'"
      >
        {{ m('Gommo accounts', 'Tài khoản Gommo', 'บัญชี Gommo') }}
      </button>
      <button
        type="button"
        class="or-byok-tab"
        :class="{ active: activeTab === 'usage' }"
        @click="activeTab = 'usage'"
      >
        Usage
      </button>
    </div>

    <div
      v-if="status && !error"
      class="or-byok-meta or-app-panel"
      :class="{ 'or-byok-meta--refreshing': refreshing }"
    >
      <p class="or-app-muted" :title="platformFeeHelp">
        {{
          m(
            `Platform fee: ${status.platformFeePercent}% · Default fallback: ${status.defaultSharedFallback ? 'on' : 'off'}`,
            `Phí platform: ${status.platformFeePercent}% · Fallback mặc định: ${status.defaultSharedFallback ? 'bật' : 'tắt'}`,
            `ค่าธรรมเนียมแพลตฟอร์ม: ${status.platformFeePercent}% · Fallback เริ่มต้น: ${status.defaultSharedFallback ? 'เปิด' : 'ปิด'}`,
          )
        }}
        <span class="or-byok-help" aria-hidden="true">?</span>
      </p>
      <p
        v-if="status.platformFeePercent > 0 || (status.platformFees?.outstandingCredits ?? 0) > 0"
        class="or-app-muted"
        :title="platformFeeHelp"
      >
        {{
          m(
            `Accrued fees: ${formatCredits(status.platformFees?.outstandingCredits ?? 0)} · Platform credits (session): ${formatCredits(status.platformCredits ?? 0)}`,
            `Phí tích lũy: ${formatCredits(status.platformFees?.outstandingCredits ?? 0)} · Credit platform (session): ${formatCredits(status.platformCredits ?? 0)}`,
            `ค่าธรรมเนียมสะสม: ${formatCredits(status.platformFees?.outstandingCredits ?? 0)} · Credit แพลตฟอร์ม (เซสชัน): ${formatCredits(status.platformCredits ?? 0)}`,
          )
        }}
      </p>
    </div>

    <p v-if="loading" class="or-app-muted">{{ m('Loading…', 'Đang tải…', 'กำลังโหลด…') }}</p>
    <p v-else-if="error" class="or-app-alert">{{ error }}</p>

    <template v-else>
      <p v-if="refreshing" class="or-byok-refresh-hint" role="status">
        {{ m('Refreshing…', 'Đang cập nhật…', 'กำลังอัปเดต…') }}
      </p>
      <p v-if="actionSuccess" class="or-byok-action-success" role="status">{{ actionSuccess }}</p>
      <p v-if="actionError" class="or-byok-action-error">{{ actionError }}</p>

      <div
        v-if="activeTab === 'providers'"
        class="or-byok-panel"
        :class="{ 'or-byok-panel--refreshing': refreshing }"
      >
        <p class="or-app-muted">
          {{
            m(
              'Chat /gateway/chat and /v1/chat/completions use provider keys when a model map exists. Media jobs still use Gommo.',
              'Chat /gateway/chat và /v1/chat/completions dùng key provider khi có map model. Media jobs vẫn qua Gommo.',
              'Chat /gateway/chat และ /v1/chat/completions ใช้ provider key เมื่อมี model map งาน media ยังผ่าน Gommo',
            )
          }}
        </p>

        <div v-if="supportedChatModels.length" class="or-app-panel or-byok-models">
          <h3>{{ m('BYOK chat models (gateway map)', 'Model chat BYOK (gateway map)', 'Model chat BYOK (gateway map)') }}</h3>
          <p class="or-app-muted">
            {{
              m(
                'Only these models use your provider key. Operators add new models in config/byok-model-map.json.',
                'Chỉ các model sau dùng key provider. Operator thêm model mới trong config/byok-model-map.json.',
                'เฉพาะ model เหล่านี้ใช้ provider key ของคุณ ผู้ดูแลเพิ่ม model ใหม่ใน config/byok-model-map.json',
              )
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
            <span v-if="!provider.chatSupported" class="or-app-title-badge" :title="m('Chat not supported for this provider yet', 'Chat chưa hỗ trợ provider này', 'ยังไม่รองรับ chat สำหรับ provider นี้')">beta</span>
          </li>
        </ul>

        <div class="or-app-panel or-byok-form">
          <h3>{{ m('Add provider key', 'Thêm provider key', 'เพิ่ม provider key') }}</h3>
          <label class="or-byok-field">
            <span>Provider</span>
            <select v-model="selectedProvider">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label class="or-byok-field">
            <span>API key</span>
            <input v-model="providerSecret" type="password" autocomplete="off" />
          </label>
          <label class="or-byok-field">
            <span>{{ m('Label (optional)', 'Nhãn (tuỳ chọn)', 'ชื่อ (ไม่บังคับ)') }}</span>
            <input v-model="providerLabel" type="text" />
          </label>
          <button
            type="button"
            class="or-app-btn or-app-btn-primary or-app-btn-sm or-byok-form-submit"
            :disabled="refreshing || !providerSecret.trim()"
            @click="onAddProviderKey"
          >
            {{ m('Save key', 'Lưu key', 'บันทึก key') }}
          </button>
        </div>

        <div v-if="providerCreds.length" class="or-app-panel">
          <h3>{{ m('Saved keys', 'Keys đã lưu', 'Key ที่บันทึกแล้ว') }}</h3>
          <article v-for="cred in providerCreds" :key="cred.id" class="or-byok-cred">
            <div>
              <strong>{{ cred.providerSlug }}</strong>
              <span class="or-app-muted"> · {{ cred.secretHint }}</span>
              <p v-if="cred.label" class="or-app-muted">{{ cred.label }}</p>
            </div>
            <div class="or-byok-cred-actions">
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :disabled="refreshing || credentialActionId === cred.id"
                @click="onTestCredential(cred.id)"
              >
                Test
              </button>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :title="fallbackHelp"
                :disabled="refreshing || credentialActionId === cred.id"
                @click="onToggleFallback(cred)"
              >
                {{ cred.sharedFallback ? m('Fallback: on', 'Fallback: bật', 'Fallback: เปิด') : m('Fallback: off', 'Fallback: tắt', 'Fallback: ปิด') }}
              </button>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :disabled="refreshing || credentialActionId === cred.id"
                @click="onDeleteCredential(cred)"
              >
                {{ m('Delete', 'Xóa', 'ลบ') }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div
        v-else-if="activeTab === 'gommo'"
        class="or-byok-panel"
        :class="{ 'or-byok-panel--refreshing': refreshing }"
      >
        <p v-if="status?.primaryGommo?.primary" class="or-app-panel or-byok-meta">
          {{
            m(
              `Media jobs use primary: ${status.primaryGommo.primary.domain} (@${status.primaryGommo.primary.username || '—'})`,
              `Media jobs dùng primary: ${status.primaryGommo.primary.domain} (@${status.primaryGommo.primary.username || '—'})`,
              `งาน media ใช้ primary: ${status.primaryGommo.primary.domain} (@${status.primaryGommo.primary.username || '—'})`,
            )
          }}
        </p>
        <p class="or-app-muted">
          {{
            m(
              'Link a Gommo domain with your current login session — media/upload/audio bill against the primary account.',
              'Liên kết domain Gommo bằng session đang đăng nhập — media/upload/audio trừ credit trên account primary.',
              'เชื่อมโดเมน Gommo ด้วยเซสชันที่ล็อกอินอยู่ — media/upload/audio หัก credit จากบัญชี primary',
            )
          }}
        </p>

        <div class="or-app-panel or-byok-form">
          <h3>{{ m('Link account', 'Liên kết account', 'เชื่อมบัญชี') }}</h3>
          <label class="or-byok-field">
            <span>Domain</span>
            <input v-model="gommoDomain" type="text" placeholder="79ai.net" />
          </label>
          <label class="or-byok-field">
            <span>{{ m('Label (optional)', 'Nhãn (tuỳ chọn)', 'ชื่อ (ไม่บังคับ)') }}</span>
            <input v-model="gommoLabel" type="text" />
          </label>
          <button
            type="button"
            class="or-app-btn or-app-btn-primary or-app-btn-sm or-byok-form-submit"
            :disabled="refreshing || !gommoDomain.trim()"
            @click="onLinkGommo"
          >
            {{ m('Link current session', 'Liên kết session hiện tại', 'เชื่อมเซสชันปัจจุบัน') }}
          </button>
        </div>

        <div v-if="gommoCreds.length" class="or-app-panel">
          <h3>Accounts</h3>
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
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :disabled="refreshing || credentialActionId === cred.id"
                @click="onSetPrimary(cred.id)"
              >
                {{ m('Set primary', 'Đặt primary', 'ตั้ง primary') }}
              </button>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :disabled="refreshing || credentialActionId === cred.id"
                @click="onTestCredential(cred.id)"
              >
                Test
              </button>
              <button
                type="button"
                class="or-app-btn or-app-btn-ghost or-app-btn-sm"
                :disabled="refreshing || credentialActionId === cred.id"
                @click="onDeleteCredential(cred)"
              >
                {{ m('Delete', 'Xóa', 'ลบ') }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="or-byok-panel" :class="{ 'or-byok-panel--refreshing': refreshing }">
        <div class="or-byok-usage-head">
          <p class="or-app-muted or-byok-usage-intro">
            {{
              m(
                'Last 7 days — BYOK vs platform (Gommo fallback) requests. Media usage is on Activity.',
                'Thống kê 7 ngày — request BYOK vs platform (Gommo fallback). Media usage xem Activity.',
                '7 วันล่าสุด — request BYOK vs platform (Gommo fallback) การใช้ media ดูที่ Activity',
              )
            }}
          </p>
          <a :href="activityHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
            Activity →
          </a>
        </div>

        <div v-if="usageSummary" class="or-byok-usage-grid">
          <article class="or-app-panel or-byok-usage-card">
            <h3>BYOK</h3>
            <p class="or-byok-usage-value">{{ usageSummary.byokRequests }}</p>
            <p class="or-app-muted">{{ m('requests', 'request', 'request') }}</p>
          </article>
          <article class="or-app-panel or-byok-usage-card">
            <h3>Platform</h3>
            <p class="or-byok-usage-value">{{ usageSummary.platformRequests }}</p>
            <p class="or-app-muted">{{ m('Gommo requests', 'request Gommo', 'request Gommo') }}</p>
          </article>
          <article class="or-app-panel or-byok-usage-card">
            <h3>{{ m('BYOK errors', 'Lỗi BYOK', 'ข้อผิดพลาด BYOK') }}</h3>
            <p class="or-byok-usage-value">{{ usageSummary.byokErrors }}</p>
          </article>
          <article class="or-app-panel or-byok-usage-card">
            <h3>{{ m('BYOK fees', 'Phí BYOK', 'ค่าธรรมเนียม BYOK') }}</h3>
            <p class="or-byok-usage-value">{{ formatCredits(usageSummary.totalPlatformFeeCredits) }}</p>
            <p class="or-app-muted">{{ m('credits (7d)', 'credit (7 ngày)', 'credit (7 วัน)') }}</p>
          </article>
        </div>

        <div v-if="usageEvents.length" class="or-app-panel">
          <h3>{{ m('Recent', 'Gần đây', 'ล่าสุด') }}</h3>
          <article v-for="event in usageEvents" :key="event.id" class="or-byok-usage-row">
            <div class="or-byok-usage-row-title">
              <span
                class="or-byok-source-badge"
                :class="`or-byok-source-badge--${eventSourceTone(event)}`"
              >
                {{ eventSourceLabel(event) }}
              </span>
              <span class="or-app-muted"> · {{ event.provider || '—' }} · {{ event.model }}</span>
            </div>
            <div class="or-byok-usage-row-meta">
              <span class="or-obs-delivery-badge" :class="`or-obs-delivery-badge--${eventStatusTone(event)}`">
                {{ eventStatusLabel(event) }}
              </span>
              <span class="or-app-muted">
                {{ formatUsageTime(event.at) }}
                · {{ event.latencyMs }}ms
              </span>
            </div>
          </article>
        </div>
        <p v-else class="or-app-muted">{{ m('No usage yet.', 'Chưa có usage.', 'ยังไม่มี usage') }}</p>
      </div>

      <div class="or-byok-quicklinks">
        <a :href="chatAppHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          Chat →
        </a>
        <a :href="chatDocsHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          Chat API →
        </a>
        <a :href="tokenHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Access token', 'Access token', 'Access token') }} →
        </a>
        <a :href="activityHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          Activity →
        </a>
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

.or-byok-form-submit {
  justify-self: start;
  width: auto;
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

.or-byok-usage-row-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.or-byok-source-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.or-byok-source-badge--byok {
  background: color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent);
  color: var(--vp-c-brand-1);
}

.or-byok-source-badge--platform {
  background: color-mix(in srgb, var(--or-text-muted, var(--vp-c-text-2)) 12%, transparent);
  color: var(--or-text-muted, var(--vp-c-text-2));
}

.or-byok-usage-row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  margin-top: 0.25rem;
}

.or-byok-usage-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.or-byok-usage-intro {
  flex: 1;
  min-width: 12rem;
  margin: 0;
}

.or-byok-action-success {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: #15803d;
}

.or-byok-action-error {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
}

.or-byok-quicklinks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.or-byok-refresh-hint {
  margin: 0 0 0.65rem;
  font-size: 0.75rem;
  color: var(--or-text-muted, var(--vp-c-text-2));
}

.or-byok-panel--refreshing,
.or-byok-meta--refreshing,
.or-byok-quickstart--refreshing {
  opacity: 0.72;
  pointer-events: none;
  transition: opacity 0.12s ease;
}
</style>
