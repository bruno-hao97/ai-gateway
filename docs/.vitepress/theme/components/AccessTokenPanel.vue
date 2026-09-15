<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
import { clearAuth, getStoredDomain, getStoredToken, STORAGE_TOKEN } from '../models/auth-api';
import {
  GOMMO_AUTH_HOST_LABEL,
  GOMMO_MCP_URL,
  GOMMO_V2_HOST,
  GOMMO_V2_HOST_LABEL,
} from '../models/gommo-hosts';
import { activityHubHref } from '../models/activity-hub-url';
import { apiBase } from '../models/gateway-base';
import { formatApproxUsd } from '../models/invoice-buyer';
import type { PortalLocale } from '../models/portal-locale';
import { portalUsageLogsLanguage } from '../models/portal-gommo-lang';
import { fetchMe, fetchUsageLogs, formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import { listItemCreatedAt, normalizeUsageListItem, usageJobId } from '../models/usage-stats';

const TOKEN_COPIED_STORAGE_KEY = 'gateway_token_copied';

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
  token: string;
  maskedToken: string;
  displayName: string;
  username: string;
  credits: number;
  domain: string;
}>();

const emit = defineEmits<{
  tokenCopied: [];
}>();

const { isVi, m } = usePortalCopy(computed(() => props.locale));

type SnippetTab = 'gateway' | 'auth' | 'curl' | 'javascript' | 'python' | 'mcp';
type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'error';

const revealToken = ref(false);
const copied = ref(false);
const copiedSnippet = ref<SnippetTab | ''>('');
const activeTab = ref<SnippetTab>('gateway');
const accountStatus = ref<ConnectionStatus>('idle');
const gommoV2Status = ref<ConnectionStatus>('idle');
const accountMessage = ref('');
const gommoV2Message = ref('');
const connectionSuccess = ref('');
const connectionError = ref('');
const connectionV2Hint = ref('');
const copyError = ref('');
const lastVerifiedAt = ref<number | null>(null);
const lastActivityAt = ref('');
const lastActivityJobId = ref('');
const lastActivityLoading = ref(true);

const checksRunning = computed(
  () => accountStatus.value === 'checking' || gommoV2Status.value === 'checking',
);

const creditsApproxUsd = computed(() => (isVi.value ? '' : formatApproxUsd(props.credits)));

const appDomain = computed(() => props.domain.trim() || getStoredDomain());

const tokenPrefix = computed(() => {
  const t = props.token;
  if (!t) return '—';
  if (t.length <= 12) return t;
  return `${t.slice(0, 7)}…${t.slice(-4)}`;
});

const displayedToken = computed(() => (revealToken.value ? props.token : props.maskedToken));

const credentialName = computed(() => {
  if (props.username) return `@${props.username}`;
  return m('Default session', 'Phiên mặc định', 'เซสชันเริ่มต้น');
});

function statusLabel(status: ConnectionStatus, okLabel: string, errLabel: string): string {
  if (status === 'checking') return m('Checking…', 'Đang kiểm tra…', 'กำลังตรวจสอบ…');
  if (status === 'connected') return okLabel;
  if (status === 'error') return errLabel;
  return m('Not verified', 'Chưa kiểm tra', 'ยังไม่ได้ตรวจสอบ');
}

function statusClass(status: ConnectionStatus): string {
  if (status === 'connected') return 'or-token-status--ok';
  if (status === 'error') return 'or-token-status--err';
  if (status === 'checking') return 'or-token-status--pending';
  return 'or-token-status--idle';
}

const accountStatusLabel = computed(() =>
  statusLabel(
    accountStatus.value,
    m('Connected', 'Đã kết nối', 'เชื่อมต่อแล้ว'),
    m('Error', 'Lỗi', 'ข้อผิดพลาด'),
  ),
);

const gommoV2StatusLabel = computed(() =>
  statusLabel(
    gommoV2Status.value,
    m('Reachable', 'Sẵn sàng', 'เข้าถึงได้'),
    m('Unreachable', 'Không phản hồi', 'ไม่สามารถเข้าถึง'),
  ),
);

