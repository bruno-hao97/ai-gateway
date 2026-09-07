<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import { apiBase } from '../models/gateway-base';
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
const sdkLink = computed(() => `${prefix.value}/sdk/`);
const privacyPolicyLink = computed(() => `${prefix.value}/privacy-policy/`);
const termsLink = computed(() => `${prefix.value}/terms/`);

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

const platformCards = computed(() =>
  isVi.value
    ? [
        {
          title: 'Chat',
          desc: 'Trò chuyện với Auto Router — stream SSE, tạo ảnh/video trong chat.',
          icon: '💬',
          href: chatLink.value,
          cta: 'Mở chat',
        },
        {
          title: 'Playground',
          desc: 'Thử image, video, music và tool jobs — không cần viết code.',
          icon: '▶',
          href: playgroundLink.value,
          cta: 'Mở playground',
        },
        {
          title: 'Models',
          desc: 'Duyệt catalog, so sánh credits và tham số từ Gommo.',
          icon: '◈',
          href: modelsLink.value,
          cta: 'Xem catalog',
        },
        {
          title: 'Credits',
          desc: 'Nạp credit, xem số dư và lịch sử usage trong portal.',
          icon: '◎',
          href: creditsLink.value,
          cta: 'Mở wallet',
        },
      ]
    : [
        {
          title: 'Chat',
          desc: 'Talk to Auto Router — SSE streaming, image and video generation in chat.',
          icon: '💬',
          href: chatLink.value,
          cta: 'Open chat',
        },
        {
          title: 'Playground',
          desc: 'Try image, video, music, and tool jobs — no code required.',
          icon: '▶',
          href: playgroundLink.value,
          cta: 'Open playground',
        },
        {
          title: 'Models',
          desc: 'Browse the catalog, compare credits and parameters from Gommo.',
          icon: '◈',
          href: modelsLink.value,
          cta: 'Browse catalog',
        },
        {
          title: 'Credits',
          desc: 'Top up credits, check balance, and view usage history in the portal.',
          icon: '◎',
          href: creditsLink.value,
          cta: 'Open wallet',
        },
      ],
);

const devFeatures = computed(() =>
  isVi.value
    ? [
        {
          title: 'REST + proxy',
          desc: 'Mode B JSON hoặc Mode C — một base URL cho toàn bộ Gommo.',
          icon: '⇄',
        },
        {
          title: 'OpenAPI & SDK',
          desc: 'Tài liệu song ngữ, cookbook và TypeScript client.',
          icon: '📦',
        },
        {
          title: 'MCP',
          desc: '10 tools cho Cursor và agent — models, jobs, chat.',
          icon: '⬡',
        },
        {
          title: 'Bảo mật',
          desc: 'Merchant token và billing secret chỉ ở server.',
          icon: '🔒',
        },
      ]
    : [
        {
          title: 'REST + proxy',
          desc: 'Mode B JSON or Mode C — one base URL for all Gommo APIs.',
          icon: '⇄',
        },
        {
          title: 'OpenAPI & SDK',
          desc: 'Bilingual docs, cookbook, and TypeScript client.',
          icon: '📦',
        },
        {
          title: 'MCP',
          desc: '10 tools for Cursor and agents — models, jobs, chat.',
          icon: '⬡',
        },
        {
          title: 'Security',
          desc: 'Merchant token and billing secrets stay server-side.',
          icon: '🔒',
        },
      ],
);

const userSteps = computed(() =>
  isVi.value
    ? [
        {
          n: '1',
          title: 'Tạo tài khoản',
          desc: 'Đăng ký miễn phí — email và mật khẩu Gommo qua gateway.',
          href: signupLink.value,
        },
        {
          n: '2',
          title: 'Tạo nội dung',
          desc: 'Chat, Playground hoặc chọn model từ catalog.',
          href: chatLink.value,
        },
        {
          n: '3',
          title: 'Tích hợp API',
          desc: 'Bearer token + Quickstart — image, video, audio jobs.',
          href: quickstartLink.value,
        },
      ]
    : [
        {
          n: '1',
          title: 'Create account',
          desc: 'Sign up free — Gommo email and password via the gateway.',
          href: signupLink.value,
        },
        {
          n: '2',
          title: 'Create content',
          desc: 'Use Chat, Playground, or pick a model from the catalog.',
          href: chatLink.value,
        },
        {
          n: '3',
          title: 'Integrate API',
          desc: 'Bearer token + Quickstart — image, video, and audio jobs.',
          href: quickstartLink.value,
        },
      ],
);

const codeSample = computed(() => {
  const base = apiBase() || 'https://api.yourdomain.com';
  return `curl "${base}/gateway/models?type=image&lang=en"
# Bearer optional for catalog browse

curl -X POST "${base}/gateway/jobs" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"image","model":"YOUR_SLUG","ratio":"FROM_CATALOG"}'`;
});

const docLinks = computed(() =>
  isVi.value
    ? [
        { label: 'Quickstart', href: quickstartLink.value },
        { label: 'API Reference', href: apiLink.value },
        { label: 'SDK', href: sdkLink.value },
        { label: 'MCP', href: mcpLink.value },
        { label: 'Models', href: modelsLink.value },
      ]
    : [
        { label: 'Quickstart', href: quickstartLink.value },
        { label: 'API Reference', href: apiLink.value },
        { label: 'SDK', href: sdkLink.value },
        { label: 'MCP', href: mcpLink.value },
        { label: 'Models', href: modelsLink.value },
      ],
);

