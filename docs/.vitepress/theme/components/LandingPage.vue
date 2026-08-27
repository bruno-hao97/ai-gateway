<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import { getStoredToken } from '../models/auth-api';
import {
  JOB_TYPES,
  catalogProviders,
  fetchAllModels,
  modelDescription,
  playgroundUrl,
  providerInitials,
  sortModels,
  type CatalogLang,
  type CatalogModel,
  type JobTypeId,
} from '../models/catalog-api';

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const catalogLang = computed((): CatalogLang | undefined => (isVi.value ? 'vi' : 'en'));

const prefix = computed(() => (isVi.value ? '/vi' : ''));
const appLink = computed(() => `${prefix.value}/app/`);
const quickstartLink = computed(() => `${prefix.value}/quickstart`);
const loginLink = computed(() => `${prefix.value}/login/`);
const signupLink = computed(() => `${prefix.value}/signup/`);
const authDocLink = computed(() => `${prefix.value}/authentication`);
const modelsLink = computed(() => `${prefix.value}/models/`);
const compareLink = computed(() => `${prefix.value}/models/compare/`);
const apiLink = computed(() => `${prefix.value}/reference/media`);
const cookbookLink = computed(() => `${prefix.value}/cookbook/`);
const sdkLink = computed(() => `${prefix.value}/sdk/`);
const openapiLink = computed(() => `${prefix.value}/reference/openapi`);
const principlesLink = computed(() => `${prefix.value}/principles`);
const routingLink = computed(() => `${prefix.value}/routing/`);

const loading = ref(true);
const allModels = ref<CatalogModel[]>([]);

const stats = computed(() => ({
  models: allModels.value.length || '—',
  jobTypes: JOB_TYPES.length,
  providers: catalogProviders(allModels.value).length || '—',
}));

const featured = computed(() => {
  const models = allModels.value;
  if (!models.length) return [];
  const picks: CatalogModel[] = [];
  const seen = new Set<string>();
  for (const type of ['image', 'video', 'tts', 'music'] as JobTypeId[]) {
    const m = sortModels(
      models.filter((x) => x.jobType === type),
      'newest',
    )[0];
    if (m && !seen.has(m.slug)) {
      picks.push(m);
      seen.add(m.slug);
    }
  }
  for (const m of sortModels(models, 'newest')) {
    if (picks.length >= 8) break;
    if (!seen.has(m.slug)) {
      picks.push(m);
      seen.add(m.slug);
    }
  }
  return picks;
});

const features = computed(() =>
  isVi.value
    ? [
        {
          title: 'Một base URL',
          desc: 'Ẩn v2.api.gommo.net và api.gommo.net sau một API deploy được.',
          icon: '⬡',
        },
        {
          title: 'REST + proxy',
          desc: 'Mode B JSON với wait:true, hoặc Mode C drop-in path Gommo.',
          icon: '⇄',
        },
        {
          title: 'Job async',
          desc: 'Poll 3.5s, tối đa 80 lần — catalog quyết định ratio/mode/resolution.',
          icon: '◷',
        },
        {
          title: 'Secret server-side',
          desc: 'Merchant token và PayOS key không bao giờ vào browser.',
          icon: '🔒',
        },
      ]
    : [
        {
          title: 'One base URL',
          desc: 'Hide v2.api.gommo.net + api.gommo.net behind a single deployable API.',
          icon: '⬡',
        },
        {
          title: 'REST + proxy',
          desc: 'Mode B JSON with wait:true polling, or Mode C drop-in Gommo paths.',
          icon: '⇄',
        },
        {
          title: 'Async jobs',
          desc: 'Poll every 3.5s, max 80 attempts — catalog defines ratio/mode/resolution.',
          icon: '◷',
        },
        {
          title: 'Server-side secrets',
          desc: 'Merchant token and PayOS keys stay on the gateway — never in the browser.',
          icon: '🔒',
        },
      ],
);

const steps = computed(() =>
  isVi.value
    ? [
        {
          n: '1',
          title: 'Đăng nhập',
          desc: 'Email + mật khẩu Gommo qua /gateway/auth/login.',
          href: loginLink.value,
        },
        {
          n: '2',
          title: 'List models',
          desc: 'GET /gateway/models — public browse, Bearer optional.',
          href: modelsLink.value,
        },
        {
          n: '3',
          title: 'Tạo job',
          desc: 'POST job + poll — không đoán ratio/mode/resolution.',
          href: quickstartLink.value,
        },
      ]
    : [
        {
          n: '1',
          title: 'Authenticate',
          desc: 'Gommo email + password via /gateway/auth/login.',
          href: loginLink.value,
        },
        {
          n: '2',
          title: 'List models',
          desc: 'GET /gateway/models — public browse, Bearer optional.',
          href: modelsLink.value,
        },
        {
          n: '3',
          title: 'Create jobs',
          desc: 'POST job + poll — never guess ratio/mode/resolution.',
          href: quickstartLink.value,
        },
      ],
);

