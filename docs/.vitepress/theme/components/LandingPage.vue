<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useHybridLocale } from '../composables/use-hybrid-locale';
import { pickMsg } from '../models/portal-locale';
import { GOMMO_V2_HOST } from '../models/gommo-hosts';
import {
  JOB_TYPES,
  catalogProviders,
  fetchAllModels,
  providerInitials,
  sortModels,
  type CatalogLang,
  type CatalogModel,
} from '../models/catalog-api';

const { locale, prefix, t } = useHybridLocale();
const catalogLang = computed((): CatalogLang => locale.value);

function m(en: string, vi: string, th?: string): string {
  return pickMsg(locale.value, en, vi, th);
}

const quickstartLink = computed(() => `${prefix.value}/quickstart`);
const loginLink = computed(() => `${prefix.value}/login/`);
const signupLink = computed(() => `${prefix.value}/signup/`);
const modelsLink = computed(() => `${prefix.value}/models/`);
const compareLink = computed(() => `${prefix.value}/models/compare/`);
const chatLink = computed(() => `${prefix.value}/app/chat/`);
const playgroundLink = computed(() => `${prefix.value}/app/playground/`);
const creditsLink = computed(() => `${prefix.value}/app/credits/`);
const mcpLink = computed(() => `${prefix.value}/mcp/`);
const apiLink = computed(() => `${prefix.value}/reference/openapi`);
const privacyPolicyLink = computed(() => `${prefix.value}/privacy-policy/`);
const aboutLink = computed(() => `${prefix.value}/about/`);


function playgroundHref(opts?: { type?: string; model?: string }): string {
  const base = playgroundLink.value;
  if (!opts?.type && !opts?.model) return base;
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.model) params.set('model', opts.model);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

const loading = ref(true);
const allModels = ref<CatalogModel[]>([]);

const stats = computed(() => ({
  models: allModels.value.length || '—',
  jobTypes: JOB_TYPES.length,
  providers: catalogProviders(allModels.value).length || '—',
}));

const tableModels = computed(() => sortModels(allModels.value, 'newest').slice(0, 10));

const toolChips = computed(() =>
  JOB_TYPES.map((jt) => ({
    id: jt.id,
    label: jt.label,
    href: playgroundHref({ type: jt.id }),
  })),
);

const pillars = computed(() => [
  {
    n: '01',
    title: m('One gate, one contract', 'Một cổng, một contract', 'หนึ่งเกตเวย์ หนึ่งสัญญา'),
    desc: m(
      'Official hosts v2.api.gommo.net and api.gommo.net — one Bearer token for catalog, jobs, chat, and billing.',
      'Host chính thức v2.api.gommo.net và api.gommo.net — một Bearer token cho catalog, jobs, chat và billing.',
      'โฮสต์อย่างเป็นทางการ v2.api.gommo.net และ api.gommo.net — Bearer token เดียวสำหรับแคตตาล็อก งาน แชท และ billing',
    ),
  },
  {
    n: '02',
    title: m('Catalog is source of truth', 'Catalog là nguồn sự thật', 'แคตตาล็อกคือแหล่งความจริง'),
    desc: m(
      'Never guess ratio, mode, or resolution — read POST v2.api.gommo.net/ai/models before every job.',
      'Không đoán ratio, mode hay resolution — đọc POST v2.api.gommo.net/ai/models trước mỗi job.',
      'ไม่เดา ratio mode resolution — อ่าน POST v2.api.gommo.net/ai/models ก่อนทุกงาน',
    ),
  },
  {
    n: '03',
    title: m('Portal + API + MCP', 'Portal + API + MCP', 'Portal + API + MCP'),
    desc: m(
      'Chat and Playground for humans; REST, OpenAPI, and 10 MCP tools for agents.',
      'Chat và Playground cho người dùng; REST, OpenAPI và 10 MCP tools cho agent.',
      'แชทและ Playground สำหรับคน REST OpenAPI และ 10 MCP tools สำหรับ agent',
    ),
  },
  {
    n: '04',
    title: m('Secrets stay server-side', 'Secret ở server', 'ความลับอยู่ฝั่งเซิร์ฟเวอร์'),
    desc: m(
      'Merchant token and billing keys never appear in the browser or public SDK.',
      'Merchant token và billing keys không bao giờ xuất hiện trong browser hay SDK public.',
      'Merchant token และ billing keys ไม่ปรากฏในเบราว์เซอร์หรือ SDK สาธารณะ',
    ),
  },
]);

