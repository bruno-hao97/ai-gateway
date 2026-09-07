<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import {
  JOB_TYPES,
  catalogProviders,
  fetchAllModels,
  type CatalogLang,
} from '../models/catalog-api';

const GITHUB_URL = 'https://github.com/bruno-hao97/ai-gateway';
const MCP_TOOL_COUNT = 10;

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));
const catalogLang = computed((): CatalogLang | undefined => (isVi.value ? 'vi' : 'en'));

const signupLink = computed(() => `${prefix.value}/signup/`);
const modelsLink = computed(() => `${prefix.value}/models/`);
const quickstartLink = computed(() => `${prefix.value}/quickstart`);
const mcpLink = computed(() => `${prefix.value}/mcp/`);
const principlesLink = computed(() => `${prefix.value}/principles`);
const chatLink = computed(() => `${prefix.value}/app/chat/`);

const loading = ref(true);
const modelCount = ref(0);
const providerCount = ref(0);

function t(en: string, vi: string): string {
  return isVi.value ? vi : en;
}

const stats = computed(() => [
  {
    value: loading.value ? '—' : String(modelCount.value || '—'),
    label: t('Models', 'Models'),
  },
  {
    value: loading.value ? '—' : String(providerCount.value || '—'),
    label: t('Providers', 'Providers'),
  },
  {
    value: String(JOB_TYPES.length),
    label: t('Job types', 'Loại job'),
  },
  {
    value: String(MCP_TOOL_COUNT),
    label: t('MCP tools', 'MCP tools'),
  },
]);

const resources = computed(() =>
  isVi.value
    ? [
        {
          kicker: 'Documentation',
          title: 'Quickstart & API reference',
          desc:
            'Hướng dẫn đăng nhập, list models, tạo image job và poll — song ngữ EN/VI với OpenAPI và cookbook.',
          href: quickstartLink.value,
          cta: 'Đọc hướng dẫn →',
        },
        {
          kicker: 'Open source',
          title: 'Gateway trên GitHub',
          desc:
            'Express TypeScript proxy + REST wrap Gommo — Docker, health check, MCP server và TypeScript SDK.',
          href: GITHUB_URL,
          cta: 'Xem repository →',
          external: true,
        },
      ]
    : [
        {
          kicker: 'Documentation',
          title: 'Quickstart & API reference',
          desc:
            'Login, list models, create an image job, and poll — bilingual EN/VI docs with OpenAPI and cookbook.',
          href: quickstartLink.value,
          cta: 'Read the guide →',
        },
        {
          kicker: 'Open source',
          title: 'Gateway on GitHub',
          desc:
            'Express TypeScript Gommo proxy + REST wrap — Docker, health checks, MCP server, and TypeScript SDK.',
          href: GITHUB_URL,
          cta: 'View repository →',
          external: true,
        },
      ],
);

const highlights = computed(() =>
  isVi.value
    ? [
        {
          title: 'Gommo trong một gateway',
          desc:
            'Proxy trong suốt và REST wrap — image, video, music, TTS, chat và tools qua một base URL deploy được.',
        },
        {
          title: 'Portal cho creator',
          desc:
            'Chat với Auto Router, Playground thử job, catalog models và nạp credits — không bắt buộc viết code.',
        },
        {
          title: 'Công cụ cho developer',
          desc:
            'Docs song ngữ, OpenAPI, TypeScript SDK, cookbook và MCP server cho Cursor và agent.',
        },
      ]
    : [
        {
          title: 'Gommo in one gateway',
          desc:
            'Transparent proxy and REST wrap — image, video, music, TTS, chat, and tools through one deployable base URL.',
        },
        {
          title: 'Portal for creators',
          desc:
            'Chat with Auto Router, Playground for jobs, model catalog, and credits — no code required.',
        },
        {
          title: 'Tools for developers',
          desc:
            'Bilingual docs, OpenAPI, TypeScript SDK, cookbook, and MCP server for Cursor and agents.',
        },
      ],
);

const ecosystemLinks = computed(() => [
  { label: t('Models catalog', 'Catalog models'), href: modelsLink.value },
  { label: t('MCP & agents', 'MCP & agents'), href: mcpLink.value },
  { label: t('Principles', 'Nguyên tắc'), href: principlesLink.value },
]);

onMounted(async () => {
  try {
    const models = await fetchAllModels(catalogLang.value);
    modelCount.value = models.length;
    providerCount.value = catalogProviders(models).length;
  } catch {
    modelCount.value = 0;
    providerCount.value = 0;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="gw-about">
    <div class="gw-about-shell">
      <section class="gw-about-hero">
        <h1 class="gw-about-title">{{ t('About AI Gateway', 'Về AI Gateway') }}</h1>
        <p class="gw-about-mission">
          {{
            t(
              'AI Gateway is an all-in-one platform for generating images, videos, audio, and chat — built on Gommo with a unified API, developer docs, and a signed-in portal for creators and teams.',
              'AI Gateway là nền tảng tất cả trong một để tạo ảnh, video, audio và chat — xây trên Gommo với API thống nhất, docs developer và portal đăng nhập cho creator và team.',
            )
          }}
        </p>
      </section>

      <section class="gw-about-stats" :aria-label="t('Platform stats', 'Thống kê nền tảng')">
        <div v-for="stat in stats" :key="stat.label" class="gw-about-stat">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </section>

      <section class="gw-about-resources">
        <a
          v-for="item in resources"
          :key="item.href"
          :href="item.href"
          class="gw-about-resource"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
        >
          <p class="gw-about-resource-kicker">{{ item.kicker }}</p>
          <h2 class="gw-about-resource-title">{{ item.title }}</h2>
          <p class="gw-about-resource-desc">{{ item.desc }}</p>
          <span class="gw-about-resource-cta">{{ item.cta }}</span>
        </a>
      </section>

      <section class="gw-about-highlights-wrap">
        <h2 class="gw-about-section-title">
          {{ t('Built for creators and developers', 'Dành cho creator và developer') }}
        </h2>
        <div class="gw-about-highlights">
          <article v-for="card in highlights" :key="card.title" class="gw-about-card">
            <h3>{{ card.title }}</h3>
            <p>{{ card.desc }}</p>
          </article>
        </div>
        <div class="gw-about-ecosystem">
          <a
            v-for="link in ecosystemLinks"
            :key="link.href"
            :href="link.href"
            class="gw-about-eco-link"
          >
            {{ link.label }}
          </a>
        </div>
      </section>

      <section class="gw-about-cta">
        <h2>{{ t('Ready to get started?', 'Sẵn sàng bắt đầu?') }}</h2>
        <p>
          {{
            t(
              'Join creators and developers building with AI Gateway.',
              'Tham gia cùng creator và developer đang dùng AI Gateway.',
            )
          }}
        </p>
        <a :href="signupLink" class="gw-about-btn gw-about-btn-primary gw-about-btn-block">{{
          t('Sign up for free', 'Đăng ký miễn phí')
        }}</a>
        <p class="gw-about-cta-alt">
          {{ t('Or', 'Hoặc') }}
          <a :href="chatLink">{{ t('open Chat', 'mở Chat') }}</a>
          {{ t('without signing up again if you already have an account.', 'nếu bạn đã có tài khoản.') }}
        </p>
      </section>
    </div>
  </div>
</template>