const codeSample = `curl "http://localhost:3001/gateway/models?type=image&lang=en"
# Bearer optional for catalog browse

curl -X POST "http://localhost:3001/gateway/jobs" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"image","model":"YOUR_SLUG","ratio":"FROM_CATALOG"}'`;

const docLinks = computed(() =>
  isVi.value
    ? [
        { label: 'Quickstart', href: quickstartLink.value },
        { label: 'Đăng nhập', href: loginLink.value },
        { label: 'Đăng ký', href: signupLink.value },
        { label: 'Authentication', href: authDocLink.value },
        { label: 'Catalog', href: modelsLink.value },
        { label: 'So sánh', href: compareLink.value },
        { label: 'API Reference', href: apiLink.value },
        { label: 'Cookbook', href: cookbookLink.value },
        { label: 'Client SDKs', href: sdkLink.value },
        { label: 'OpenAPI', href: openapiLink.value },
        { label: 'Routing', href: routingLink.value },
      ]
    : [
        { label: 'Quickstart', href: quickstartLink.value },
        { label: 'Sign in', href: loginLink.value },
        { label: 'Sign up', href: signupLink.value },
        { label: 'Authentication', href: authDocLink.value },
        { label: 'Models', href: modelsLink.value },
        { label: 'Compare', href: compareLink.value },
        { label: 'API Reference', href: apiLink.value },
        { label: 'Cookbook', href: cookbookLink.value },
        { label: 'Client SDKs', href: sdkLink.value },
        { label: 'OpenAPI', href: openapiLink.value },
        { label: 'Routing', href: routingLink.value },
      ],
);

function jobTypeLabel(id: string): string {
  return JOB_TYPES.find((t) => t.id === id)?.label ?? id;
}