const routeNodes = computed(() => [
  { label: m('Client', 'Client', 'ไคลเอนต์'), sub: 'Browser · mobile · script' },
  {
    label: 'AI Gateway',
    sub: m('REST · proxy · portal', 'REST · proxy · portal', 'REST · proxy · portal'),
    core: true,
  },
  {
    label: 'Gommo',
    sub: m('Models · jobs · billing', 'Models · jobs · billing', 'โมเดล · งาน · billing'),
  },
]);

const codeSample = computed(() => {
  const v2 = GOMMO_V2_HOST;
  return `$ curl -X POST ${v2}/ai/models?type=image
$ curl -X POST ${v2}/ai/jobs/image/MODEL_ID \\
    -H "Authorization: Bearer $TOKEN" \\
    -d "domain=79ai.net&prompt=Hello&ratio=FROM_CATALOG"`;
});

function jobTypeLabel(id: string): string {
  return JOB_TYPES.find((jt) => jt.id === id)?.label ?? id;
}

onMounted(async () => {
  try {
    allModels.value = await fetchAllModels(catalogLang.value);
  } catch {
    allModels.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="gw-landing">
    <section class="gw-hero">
      <div class="gw-hero-grid" aria-hidden="true" />
      <div class="gw-hero-layout">
        <div class="gw-hero-copy">
          <p class="gw-hero-index">{{ t('GATEWAY · GOMMO', 'GATEWAY · GOMMO', 'GATEWAY · GOMMO') }}</p>
          <h1 class="gw-hero-title">
            {{
              t(
                'One URL between you and every Gommo model.',
                'Một URL giữa bạn và mọi model Gommo.',
                'URL เดียวเชื่อมคุณกับทุกโมเดล Gommo',
              )
            }}
          </h1>
          <p class="gw-hero-sub">
            {{
              t(
                'AI Gateway is not another studio — it is the routing layer: catalog, jobs, chat, credits, and docs behind a single deployable API.',
                'AI Gateway không phải studio khác — là tầng routing: catalog, jobs, chat, credits và docs sau một API deploy được.',
                'AI Gateway ไม่ใช่สตูดิโออื่น — เป็นชั้น routing: แคตตาล็อก งาน แชท เครดิต และเอกสาร หลัง API เดียวที่ deploy ได้',
              )
            }}
          </p>
          <div class="gw-hero-actions">
            <a :href="playgroundLink" class="gw-btn gw-btn-primary">{{
              t('Try API Playground', 'Thử API Playground', 'ลอง API Playground')
            }}</a>
            <a :href="quickstartLink" class="gw-btn gw-btn-outline">{{
              t('Read Quickstart', 'Đọc Quickstart', 'อ่าน Quickstart')
            }}</a>
          </div>
          <p class="gw-hero-note">
            {{
              t(
                'Sign in via Connection — then pick a model and send a request.',
                'Đăng nhập qua Connection — chọn model và gửi request.',
                'เข้าสู่ระบบผ่าน Connection — เลือกโมเดลแล้วส่งคำขอ',
              )
            }}
          </p>
          <p class="gw-hero-trust">
            <a :href="signupLink">{{ t('Create account', 'Tạo tài khoản', 'สร้างบัญชี') }}</a>
            <span aria-hidden="true">/</span>
            <a :href="loginLink">{{ t('Sign in', 'Đăng nhập', 'เข้าสู่ระบบ') }}</a>
            <span aria-hidden="true">/</span>
            <a :href="aboutLink">{{ t('About', 'Về chúng tôi', 'เกี่ยวกับเรา') }}</a>
            <span aria-hidden="true">/</span>
            <a :href="privacyPolicyLink">{{ t('Privacy', 'Privacy', 'ความเป็นส่วนตัว') }}</a>
          </p>
        </div>

        <aside class="gw-route-panel" :aria-label="t('Request flow', 'Luồng request', 'ลำดับคำขอ')">
          <p class="gw-route-label">{{ t('REQUEST FLOW', 'LUỒNG REQUEST', 'ลำดับคำขอ') }}</p>
          <div class="gw-route-stack">
            <template v-for="(node, i) in routeNodes" :key="node.label">
              <div class="gw-route-node" :class="{ 'gw-route-node--core': node.core }">
                <span class="gw-route-node-name">{{ node.label }}</span>
                <span class="gw-route-node-sub">{{ node.sub }}</span>
              </div>
              <div v-if="i < routeNodes.length - 1" class="gw-route-connector">
                <span class="gw-route-connector-line" />
                <span class="gw-route-connector-tag">
                  {{ i === 0 ? 'Bearer / JSON' : 'upstream' }}
                </span>
              </div>
            </template>
          </div>
          <pre class="gw-route-terminal"><code>{{ codeSample }}</code></pre>
        </aside>
      </div>
    </section>

    <section class="gw-stats" :aria-label="t('Live catalog', 'Catalog live', 'แคตตาล็อกสด')">
      <div class="gw-stats-inner">
        <div class="gw-stat">
          <strong>{{ stats.models }}</strong>
          <span>{{ t('models indexed', 'models', 'โมเดล') }}</span>
        </div>
        <div class="gw-stat-divider" aria-hidden="true" />
        <div class="gw-stat">
          <strong>{{ stats.providers }}</strong>
          <span>{{ t('providers', 'providers', 'ผู้ให้บริการ') }}</span>
        </div>
        <div class="gw-stat-divider" aria-hidden="true" />
        <div class="gw-stat">
          <strong>{{ stats.jobTypes }}</strong>
          <span>{{ t('job types', 'loại job', 'ประเภทงาน') }}</span>
        </div>
        <div class="gw-stat-divider" aria-hidden="true" />
        <div class="gw-stat">
          <strong>10</strong>
          <span>{{ t('MCP tools', 'MCP tools', 'MCP tools') }}</span>
        </div>
      </div>
    </section>

    <section class="gw-section">
      <div class="gw-section-inner">
        <div class="gw-section-head">
          <div>
            <p class="gw-section-index">01</p>
            <h2 class="gw-section-title">{{ t('Catalog snapshot', 'Snapshot catalog', 'ภาพรวมแคตตาล็อก') }}</h2>
            <p class="gw-section-sub">
              {{
                t(
                  'Newest models from live Gommo — try endpoints in API Playground or compare side by side.',
                  'Models mới nhất từ Gommo live — thử endpoint trong API Playground hoặc so sánh.',
                  'โมเดลใหม่ล่าสุดจาก Gommo — ลอง endpoint ใน API Playground หรือเปรียบเทียบ',
                )
              }}
            </p>
          </div>
          <a :href="compareLink" class="gw-link-arrow">{{ t('Compare', 'So sánh', 'เปรียบเทียบ') }} →</a>
        </div>

        <p v-if="loading" class="gw-muted">{{ t('Loading…', 'Đang tải…', 'กำลังโหลด…') }}</p>
        <div v-else-if="tableModels.length" class="gw-model-table-wrap">
          <table class="gw-model-table">
            <thead>
              <tr>
                <th>{{ t('Model', 'Model', 'โมเดล') }}</th>
                <th>{{ t('Type', 'Loại', 'ประเภท') }}</th>
                <th>{{ t('Provider', 'Provider', 'ผู้ให้บริการ') }}</th>
                <th>{{ t('Credits', 'Credits', 'เครดิต') }}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in tableModels" :key="m.slug">
                <td class="gw-model-table-name">
                  <span class="or-provider-avatar or-provider-avatar--sm">{{
                    providerInitials(m.provider || m.slug)
                  }}</span>
                  <span>
                    <strong>{{ m.name }}</strong>
                    <code>{{ m.slug }}</code>
                  </span>
                </td>
                <td><span class="gw-type-tag">{{ jobTypeLabel(m.jobType) }}</span></td>
                <td class="gw-model-table-provider">{{ m.provider || '—' }}</td>
                <td class="gw-model-table-credits">{{ m.creditsLabel }}</td>
                <td class="gw-model-table-action">
                  <a :href="playgroundHref({ type: m.jobType, model: m.slug })">→</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="gw-muted">{{ t('Catalog offline.', 'Catalog offline.', 'แคตตาล็อกออฟไลน์') }}</p>
        <a :href="modelsLink" class="gw-text-link">{{ t('Full catalog', 'Toàn bộ catalog', 'แคตตาล็อกทั้งหมด') }} →</a>
      </div>
    </section>

    <section class="gw-section gw-section-muted">
      <div class="gw-section-inner">
        <p class="gw-section-index">02</p>
        <h2 class="gw-section-title">{{ t('Job surfaces', 'Job surfaces', 'ประเภทงาน') }}</h2>
        <p class="gw-section-sub gw-section-sub-below">
          {{
            t(
              'Each chip opens API Playground on the matching job type — login in the Connection panel.',
              'Mỗi chip mở API Playground với job type tương ứng — đăng nhập trong panel Connection.',
              'แต่ละ chip เปิด API Playground ตามประเภทงาน — เข้าสู่ระบบในแผง Connection',
            )
          }}
        </p>
        <div class="gw-tool-chips">
          <a v-for="chip in toolChips" :key="chip.id" :href="chip.href" class="gw-tool-chip">
            <span class="gw-tool-chip-prefix">//</span>{{ chip.label }}
          </a>
        </div>
      </div>
    </section>

    <section class="gw-section">
      <div class="gw-section-inner gw-split">
        <div class="gw-split-panel">
          <p class="gw-section-index">03</p>
          <h2 class="gw-split-title">{{ t('Use the portal', 'Dùng portal', 'ใช้ portal') }}</h2>
          <p class="gw-split-desc">
            {{
              t(
                'Chat streams SSE. Media Playground runs real jobs (sign in required). Credits wallet syncs with Gommo.',
                'Chat stream SSE. Media Playground chạy job thật (cần đăng nhập). Wallet credits sync Gommo.',
                'แชท stream SSE Media Playground รันงานจริง (ต้องเข้าสู่ระบบ) wallet เครดิต sync กับ Gommo',
              )
            }}
          </p>
          <div class="gw-split-links">
            <a :href="chatLink" class="gw-btn gw-btn-primary">{{ t('Chat', 'Chat', 'แชท') }}</a>
            <a :href="playgroundLink" class="gw-btn gw-btn-outline">{{
              t('Media Playground', 'Media Playground', 'สนามทดลองมีเดีย')
            }}</a>
            <a :href="creditsLink" class="gw-btn gw-btn-outline">{{ t('Credits', 'Credits', 'เครดิต') }}</a>
          </div>
        </div>
        <div class="gw-split-panel">
          <p class="gw-section-index">04</p>
          <h2 class="gw-split-title">{{ t('Ship with the API', 'Ship với API', 'พัฒนาด้วย API') }}</h2>
          <p class="gw-split-desc">
            {{
              t(
                'Try live endpoints in API Playground, browse OpenAPI, SDK, cookbook, and MCP for Cursor agents.',
                'Thử endpoint live trong API Playground, OpenAPI, SDK, cookbook và MCP cho Cursor agent.',
                'ลอง endpoint สดใน API Playground ดู OpenAPI SDK cookbook และ MCP สำหรับ Cursor agent',
              )
            }}
          </p>
          <div class="gw-split-links">
            <a :href="apiLink" class="gw-btn gw-btn-outline">{{ t('OpenAPI', 'OpenAPI', 'OpenAPI') }}</a>
            <a :href="quickstartLink" class="gw-btn gw-btn-outline">Quickstart</a>
            <a :href="mcpLink" class="gw-btn gw-btn-outline">MCP</a>
          </div>
        </div>
      </div>
    </section>

    <section class="gw-section gw-section-muted">
      <div class="gw-section-inner">
        <p class="gw-section-index gw-section-index-center">§</p>
        <h2 class="gw-section-title gw-section-title-center">
          {{ t('How the gateway thinks', 'Gateway hoạt động thế nào', 'แนวคิดของ gateway') }}
        </h2>
        <ol class="gw-pillars">
          <li v-for="p in pillars" :key="p.n" class="gw-pillar">
            <span class="gw-pillar-n">{{ p.n }}</span>
            <div>
              <h3>{{ p.title }}</h3>
              <p>{{ p.desc }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="gw-cta-band">
      <div class="gw-cta-band-inner">
        <div>
          <h2>{{ t('Deploy once. Route everything.', 'Deploy một lần. Route mọi thứ.', 'Deploy ครั้งเดียว route ทุกอย่าง') }}</h2>
          <p>
            {{
              t(
                'Try endpoints live in API Playground, or create an account for Chat and Media Playground.',
                'Thử endpoint live trong API Playground, hoặc tạo tài khoản cho Chat và Media Playground.',
                'ลอง endpoint สดใน API Playground หรือสร้างบัญชีสำหรับ Chat และ Media Playground',
              )
            }}
          </p>
        </div>
        <a :href="playgroundLink" class="gw-btn gw-btn-primary gw-btn-lg">{{
          t('Try API Playground', 'Thử API Playground', 'ลอง API Playground')
        }}</a>
      </div>
    </section>
  </div>
</template>
