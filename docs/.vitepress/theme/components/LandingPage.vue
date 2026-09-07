<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import { apiBase } from '../models/gateway-base';
import {
  JOB_TYPES,
  catalogProviders,
  fetchAllModels,
  playgroundUrl,
  providerInitials,
  sortModels,
  type CatalogLang,
  type CatalogModel,
} from '../models/catalog-api';

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const catalogLang = computed((): CatalogLang | undefined => (isVi.value ? 'vi' : 'en'));

const prefix = computed(() => (isVi.value ? '/vi' : ''));
const localePrefix = computed((): '' | '/vi' => (isVi.value ? '/vi' : ''));

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

function t(en: string, vi: string): string {
  return isVi.value ? vi : en;
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
    href: `${playgroundLink.value}?type=${jt.id}`,
  })),
);

const pillars = computed(() =>
  isVi.value
    ? [
        {
          n: '01',
          title: 'Một cổng, một contract',
          desc: 'Ẩn v2.api.gommo.net và api.gommo.net — deploy gateway, client chỉ nhớ một base URL.',
        },
        {
          n: '02',
          title: 'Catalog là nguồn sự thật',
          desc: 'Không đoán ratio, mode hay resolution — đọc từ GET /gateway/models trước mỗi job.',
        },
        {
          n: '03',
          title: 'Portal + API + MCP',
          desc: 'Chat và Playground cho người dùng; REST, OpenAPI và 10 MCP tools cho agent.',
        },
        {
          n: '04',
          title: 'Secret ở server',
          desc: 'Merchant token và billing keys không bao giờ xuất hiện trong browser hay SDK public.',
        },
      ]
    : [
        {
          n: '01',
          title: 'One gate, one contract',
          desc: 'Hide v2.api.gommo.net and api.gommo.net — deploy the gateway, clients keep one base URL.',
        },
        {
          n: '02',
          title: 'Catalog is source of truth',
          desc: 'Never guess ratio, mode, or resolution — read GET /gateway/models before every job.',
        },
        {
          n: '03',
          title: 'Portal + API + MCP',
          desc: 'Chat and Playground for humans; REST, OpenAPI, and 10 MCP tools for agents.',
        },
        {
          n: '04',
          title: 'Secrets stay server-side',
          desc: 'Merchant token and billing keys never appear in the browser or public SDK.',
        },
      ],
);

const routeNodes = computed(() =>
  isVi.value
    ? [
        { label: 'Client', sub: 'Browser · mobile · script' },
        { label: 'AI Gateway', sub: 'REST · proxy · portal', core: true },
        { label: 'Gommo', sub: 'Models · jobs · billing' },
      ]
    : [
        { label: 'Client', sub: 'Browser · mobile · script' },
        { label: 'AI Gateway', sub: 'REST · proxy · portal', core: true },
        { label: 'Gommo', sub: 'Models · jobs · billing' },
      ],
);