onMounted(async () => {
  if (getStoredToken()) {
    window.location.href = appLink.value;
    return;
  }
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
      <div class="gw-hero-glow" aria-hidden="true" />
      <div class="gw-hero-inner">
        <p class="gw-hero-eyebrow">
          {{ isVi ? 'Nền tảng API kiểu OpenRouter' : 'OpenRouter-style API platform' }}
        </p>
        <h1 class="gw-hero-title">
          {{
            isVi
              ? 'Giao diện thống nhất cho Gommo AI APIs'
              : 'The unified interface for Gommo AI APIs'
          }}
        </h1>
        <p class="gw-hero-sub">
          {{
            isVi
              ? 'Gateway Express TypeScript — proxy trong suốt + REST wrap cho image, video, music, TTS và tools.'
              : 'Express TypeScript gateway — transparent proxy + REST wrap for image, video, music, TTS, and tools.'
          }}
        </p>
        <div class="gw-hero-actions">
          <a :href="signupLink" class="gw-btn gw-btn-primary">{{
            isVi ? 'Đăng ký' : 'Sign Up'
          }}</a>
          <a :href="modelsLink" class="gw-btn gw-btn-secondary">{{
            isVi ? 'Khám phá models' : 'Discover models'
          }}</a>
          <a :href="loginLink" class="gw-btn gw-btn-ghost">{{
            isVi ? 'Đăng nhập' : 'Sign in'
          }}</a>
          <a :href="playgroundUrl()" target="_blank" rel="noopener" class="gw-btn gw-btn-ghost"
            >Playground ↗</a
          >
        </div>
      </div>
    </section>

    <section class="gw-stats" aria-label="Platform stats">
      <div class="gw-stats-inner">
        <div class="gw-stat">
          <strong>{{ stats.models }}</strong>
          <span>{{ isVi ? 'Models' : 'Models' }}</span>
        </div>
        <div class="gw-stat">
          <strong>{{ stats.jobTypes }}</strong>
          <span>{{ isVi ? 'Loại job' : 'Job types' }}</span>
        </div>
        <div class="gw-stat">
          <strong>{{ stats.providers }}</strong>
          <span>{{ isVi ? 'Providers' : 'Providers' }}</span>
        </div>
        <div class="gw-stat gw-stat-muted">
          <strong>1</strong>
          <span>{{ isVi ? 'Base URL' : 'Base URL' }}</span>
        </div>
      </div>
    </section>

    <section class="gw-section">
      <div class="gw-section-inner">
        <h2 class="gw-section-title">
          {{ isVi ? 'Vì sao dùng gateway?' : 'Why use the gateway?' }}
        </h2>
        <div class="gw-features">
          <article v-for="f in features" :key="f.title" class="gw-feature">
            <span class="gw-feature-icon" aria-hidden="true">{{ f.icon }}</span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="gw-section gw-section-elevated">
      <div class="gw-section-inner">
        <div class="gw-section-head">
          <div>
            <h2 class="gw-section-title">
              {{ isVi ? 'Model nổi bật' : 'Featured models' }}
            </h2>
            <p class="gw-section-sub">
              {{
                isVi
                  ? 'Cùng nguồn GET /gateway/models — credits và tham số từ catalog.'
                  : 'Same data as GET /gateway/models — credits and parameters from the catalog.'
              }}
            </p>
          </div>
          <a :href="compareLink" class="gw-link-arrow">{{
            isVi ? 'So sánh →' : 'Compare →'
          }}</a>
        </div>

        <p v-if="loading" class="gw-muted">{{ isVi ? 'Đang tải catalog…' : 'Loading catalog…' }}</p>
        <div v-else-if="featured.length" class="gw-model-grid">
          <a
            v-for="m in featured"
            :key="m.slug"
            :href="playgroundUrl(m)"
            target="_blank"
            rel="noopener"
            class="gw-model-card"
          >
            <div class="gw-model-card-head">
              <span class="or-provider-avatar or-provider-avatar--sm">{{
                providerInitials(m.provider || m.slug)
              }}</span>
              <span class="gw-model-type">{{ jobTypeLabel(m.jobType) }}</span>
            </div>
            <strong class="gw-model-name">{{ m.name }}</strong>
            <code class="gw-model-slug">{{ m.slug }}</code>
            <p v-if="modelDescription(m, isVi)" class="gw-model-desc">
              {{ modelDescription(m, isVi) }}
            </p>
            <span class="gw-model-credits">{{ m.creditsLabel }}</span>
          </a>
        </div>
        <p v-else class="gw-muted">
          {{
            isVi
              ? 'Chạy gateway (npm run dev) để tải catalog.'
              : 'Start the gateway (npm run dev) to load the catalog.'
          }}
        </p>
        <a :href="modelsLink" class="gw-btn gw-btn-secondary gw-model-all">{{
          isVi ? 'Xem toàn bộ catalog' : 'Browse full catalog'
        }}</a>
      </div>
    </section>

    <section class="gw-section">
      <div class="gw-section-inner">
        <h2 class="gw-section-title">{{ isVi ? 'Bắt đầu trong 3 bước' : 'Get started in 3 steps' }}</h2>
        <div class="gw-steps">
          <a v-for="s in steps" :key="s.n" :href="s.href" class="gw-step gw-step-link">
            <span class="gw-step-n">{{ s.n }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </a>
        </div>
      </div>
    </section>

    <section class="gw-section gw-section-code">
      <div class="gw-section-inner gw-code-wrap">
        <div class="gw-code-copy">
          <h2 class="gw-section-title">{{ isVi ? 'Tích hợp nhanh' : 'Integrate in minutes' }}</h2>
          <p class="gw-section-sub">
            {{
              isVi
                ? 'Catalog public, job cần Bearer. Copy snippet và xem Quickstart đầy đủ.'
                : 'Public catalog browse, Bearer required for jobs. Copy the snippet or read the full Quickstart.'
            }}
          </p>
          <a :href="quickstartLink" class="gw-btn gw-btn-primary">{{
            isVi ? 'Đọc Quickstart' : 'Read Quickstart'
          }}</a>
        </div>
        <pre class="gw-code"><code>{{ codeSample }}</code></pre>
      </div>
    </section>

    <section class="gw-section gw-section-cta">
      <div class="gw-section-inner gw-cta-inner">
        <h2 class="gw-cta-title">
          {{ isVi ? 'Sẵn sàng build?' : 'Ready to build?' }}
        </h2>
        <p class="gw-cta-sub">
          {{
            isVi
              ? 'Docs song ngữ, OpenAPI, TypeScript SDK và playground.'
              : 'Bilingual docs, OpenAPI, TypeScript SDK, and playground.'
          }}
        </p>
        <div class="gw-doc-links">
          <a v-for="link in docLinks" :key="link.href" :href="link.href" class="gw-doc-link">{{
            link.label
          }}</a>
        </div>
      </div>
    </section>

    <footer class="gw-rules">
      <div class="gw-rules-inner">
        <strong>{{ isVi ? 'Quy tắc Gommo' : 'Gommo rules' }}</strong>
        <ul>
          <li>
            {{
              isVi
                ? 'Không đoán ratio/mode/resolution/duration — lấy từ catalog.'
                : 'Never guess ratio/mode/resolution/duration — read from the catalog.'
            }}
          </li>
          <li>
            {{
              isVi
                ? 'Job async — poll 3.5s, tối đa 80 lần.'
                : 'Jobs are async — poll every 3.5s, max 80 attempts.'
            }}
          </li>
          <li>
            {{
              isVi
                ? 'Merchant token không bao giờ ở browser.'
                : 'Merchant token never in the browser.'
            }}
          </li>
        </ul>
        <a :href="principlesLink" class="gw-link-arrow">{{
          isVi ? 'Nguyên tắc đầy đủ →' : 'Full principles →'
        }}</a>
      </div>
    </footer>
  </div>
</template>