const gatewayRoot = computed(() => {
  const base = apiBase();
  if (base) return base.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
});

const lastActivityHref = computed(() =>
  activityHubHref(props.prefix, {
    tab: 'explore',
    period: '30d',
    ...(lastActivityJobId.value ? { job: lastActivityJobId.value } : {}),
  }),
);

const mediaJobsDocsHref = computed(() => `${props.prefix}/features/media-jobs`);

const quickLinks = computed(() => [
  {
    id: 'activity',
    title: m('Activity', 'Activity', 'กิจกรรม'),
    desc: m(
      'Usage, job logs, and billing on the gateway.',
      'Usage, job logs và billing trên gateway.',
      'การใช้งาน บันทึกงาน และการเรียกเก็บเงินบนเกตเวย์',
    ),
    href: `${props.prefix}/app/activity/`,
    cta: m('Open Activity', 'Mở Activity', 'เปิด Activity'),
  },
  {
    id: 'observability',
    title: m('Observability', 'Observability', 'การสังเกต'),
    desc: m(
      'Job webhooks (beta) and local mirror.',
      'Webhook job (beta) và mirror local.',
      'Webhook งาน (เบต้า) และ mirror ในเครื่อง',
    ),
    href: `${props.prefix}/app/observability/`,
    cta: m('Open Observability', 'Mở Observability', 'เปิด Observability'),
  },
  {
    id: 'gommo-api',
    title: 'Gommo public API',
    desc: m(
      'v2.api.gommo.net + api.gommo.net — official hosts.',
      'v2.api.gommo.net + api.gommo.net — host chính thức.',
      'v2.api.gommo.net + api.gommo.net — โฮสต์อย่างเป็นทางการ',
    ),
    href: `${props.prefix}/reference/gommo-public-api`,
    cta: m('View API', 'Xem API', 'ดู API'),
  },
  {
    id: 'playground',
    title: m('Playground', 'Playground', 'สนามทดลอง'),
    desc: m(
      'Create image/video jobs in the browser.',
      'Tạo job ảnh/video trực tiếp trong browser.',
      'สร้างงานภาพ/วิดีโอในเบราว์เซอร์',
    ),
    href: `${props.prefix}/app/playground/`,
    cta: m('Open Playground', 'Mở Playground', 'เปิด Playground'),
  },
  {
    id: 'chat',
    title: m('Chat', 'Chat', 'แชท'),
    desc: m(
      'Streaming chat via the Gommo catalog.',
      'Chat streaming qua catalog Gommo.',
      'แชทสตรีมผ่านแคตตาล็อก Gommo',
    ),
    href: `${props.prefix}/app/chat/`,
    cta: m('Open Chat', 'Mở Chat', 'เปิด Chat'),
  },
  {
    id: 'mcp',
    title: m('MCP setup', 'Cấu hình MCP', 'ตั้งค่า MCP'),
    desc: m(
      '10 image/video tools for Cursor & IDE.',
      '10 tools ảnh/video cho Cursor & IDE.',
      '10 เครื่องมือภาพ/วิดีโอสำหรับ Cursor และ IDE',
    ),
    href: `${props.prefix}/mcp/other-hosts`,
    cta: m('Set up MCP', 'Cấu hình MCP', 'ตั้งค่า MCP'),
  },
]);

const lastVerifiedLabel = computed(() => {
  if (!lastVerifiedAt.value) return '—';
  const diff = Date.now() - lastVerifiedAt.value;
  if (diff < 60_000) return m('Just now', 'Vừa xong', 'เมื่อสักครู่');
  const min = Math.floor(diff / 60_000);
  return m(`${min}m ago`, `${min} phút trước`, `${min} นาทีที่แล้ว`);
});

const snippetTabs = computed(() => [
  { id: 'gateway' as const, label: 'Gateway' },
  { id: 'auth' as const, label: 'Authorization' },
  { id: 'curl' as const, label: 'curl (Gommo)' },
  { id: 'javascript' as const, label: 'JavaScript' },
  { id: 'python' as const, label: 'Python' },
  { id: 'mcp' as const, label: 'MCP JSON' },
]);

