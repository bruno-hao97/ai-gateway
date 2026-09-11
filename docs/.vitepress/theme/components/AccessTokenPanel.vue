<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { clearAuth, getStoredDomain, getStoredToken, STORAGE_TOKEN } from '../models/auth-api';
import {
  GOMMO_AUTH_HOST_LABEL,
  GOMMO_MCP_URL,
  GOMMO_V2_HOST,
  GOMMO_V2_HOST_LABEL,
} from '../models/gommo-hosts';
import { formatApproxUsd } from '../models/invoice-buyer';
import { fetchMe, fetchUsageLogs, formatCredits } from '../models/user-api';
import { formatUsageTime } from '../models/usage-history';
import { listItemCreatedAt } from '../models/usage-stats';

const TOKEN_COPIED_STORAGE_KEY = 'gateway_token_copied';

const props = defineProps<{
  isVi: boolean;
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

type SnippetTab = 'auth' | 'curl' | 'javascript' | 'python' | 'mcp';
type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'error';

const revealToken = ref(false);
const copied = ref(false);
const copiedSnippet = ref<SnippetTab | ''>('');
const activeTab = ref<SnippetTab>('auth');
const accountStatus = ref<ConnectionStatus>('idle');
const gommoV2Status = ref<ConnectionStatus>('idle');
const accountMessage = ref('');
const gommoV2Message = ref('');
const lastVerifiedAt = ref<number | null>(null);
const lastActivityAt = ref('');
const lastActivityLoading = ref(true);

const checksRunning = computed(
  () => accountStatus.value === 'checking' || gommoV2Status.value === 'checking',
);

const creditsApproxUsd = computed(() => (props.isVi ? '' : formatApproxUsd(props.credits)));

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
  return props.isVi ? 'Phiên mặc định' : 'Default session';
});

function statusLabel(status: ConnectionStatus, okLabel: string, errLabel: string): string {
  if (status === 'checking') return props.isVi ? 'Đang kiểm tra…' : 'Checking…';
  if (status === 'connected') return okLabel;
  if (status === 'error') return errLabel;
  return props.isVi ? 'Chưa kiểm tra' : 'Not verified';
}

function statusClass(status: ConnectionStatus): string {
  if (status === 'connected') return 'or-token-status--ok';
  if (status === 'error') return 'or-token-status--err';
  if (status === 'checking') return 'or-token-status--pending';
  return 'or-token-status--idle';
}

const accountStatusLabel = computed(() =>
  statusLabel(accountStatus.value, props.isVi ? 'Đã kết nối' : 'Connected', props.isVi ? 'Lỗi' : 'Error'),
);

const gommoV2StatusLabel = computed(() =>
  statusLabel(
    gommoV2Status.value,
    props.isVi ? 'Sẵn sàng' : 'Reachable',
    props.isVi ? 'Không phản hồi' : 'Unreachable',
  ),
);

const quickLinks = computed(() => [
  {
    id: 'gommo-api',
    title: props.isVi ? 'Gommo public API' : 'Gommo public API',
    desc: props.isVi ? 'v2.api.gommo.net + api.gommo.net — host chính thức.' : 'v2.api.gommo.net + api.gommo.net — official hosts.',
    href: `${props.prefix}/reference/gommo-public-api`,
    cta: props.isVi ? 'Xem API' : 'View API',
  },
  {
    id: 'playground',
    title: 'Playground',
    desc: props.isVi ? 'Tạo job ảnh/video trực tiếp trong browser.' : 'Create image/video jobs in the browser.',
    href: `${props.prefix}/app/playground/`,
    cta: props.isVi ? 'Mở Playground' : 'Open Playground',
  },
  {
    id: 'chat',
    title: 'Chat',
    desc: props.isVi ? 'Chat streaming qua catalog Gommo.' : 'Streaming chat via the Gommo catalog.',
    href: `${props.prefix}/app/chat/`,
    cta: props.isVi ? 'Mở Chat' : 'Open Chat',
  },
  {
    id: 'mcp',
    title: props.isVi ? 'MCP setup' : 'MCP setup',
    desc: props.isVi ? '10 tools ảnh/video cho Cursor & IDE.' : '10 image/video tools for Cursor & IDE.',
    href: `${props.prefix}/mcp/other-hosts`,
    cta: props.isVi ? 'Cấu hình MCP' : 'Set up MCP',
  },
]);