function jobTypeLabel(id: string): string {
  return JOB_TYPES.find((t) => t.id === id)?.label ?? id;
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
      <div class="gw-hero-glow" aria-hidden="true" />
      <div class="gw-hero-inner">
        <a :href="prefix || '/'" class="gw-hero-brand">
          <span class="gw-hero-brand-mark" aria-hidden="true">⬡</span>
          <span>AI Gateway</span>
        </a>
        <p class="gw-hero-eyebrow">
          {{ isVi ? 'Nền tảng AI tất cả trong một' : 'All-in-one AI platform' }}
        </p>
        <h1 class="gw-hero-title">
          {{
            isVi
              ? 'Tạo ảnh, video, audio và chat — một nơi cho creator và developer'
              : 'Generate images, videos, audio, and chat — one place for creators and developers'
          }}
        </h1>
        <p class="gw-hero-sub">
          {{
            isVi
              ? 'Powered by Gommo — catalog models, portal Chat & Playground, REST API và MCP cho agent.'
              : 'Powered by Gommo — model catalog, Chat & Playground portal, REST API, and MCP for agents.'
          }}
        </p>
        <div class="gw-hero-actions">
          <a :href="signupLink" class="gw-btn gw-btn-primary">{{
            isVi ? 'Bắt đầu miễn phí' : 'Get started free'
          }}</a>
          <a :href="chatLink" class="gw-btn gw-btn-secondary">{{
            isVi ? 'Mở Chat' : 'Open Chat'
          }}</a>
          <a :href="playgroundLink" class="gw-btn gw-btn-secondary">Playground</a>
          <a :href="modelsLink" class="gw-btn gw-btn-ghost">{{
            isVi ? 'Khám phá models' : 'Browse models'
          }}</a>
        </div>
        <p class="gw-hero-trust">
          <template v-if="isVi">
            Đã có tài khoản?
            <a :href="loginLink">Đăng nhập</a>
            ·
            <a :href="privacyPolicyLink">Chính sách quyền riêng tư</a>
            ·
            <a :href="termsLink">Điều khoản</a>
          </template>
          <template v-else>
            Already have an account?
            <a :href="loginLink">Sign in</a>
            ·
            <a :href="privacyPolicyLink">Privacy Policy</a>
            ·
            <a :href="termsLink">Terms of Service</a>
          </template>
        </p>
      </div>
    </section>

    <section class="gw-stats" :aria-label="isVi ? 'Thống kê' : 'Platform stats'">
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
          <strong>API</strong>
          <span>{{ isVi ? 'REST + MCP' : 'REST + MCP' }}</span>
        </div>
      </div>
    </section>

    <section class="gw-section">
      <div class="gw-section-inner">
        <h2 class="gw-section-title">{{ isVi ? 'Nền tảng' : 'Platform' }}</h2>
        <p class="gw-section-sub gw-section-sub-below">
          {{
            isVi
              ? 'Dùng trực tiếp trên web hoặc tích hợp qua API — cùng tài khoản Gommo.'
              : 'Use the web portal or integrate via API — same Gommo account.'
          }}
        </p>
        <div class="gw-features">
          <a
            v-for="card in platformCards"
            :key="card.title"
            :href="card.href"
            class="gw-feature gw-feature-link"
          >
            <span class="gw-feature-icon" aria-hidden="true">{{ card.icon }}</span>
            <h3>{{ card.title }}</h3>
            <p>{{ card.desc }}</p>
            <span class="gw-feature-cta">{{ card.cta }} →</span>
          </a>
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
                  ? 'Credits và tham số từ catalog Gommo — cập nhật live.'
                  : 'Credits and parameters from the live Gommo catalog.'
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
            :href="playgroundUrl(m, localePrefix)"
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
              ? 'Catalog tạm không tải được — thử lại sau hoặc xem Models.'
              : 'Catalog unavailable — try again later or browse Models.'
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
          <a v-for="s in userSteps" :key="s.n" :href="s.href" class="gw-step gw-step-link">
            <span class="gw-step-n">{{ s.n }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </a>
        </div>
      </div>
    </section>

    <section class="gw-section gw-section-elevated">
      <div class="gw-section-inner">
        <h2 class="gw-section-title">{{ isVi ? 'Cho developer' : 'For developers' }}</h2>
        <p class="gw-section-sub gw-section-sub-below">
          {{
            isVi
              ? 'Gateway TypeScript — proxy Gommo + REST wrap, OpenAPI và MCP.'
              : 'TypeScript gateway — Gommo proxy + REST wrap, OpenAPI, and MCP.'
          }}
        </p>
        <div class="gw-features gw-features-dev">
          <article v-for="f in devFeatures" :key="f.title" class="gw-feature">
            <span class="gw-feature-icon" aria-hidden="true">{{ f.icon }}</span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </article>
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
                ? 'Catalog public, job cần Bearer. Xem Quickstart đầy đủ.'
                : 'Public catalog browse, Bearer required for jobs. Read the full Quickstart.'
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
          {{ isVi ? 'Sẵn sàng tạo?' : 'Ready to create?' }}
        </h2>
        <p class="gw-cta-sub">
          {{
            isVi
              ? 'Đăng ký miễn phí hoặc mở docs để tích hợp API.'
              : 'Sign up free or open the docs to integrate the API.'
          }}
        </p>
        <div class="gw-cta-actions">
          <a :href="signupLink" class="gw-btn gw-btn-primary">{{
            isVi ? 'Đăng ký' : 'Sign up'
          }}</a>
          <a :href="quickstartLink" class="gw-btn gw-btn-secondary">{{
            isVi ? 'Xem docs' : 'View docs'
          }}</a>
        </div>
        <div class="gw-doc-links">
          <a v-for="link in docLinks" :key="link.href" :href="link.href" class="gw-doc-link">{{
            link.label
          }}</a>
        </div>
      </div>
    </section>
  </div>
</template>