const snippets = computed(() => {
  const t = props.token || 'YOUR_ACCESS_TOKEN';
  const domain = appDomain.value || '79ai.net';
  const gw = gatewayRoot.value;
  const gatewayJobUrl = `${gw}/gateway/jobs/image`;
  const jobUrl = `${GOMMO_V2_HOST}/ai/jobs/image/MODEL_ID`;
  const formBody = `domain=${domain}&prompt=Hello`;
  return {
    gateway: `curl -X POST "${gatewayJobUrl}" \\
  -H "Authorization: Bearer ${t}" \\
  -H "Content-Type: application/json" \\
  -d '{"modelSlug":"MODEL_SLUG","wait":true,"fields":{"prompt":"Hello","ratio":"16:9"}}'`,
    auth: `Authorization: Bearer ${t}`,
    curl: `curl -X POST "${jobUrl}" \\
  -H "Authorization: Bearer ${t}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "${formBody}"`,
    javascript: `const res = await fetch("${jobUrl}", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${t}",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ domain: "${domain}", prompt: "Hello" }),
});
const data = await res.json();`,
    python: `import requests

url = "${jobUrl}"
headers = {
    "Authorization": f"Bearer ${t}",
    "Content-Type": "application/x-www-form-urlencoded",
}
payload = {"domain": "${domain}", "prompt": "Hello"}
response = requests.post(url, data=payload, headers=headers)
print(response.json())`,
    mcp: `{
  "mcpServers": {
    "79-ai": {
      "url": "${GOMMO_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${t}"
      }
    }
  }
}`,
  };
});

const activeSnippet = computed(() => snippets.value[activeTab.value]);

const publicApiHref = computed(() => `${props.prefix}/reference/gommo-public-api`);

function markCopiedFlag() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_COPIED_STORAGE_KEY, '1');
  }
  emit('tokenCopied');
}

async function copyToken() {
  if (!props.token) return;
  copyError.value = '';
  try {
    await navigator.clipboard.writeText(props.token);
    markCopiedFlag();
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    copyError.value = m(
      'Could not copy — try selecting the token and copying manually.',
      'Không copy được — thử chọn token và copy thủ công.',
      'ไม่สามารถคัดลอก — ลองเลือกโทเค็นและคัดลอกด้วยตนเอง',
    );
  }
}

async function copySnippet(tab: SnippetTab) {
  const text = snippets.value[tab];
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedSnippet.value = tab;
    setTimeout(() => {
      copiedSnippet.value = '';
    }, 2000);
  } catch {
    /* ignore */
  }
}

async function checkAccount(): Promise<void> {
  if (!getStoredToken()) {
    accountStatus.value = 'error';
    accountMessage.value = m('No token found.', 'Chưa có token.', 'ไม่พบโทเค็น');
    return;
  }
  accountStatus.value = 'checking';
  accountMessage.value = '';
  try {
    await fetchMe();
    accountStatus.value = 'connected';
    lastVerifiedAt.value = Date.now();
  } catch (e) {
    accountStatus.value = 'error';
    accountMessage.value = e instanceof Error ? e.message : String(e);
  }
}

async function checkGommoV2(): Promise<void> {
  gommoV2Status.value = 'checking';
  gommoV2Message.value = '';
  try {
    const res = await fetch(`${GOMMO_V2_HOST}/ai/models?type=image`, { method: 'GET' });
    if (res.status >= 500) {
      gommoV2Status.value = 'error';
      gommoV2Message.value = `HTTP ${res.status}`;
      return;
    }
    gommoV2Status.value = 'connected';
  } catch (e) {
    gommoV2Status.value = 'error';
    gommoV2Message.value = e instanceof Error ? e.message : String(e);
  }
}

function clearConnectionFeedback() {
  connectionSuccess.value = '';
  connectionError.value = '';
  connectionV2Hint.value = '';
}