const lastVerifiedLabel = computed(() => {
  if (!lastVerifiedAt.value) return '—';
  const diff = Date.now() - lastVerifiedAt.value;
  if (diff < 60_000) return props.isVi ? 'Vừa xong' : 'Just now';
  const min = Math.floor(diff / 60_000);
  return props.isVi ? `${min} phút trước` : `${min}m ago`;
});

const snippetTabs = computed(() => [
  { id: 'auth' as const, label: props.isVi ? 'Authorization' : 'Authorization' },
  { id: 'curl' as const, label: 'curl' },
  { id: 'javascript' as const, label: 'JavaScript' },
  { id: 'python' as const, label: 'Python' },
  { id: 'mcp' as const, label: props.isVi ? 'MCP JSON' : 'MCP JSON' },
]);

const snippets = computed(() => {
  const t = props.token || 'YOUR_ACCESS_TOKEN';
  const domain = appDomain.value || '79ai.net';
  const jobUrl = `${GOMMO_V2_HOST}/ai/jobs/image/MODEL_ID`;
  const formBody = `domain=${domain}&prompt=Hello`;
  return {
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
  try {
    await navigator.clipboard.writeText(props.token);
    markCopiedFlag();
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    /* ignore */
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
    accountMessage.value = props.isVi ? 'Chưa có token.' : 'No token found.';
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
      gommoV2Message.value = props.isVi ? `HTTP ${res.status}` : `HTTP ${res.status}`;
      return;
    }
    gommoV2Status.value = 'connected';
  } catch (e) {
    gommoV2Status.value = 'error';
    gommoV2Message.value = e instanceof Error ? e.message : String(e);
  }
}

async function testConnection() {
  await Promise.all([checkAccount(), checkGommoV2()]);
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
      language: 'VI',
      page: 1,
      limit: 1,
    });
    const row = data.items[0];
    const created = row ? listItemCreatedAt(row) : '';
    lastActivityAt.value = created ? formatUsageTime(created, props.isVi) : '';
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
            {{ isVi ? 'Phiên truy cập' : 'Session credential' }}
          </h2>
          <p class="or-token-credential-sub">
            {{
              isVi
                ? 'Bearer token Gommo — dùng trực tiếp với api.gommo.net và v2.api.gommo.net.'
                : 'Gommo Bearer token — use directly with api.gommo.net and v2.api.gommo.net.'
            }}
          </p>
        </div>
        <div class="or-token-credential-actions">
          <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" :disabled="checksRunning" @click="testConnection">
            {{ checksRunning ? (isVi ? 'Đang kiểm tra…' : 'Testing…') : isVi ? 'Kiểm tra' : 'Test connection' }}
          </button>
          <button
            type="button"
            class="or-app-btn or-app-btn-primary"
            :disabled="!token"
            @click="copyToken"
          >
            {{ copied ? (isVi ? 'Đã copy!' : 'Copied!') : isVi ? 'Copy token' : 'Copy token' }}
          </button>
        </div>
      </div>

      <div class="or-token-field">
        <code class="or-token-field-value">{{ displayedToken || '—' }}</code>
        <button
          type="button"
          class="or-token-field-btn"
          :disabled="!token"
          :title="revealToken ? (isVi ? 'Ẩn token' : 'Hide token') : isVi ? 'Hiện token' : 'Reveal token'"
          @click="revealToken = !revealToken"
        >
          {{ revealToken ? (isVi ? 'Ẩn' : 'Hide') : isVi ? 'Hiện' : 'Reveal' }}
        </button>
      </div>

      <div class="or-token-meta-table-wrap">
        <table class="or-token-meta-table">
          <thead>
            <tr>
              <th>{{ isVi ? 'Tên' : 'Name' }}</th>
              <th>{{ isVi ? 'Prefix' : 'Prefix' }}</th>
              <th>Domain</th>
              <th>{{ isVi ? 'Auth API' : 'Auth API' }}</th>
              <th>{{ isVi ? 'Jobs API' : 'Jobs API' }}</th>
              <th>{{ isVi ? 'Trạng thái' : 'Status' }}</th>
              <th>{{ isVi ? 'Hoạt động cuối' : 'Last activity' }}</th>
              <th>{{ isVi ? 'Số dư' : 'Balance' }}</th>
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
                <span v-else>{{ lastActivityAt || (isVi ? 'Chưa có job' : 'No jobs yet') }}</span>
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
          <span class="or-token-health-label">{{ isVi ? 'Tài khoản' : 'Account' }}</span>
          <span class="or-token-status" :class="statusClass(accountStatus)">{{ accountStatusLabel }}</span>
          <span class="or-token-health-meta">{{ GOMMO_AUTH_HOST_LABEL }}</span>
          <span v-if="lastVerifiedAt" class="or-token-health-meta">{{ lastVerifiedLabel }}</span>
          <span v-if="accountMessage" class="or-token-health-error">{{ accountMessage }}</span>
        </li>
        <li>
          <span class="or-token-health-label">{{ isVi ? 'Jobs API' : 'Jobs API' }}</span>
          <span class="or-token-status" :class="statusClass(gommoV2Status)">{{ gommoV2StatusLabel }}</span>
          <span class="or-token-health-meta">{{ GOMMO_V2_HOST_LABEL }}</span>
          <span v-if="gommoV2Message" class="or-token-health-error">{{ gommoV2Message }}</span>
        </li>
      </ul>
    </section>

    <section class="or-token-snippets" aria-labelledby="or-token-snippets-title">
      <div class="or-token-snippets-head">
        <h2 id="or-token-snippets-title" class="or-token-snippets-title">
          {{ isVi ? 'Tích hợp' : 'Integration kit' }}
        </h2>
        <p class="or-token-snippets-sub">
          {{
            isVi
              ? 'Snippet Gommo public API (form-urlencoded) và MCP JSON.'
              : 'Gommo public API snippets (form-urlencoded) and MCP JSON.'
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
            {{
              copiedSnippet === activeTab
                ? isVi
                  ? 'Đã copy!'
                  : 'Copied!'
                : isVi
                  ? 'Copy snippet'
                  : 'Copy snippet'
            }}
          </button>
          <a
            v-if="activeTab === 'mcp'"
            :href="`${prefix}/mcp/other-hosts`"
            class="or-token-snippet-link"
          >
            {{ isVi ? 'Hướng dẫn MCP đầy đủ' : 'Full MCP setup' }} →
          </a>
          <a v-else :href="publicApiHref" class="or-token-snippet-link">
            {{ isVi ? 'Gommo public API' : 'Gommo public API' }} →
          </a>
        </div>
      </div>
    </section>

    <section class="or-token-quicklinks" aria-labelledby="or-token-quicklinks-title">
      <h2 id="or-token-quicklinks-title" class="or-token-quicklinks-title">
        {{ isVi ? 'Dùng token này' : 'Use this token' }}
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
        {{ isVi ? 'Bảo mật & phạm vi' : 'Security & scope' }}
      </h2>
      <ul class="or-token-security-list">
        <li>
          {{
            isVi
              ? `Token lưu trong localStorage (\`${STORAGE_TOKEN}\`) trên trình duyệt này.`
              : `Token is stored in this browser's localStorage (\`${STORAGE_TOKEN}\`).`
          }}
        </li>
        <li>
          {{
            isVi
              ? `Gọi trực tiếp ${GOMMO_AUTH_HOST_LABEL} (auth, chat) và ${GOMMO_V2_HOST_LABEL} (models, jobs) — không phải merchant token.`
              : `Call ${GOMMO_AUTH_HOST_LABEL} (auth, chat) and ${GOMMO_V2_HOST_LABEL} (models, jobs) directly — not a merchant token.`
          }}
        </li>
        <li>
          {{
            isVi
              ? 'Đổi token: đăng xuất hoặc paste token mới tại trang đăng nhập.'
              : 'Rotate: sign out or paste a new token on the login page.'
          }}
        </li>
      </ul>
      <div class="or-token-security-actions">
        <a :href="publicApiHref" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ isVi ? 'Gommo public API' : 'Gommo public API' }}
        </a>
        <a :href="`${prefix}/login/`" class="or-app-btn or-app-btn-ghost or-app-btn-sm">
          {{ isVi ? 'Paste token mới' : 'Paste new token' }}
        </a>
        <button type="button" class="or-app-btn or-app-btn-ghost or-app-btn-sm" @click="signOut">
          {{ isVi ? 'Đăng xuất' : 'Sign out' }}
        </button>
      </div>
    </section>
  </div>
</template>