const codeSample = computed(() => {
  const base = apiBase() || 'https://api.yourdomain.com';
  return `$ curl ${base}/gateway/models?type=image
$ curl -X POST ${base}/gateway/jobs \\
    -H "Authorization: Bearer $TOKEN" \\
    -d '{"type":"image","model":"SLUG","ratio":"FROM_CATALOG"}'`;
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
          <p class="gw-hero-index">{{ t('GATEWAY · GOMMO', 'GATEWAY · GOMMO') }}</p>
          <h1 class="gw-hero-title">
            {{
              t(
                'One URL between you and every Gommo model.',
                'Một URL giữa bạn và mọi model Gommo.',
              )
            }}
          </h1>
          <p class="gw-hero-sub">
            {{
              t(
                'AI Gateway is not another studio — it is the routing layer: catalog, jobs, chat, credits, and docs behind a single deployable API.',
                'AI Gateway không phải studio khác — là tầng routing: catalog, jobs, chat, credits và docs sau một API deploy được.',
              )
            }}
          </p>
          <div class="gw-hero-actions">
            <a :href="signupLink" class="gw-btn gw-btn-primary">{{
              t('Create account', 'Tạo tài khoản')
            }}</a>
            <a :href="quickstartLink" class="gw-btn gw-btn-outline">{{
              t('Read Quickstart', 'Đọc Quickstart')
            }}</a>
          </div>
          <nav class="gw-hero-shortcuts" :aria-label="t('Shortcuts', 'Lối tắt')">
            <a :href="chatLink">{{ t('Chat', 'Chat') }}</a>
            <a :href="playgroundLink">Playground</a>
            <a :href="modelsLink">{{ t('Models', 'Models') }}</a>
            <a :href="mcpLink">MCP</a>
          </nav>
          <p class="gw-hero-trust">
            <a :href="loginLink">{{ t('Sign in', 'Đăng nhập') }}</a>
            <span aria-hidden="true">/</span>
            <a :href="aboutLink">{{ t('About', 'Về chúng tôi') }}</a>
            <span aria-hidden="true">/</span>
            <a :href="privacyPolicyLink">{{ t('Privacy', 'Privacy') }}</a>
          </p>
        </div>

        <aside class="gw-route-panel" :aria-label="t('Request flow', 'Luồng request')">
          <p class="gw-route-label">{{ t('REQUEST FLOW', 'LUỒNG REQUEST') }}</p>
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

    <section class="gw-stats" :aria-label="t('Live catalog', 'Catalog live')">
      <div class="gw-stats-inner">
        <div class="gw-stat">
          <strong>{{ stats.models }}</strong>
          <span>{{ t('models indexed', 'models') }}</span>
        </div>
        <div class="gw-stat-divider" aria-hidden="true" />
        <div class="gw-stat">
          <strong>{{ stats.providers }}</strong>
          <span>{{ t('providers', 'providers') }}</span>
        </div>
        <div class="gw-stat-divider" aria-hidden="true" />
        <div class="gw-stat">
          <strong>{{ stats.jobTypes }}</strong>
          <span>{{ t('job types', 'loại job') }}</span>
        </div>
        <div class="gw-stat-divider" aria-hidden="true" />
        <div class="gw-stat">
          <strong>10</strong>
          <span>{{ t('MCP tools', 'MCP tools') }}</span>
        </div>
      </div>
    </section>

    <section class="gw-section">
      <div class="gw-section-inner">
        <div class="gw-section-head">
          <div>
            <p class="gw-section-index">01</p>
            <h2 class="gw-section-title">{{ t('Catalog snapshot', 'Snapshot catalog') }}</h2>
            <p class="gw-section-sub">
              {{
                t(
                  'Newest models from live Gommo — open Playground or compare side by side.',
                  'Models mới nhất từ Gommo live — mở Playground hoặc so sánh.',
                )
              }}
            </p>
          </div>
          <a :href="compareLink" class="gw-link-arrow">{{ t('Compare', 'So sánh') }} →</a>
        </div>

        <p v-if="loading" class="gw-muted">{{ t('Loading…', 'Đang tải…') }}</p>
        <div v-else-if="tableModels.length" class="gw-model-table-wrap">
          <table class="gw-model-table">
            <thead>
              <tr>
                <th>{{ t('Model', 'Model') }}</th>
                <th>{{ t('Type', 'Loại') }}</th>
                <th>{{ t('Provider', 'Provider') }}</th>
                <th>{{ t('Credits', 'Credits') }}</th>
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
                  <a :href="playgroundUrl(m, localePrefix)">→</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="gw-muted">{{ t('Catalog offline.', 'Catalog offline.') }}</p>
        <a :href="modelsLink" class="gw-text-link">{{ t('Full catalog', 'Toàn bộ catalog') }} →</a>
      </div>
    </section>

    <section class="gw-section gw-section-muted">
      <div class="gw-section-inner">
        <p class="gw-section-index">02</p>
        <h2 class="gw-section-title">{{ t('Job surfaces', 'Job surfaces') }}</h2>
        <p class="gw-section-sub gw-section-sub-below">
          {{ t('Each chip opens Playground on the matching job type.', 'Mỗi chip mở Playground với job type tương ứng.') }}
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
          <h2 class="gw-split-title">{{ t('Use the portal', 'Dùng portal') }}</h2>
          <p class="gw-split-desc">
            {{
              t(
                'Chat streams SSE. Playground runs real jobs. Credits wallet syncs with Gommo — same token as the API.',
                'Chat stream SSE. Playground chạy job thật. Wallet credits sync Gommo — cùng token với API.',
              )
            }}
          </p>
          <div class="gw-split-links">
            <a :href="chatLink" class="gw-btn gw-btn-primary">{{ t('Chat', 'Chat') }}</a>
            <a :href="playgroundLink" class="gw-btn gw-btn-outline">Playground</a>
            <a :href="creditsLink" class="gw-btn gw-btn-outline">{{ t('Credits', 'Credits') }}</a>
          </div>
        </div>
        <div class="gw-split-panel">
          <p class="gw-section-index">04</p>
          <h2 class="gw-split-title">{{ t('Ship with the API', 'Ship với API') }}</h2>
          <p class="gw-split-desc">
            {{
              t(
                'OpenAPI reference, TypeScript SDK, cookbook recipes, and MCP for Cursor agents.',
                'OpenAPI, TypeScript SDK, cookbook và MCP cho Cursor agent.',
              )
            }}
          </p>
          <div class="gw-split-links">
            <a :href="apiLink" class="gw-btn gw-btn-primary">{{ t('API Reference', 'API Reference') }}</a>
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
          {{ t('How the gateway thinks', 'Gateway hoạt động thế nào') }}
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
          <h2>{{ t('Deploy once. Route everything.', 'Deploy một lần. Route mọi thứ.') }}</h2>
          <p>
            {{
              t(
                'Start with a free account or skim the docs — no separate studio signup.',
                'Bắt đầu với tài khoản miễn phí hoặc đọc docs — không cần đăng ký studio riêng.',
              )
            }}
          </p>
        </div>
        <a :href="signupLink" class="gw-btn gw-btn-primary gw-btn-lg">{{
          t('Get started', 'Bắt đầu')
        }}</a>
      </div>
    </section>
  </div>
</template>