async function testConnection() {
  clearConnectionFeedback();
  await Promise.all([checkAccount(), checkGommoV2()]);
  if (accountStatus.value === 'connected') {
    connectionSuccess.value = m(
      'Gateway connected — token is valid.',
      'Kết nối gateway OK — token hợp lệ.',
      'เชื่อมต่อเกตเวย์สำเร็จ — โทเค็นถูกต้อง',
    );
    if (gommoV2Status.value !== 'connected') {
      connectionV2Hint.value = m(
        'Direct Jobs API (v2) unreachable from browser — use gateway or curl.',
        'Jobs API trực tiếp (v2) không kiểm tra được từ browser — dùng gateway hoặc curl.',
        'Jobs API (v2) โดยตรงไม่สามารถตรวจสอบจากเบราว์เซอร์ — ใช้เกตเวย์หรือ curl',
      );
    }
  } else if (accountStatus.value === 'error') {
    connectionError.value =
      accountMessage.value ||
      m('Could not connect to gateway.', 'Không kết nối được gateway.', 'ไม่สามารถเชื่อมต่อเกตเวย์');
  }
}

function signOut() {
  clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = props.prefix || '/';
  }
}

async function loadLastActivity() {
  lastActivityLoading.value = true;
  try {
    const data = await fetchUsageLogs({
      period: '30d',
      type: 'all',
      language: portalUsageLogsLanguage(props.locale),
      page: 1,
      limit: 1,
    });
    const row = data.items[0] ? normalizeUsageListItem(data.items[0]) : null;
    const created = row ? listItemCreatedAt(row) : '';
    lastActivityJobId.value = row ? usageJobId(row) : '';
    lastActivityAt.value = created ? formatUsageTime(created, props.locale) : '';
  } catch {
    lastActivityAt.value = '';
  } finally {
    lastActivityLoading.value = false;
  }
}

onMounted(() => {
  void testConnection();
  void loadLastActivity();
});

defineExpose({
  reload: async () => {
    await Promise.all([testConnection(), loadLastActivity()]);
  },
});
</script>

<template>
  <div class="or-token-page">
    <section class="or-token-credential" aria-labelledby="or-token-credential-title">
      <div class="or-token-credential-head">
        <div>
          <h2 id="or-token-credential-title" class="or-token-credential-title">
            {{ m('Session credential', 'Phiên truy cập', 'ข้อมูลรับรองเซสชัน') }}
          </h2>
          <p class="or-token-credential-sub">
            {{
              m(
                'Gommo Bearer token — use directly with api.gommo.net and v2.api.gommo.net.',
                'Bearer token Gommo — dùng trực tiếp với api.gommo.net và v2.api.gommo.net.',
                'โทเค็น Bearer Gommo — ใช้โดยตรงกับ api.gommo.net และ v2.api.gommo.net',
              )
            }}
          </p>
        </div>
        <div class="or-token-credential-actions">
          <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" :disabled="checksRunning" @click="testConnection">
            {{
              checksRunning
                ? m('Testing…', 'Đang kiểm tra…', 'กำลังทดสอบ…')
                : m('Test connection', 'Kiểm tra', 'ทดสอบการเชื่อมต่อ')
            }}
          </button>
          <button
            type="button"
            class="or-app-btn or-app-btn-primary"
            :disabled="!token"
            @click="copyToken"
          >
            {{ copied ? m('Copied!', 'Đã copy!', 'คัดลอกแล้ว!') : 'Copy token' }}
          </button>
        </div>
      </div>

      <div class="or-token-field">
        <code class="or-token-field-value">{{ displayedToken || '—' }}</code>
        <button
          type="button"
          class="or-token-field-btn"
          :disabled="!token"
          :title="
            revealToken
              ? m('Hide token', 'Ẩn token', 'ซ่อนโทเค็น')
              : m('Reveal token', 'Hiện token', 'แสดงโทเค็น')
          "
          @click="revealToken = !revealToken"
        >
          {{ revealToken ? m('Hide', 'Ẩn', 'ซ่อน') : m('Reveal', 'Hiện', 'แสดง') }}
        </button>
      </div>

      <p v-if="connectionError" class="or-token-connection-error or-token-connection-error--fail" role="alert">
        {{ connectionError }}
      </p>
      <p v-if="connectionSuccess" class="or-token-connection-success" role="status">{{ connectionSuccess }}</p>
      <p v-if="connectionV2Hint" class="or-token-connection-error" role="status">{{ connectionV2Hint }}</p>
      <p v-if="copyError" class="or-token-connection-error or-token-connection-error--fail" role="alert">
        {{ copyError }}
      </p>

      <div class="or-token-meta-table-wrap">
        <table class="or-token-meta-table">
          <thead>
            <tr>
              <th>{{ m('Name', 'Tên', 'ชื่อ') }}</th>
              <th>Prefix</th>
              <th>Domain</th>
              <th>Auth API</th>
              <th>Jobs API</th>
              <th>{{ m('Status', 'Trạng thái', 'สถานะ') }}</th>
              <th>{{ m('Last activity', 'Hoạt động cuối', 'กิจกรรมล่าสุด') }}</th>
              <th>{{ m('Balance', 'Số dư', 'ยอดคงเหลือ') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span class="or-token-meta-name">{{ credentialName }}</span>
                <span v-if="displayName && username" class="or-token-meta-sub">{{ displayName }}</span>
              </td>
              <td><code>{{ tokenPrefix }}</code></td>
              <td><code>{{ appDomain || '—' }}</code></td>
              <td><code class="or-token-meta-host">{{ GOMMO_AUTH_HOST_LABEL }}</code></td>
              <td><code class="or-token-meta-host">{{ GOMMO_V2_HOST_LABEL }}</code></td>
              <td>
                <span class="or-token-status" :class="statusClass(accountStatus)">{{ accountStatusLabel }}</span>
                <span v-if="lastVerifiedAt" class="or-token-meta-sub">{{ lastVerifiedLabel }}</span>
              </td>
              <td>
                <span v-if="lastActivityLoading" class="or-app-muted">…</span>
                <a
                  v-else-if="lastActivityAt"
                  :href="lastActivityHref"
                  class="or-token-activity-link"
                  :title="m('Open job in Activity', 'Mở job trong Activity', 'เปิดงานใน Activity')"
                >
                  {{ lastActivityAt }} →
                </a>
                <span v-else>{{ m('No jobs yet', 'Chưa có job', 'ยังไม่มีงาน') }}</span>
              </td>
              <td>
                <strong>{{ formatCredits(credits) }}</strong>
                <span v-if="creditsApproxUsd" class="or-token-meta-usd">{{ creditsApproxUsd }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="or-token-health" aria-label="Connection health">
        <li>
          <span class="or-token-health-label">{{ m('Account', 'Tài khoản', 'บัญชี') }}</span>
          <span class="or-token-status" :class="statusClass(accountStatus)">{{ accountStatusLabel }}</span>
          <span class="or-token-health-meta">{{ GOMMO_AUTH_HOST_LABEL }}</span>
          <span v-if="lastVerifiedAt" class="or-token-health-meta">{{ lastVerifiedLabel }}</span>
          <span v-if="accountMessage" class="or-token-health-error">{{ accountMessage }}</span>
        </li>
        <li>
          <span class="or-token-health-label">Jobs API</span>
          <span class="or-token-status" :class="statusClass(gommoV2Status)">{{ gommoV2StatusLabel }}</span>
          <span class="or-token-health-meta">{{ GOMMO_V2_HOST_LABEL }}</span>
          <span v-if="gommoV2Message" class="or-token-health-error">{{ gommoV2Message }}</span>
        </li>
      </ul>
    </section>

    <section class="or-token-snippets" aria-labelledby="or-token-snippets-title">
      <div class="or-token-snippets-head">
        <h2 id="or-token-snippets-title" class="or-token-snippets-title">
          {{ m('Integration kit', 'Tích hợp', 'ชุดการเชื่อมต่อ') }}
        </h2>
        <p class="or-token-snippets-sub">
          {{
            m(
              'Gommo public API snippets (form-urlencoded) and MCP JSON.',
              'Snippet Gommo public API (form-urlencoded) và MCP JSON.',
              'ตัวอย่าง Gommo public API (form-urlencoded) และ MCP JSON',
            )
          }}
        </p>
      </div>

      <div class="or-token-tabs" role="tablist">
        <button
          v-for="tab in snippetTabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="or-token-tab"
          :class="{ 'or-token-tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="or-token-snippet-panel">
        <pre class="or-app-code or-token-snippet-code"><code>{{ activeSnippet }}</code></pre>
        <div class="or-token-snippet-actions">
          <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" @click="copySnippet(activeTab)">
            {{ copiedSnippet === activeTab ? m('Copied!', 'Đã copy!', 'คัดลอกแล้ว!') : 'Copy snippet' }}
          </button>
          <a v-if="activeTab === 'gateway'" :href="mediaJobsDocsHref" class="or-token-snippet-link">
            {{ m('Media jobs (gateway)', 'Media jobs (gateway)', 'งานมีเดีย (เกตเวย์)') }} →
          </a>
          <a
            v-else-if="activeTab === 'mcp'"
            :href="`${prefix}/mcp/other-hosts`"
            class="or-token-snippet-link"
          >
            {{ m('Full MCP setup', 'Hướng dẫn MCP đầy đủ', 'คู่มือตั้งค่า MCP ฉบับเต็ม') }} →
          </a>
          <a v-else :href="publicApiHref" class="or-token-snippet-link">
            Gommo public API →
          </a>
        </div>
      </div>
    </section>

    <section class="or-token-quicklinks" aria-labelledby="or-token-quicklinks-title">
      <h2 id="or-token-quicklinks-title" class="or-token-quicklinks-title">
        {{ m('Use this token', 'Dùng token này', 'ใช้โทเค็นนี้') }}
      </h2>
      <div class="or-app-grid or-token-quicklinks-grid">
        <a v-for="link in quickLinks" :key="link.id" :href="link.href" class="or-app-card or-token-quicklink-card">
          <h3>{{ link.title }}</h3>
          <p>{{ link.desc }}</p>
          <span class="or-app-card-cta">{{ link.cta }} →</span>
        </a>
      </div>
    </section>

    <section class="or-token-security" aria-labelledby="or-token-security-title">
      <h2 id="or-token-security-title" class="or-token-security-title">
        {{ m('Security & scope', 'Bảo mật & phạm vi', 'ความปลอดภัยและขอบเขต') }}
      </h2>
      <ul class="or-token-security-list">
        <li>
          {{
            m(
              `Token is stored in this browser's localStorage (\`${STORAGE_TOKEN}\`).`,
              `Token lưu trong localStorage (\`${STORAGE_TOKEN}\`) trên trình duyệt này.`,
              `โทเค็นถูกเก็บใน localStorage (\`${STORAGE_TOKEN}\`) ของเบราว์เซอร์นี้`,
            )
          }}
        </li>
        <li>
          {{
            m(
              `Call ${GOMMO_AUTH_HOST_LABEL} (auth, chat) and ${GOMMO_V2_HOST_LABEL} (models, jobs) directly — not a merchant token.`,
              `Gọi trực tiếp ${GOMMO_AUTH_HOST_LABEL} (auth, chat) và ${GOMMO_V2_HOST_LABEL} (models, jobs) — không phải merchant token.`,
              `เรียก ${GOMMO_AUTH_HOST_LABEL} (auth, chat) และ ${GOMMO_V2_HOST_LABEL} (models, jobs) โดยตรง — ไม่ใช่ merchant token`,
            )
          }}
        </li>
        <li>
          {{
            m(
              'Rotate: sign out or paste a new token on the login page.',
              'Đổi token: đăng xuất hoặc paste token mới tại trang đăng nhập.',
              'เปลี่ยนโทเค็น: ออกจากระบบหรือวางโทเค็นใหม่ที่หน้าเข้าสู่ระบบ',
            )
          }}
        </li>
      </ul>
      <div class="or-token-security-actions">
        <a :href="publicApiHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          Gommo public API
        </a>
        <a :href="`${prefix}/login/`" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ m('Paste new token', 'Paste token mới', 'วางโทเค็นใหม่') }}
        </a>
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" @click="signOut">
          {{ m('Sign out', 'Đăng xuất', 'ออกจากระบบ') }}
        </button>
      </div>
    </section>
  </div>
</template>
