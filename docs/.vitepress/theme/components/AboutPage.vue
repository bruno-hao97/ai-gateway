<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import {
  JOB_TYPES,
  catalogProviders,
  fetchAllModels,
  type CatalogLang,
} from '../models/catalog-api';
import { localeFromVitepressLang, localePrefix as portalPrefix, pickMsg } from '../models/portal-locale';

const GITHUB_URL = 'https://github.com/bruno-hao97/ai-gateway';
const MCP_TOOL_COUNT = 10;

const { lang } = useData();
const locale = computed(() => localeFromVitepressLang(lang.value));
const prefix = computed(() => portalPrefix(locale.value));
const catalogLang = computed((): CatalogLang => locale.value);

function t(en: string, vi: string, th?: string): string {
  return pickMsg(locale.value, en, vi, th);
}

const signupLink = computed(() => `${prefix.value}/signup/`);
const modelsLink = computed(() => `${prefix.value}/models/`);
const quickstartLink = computed(() => `${prefix.value}/quickstart`);
const mcpLink = computed(() => `${prefix.value}/mcp/`);
const principlesLink = computed(() => `${prefix.value}/principles`);
const chatLink = computed(() => `${prefix.value}/app/chat/`);

const loading = ref(true);
const modelCount = ref(0);
const providerCount = ref(0);

const stats = computed(() => [
  {
    value: loading.value ? '—' : String(modelCount.value || '—'),
    label: t('Models', 'Models', 'โมเดล'),
  },
  {
    value: loading.value ? '—' : String(providerCount.value || '—'),
    label: t('Providers', 'Providers', 'ผู้ให้บริการ'),
  },
  {
    value: String(JOB_TYPES.length),
    label: t('Job types', 'Loại job', 'ประเภทงาน'),
  },
  {
    value: String(MCP_TOOL_COUNT),
    label: t('MCP tools', 'MCP tools', 'MCP tools'),
  },
]);

const resources = computed(() => [
  {
    kicker: 'Documentation',
    title: t('Quickstart & API reference', 'Quickstart & API reference', 'Quickstart และ API reference'),
    desc: t(
      'Login, list models, create an image job, and poll — bilingual EN/VI docs with OpenAPI and cookbook.',
      'Hướng dẫn đăng nhập, list models, tạo image job và poll — song ngữ EN/VI với OpenAPI và cookbook.',
      'เข้าสู่ระบบ list models สร้าง image job และ poll — เอกสาร EN/VI พร้อม OpenAPI และ cookbook',
    ),
    href: quickstartLink.value,
    cta: t('Read the guide →', 'Đọc hướng dẫn →', 'อ่านคู่มือ →'),
    external: false,
  },
  {
    kicker: t('Open source', 'Open source', 'โอเพนซอร์ส'),
    title: t('Gateway on GitHub', 'Gateway trên GitHub', 'Gateway บน GitHub'),
    desc: t(
      'Express TypeScript Gommo proxy + REST wrap — Docker, health checks, MCP server, and TypeScript SDK.',
      'Express TypeScript proxy + REST wrap Gommo — Docker, health check, MCP server và TypeScript SDK.',
      'Express TypeScript proxy + REST wrap Gommo — Docker health check MCP server และ TypeScript SDK',
    ),
    href: GITHUB_URL,
    cta: t('View repository →', 'Xem repository →', 'ดู repository →'),
    external: true,
  },
]);

const highlights = computed(() => [
  {
    title: t('Gommo in one gateway', 'Gommo trong một gateway', 'Gommo ในเกตเวย์เดียว'),
    desc: t(
      'Transparent proxy and REST wrap — image, video, music, TTS, chat, and tools through one deployable base URL.',
      'Proxy trong suốt và REST wrap — image, video, music, TTS, chat và tools qua một base URL deploy được.',
      'Proxy โปร่งใสและ REST wrap — image video music TTS chat และ tools ผ่าน base URL เดียวที่ deploy ได้',
    ),
  },
  {
    title: t('Portal for creators', 'Portal cho creator', 'Portal สำหรับ creator'),
    desc: t(
      'Chat with Auto Router, Playground for jobs, model catalog, and credits — no code required.',
      'Chat với Auto Router, Playground thử job, catalog models và nạp credits — không bắt buộc viết code.',
      'แชทกับ Auto Router Playground สำหรับงาน แคตตาล็อกโมเดล และเครดิต — ไม่ต้องเขียนโค้ด',
    ),
  },
  {
    title: t('Tools for developers', 'Công cụ cho developer', 'เครื่องมือสำหรับ developer'),
    desc: t(
      'Bilingual docs, OpenAPI, TypeScript SDK, cookbook, and MCP server for Cursor and agents.',
      'Docs song ngữ, OpenAPI, TypeScript SDK, cookbook và MCP server cho Cursor và agent.',
      'เอกสารสองภาษา OpenAPI TypeScript SDK cookbook และ MCP server สำหรับ Cursor และ agent',
    ),
  },
]);

const ecosystemLinks = computed(() => [
  { label: t('Models catalog', 'Catalog models', 'แคตตาล็อกโมเดล'), href: modelsLink.value },
  { label: t('MCP & agents', 'MCP & agents', 'MCP และ agent'), href: mcpLink.value },
  { label: t('Principles', 'Nguyên tắc', 'หลักการ'), href: principlesLink.value },
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
        <h1 class="gw-about-title">{{ t('About AI Gateway', 'Về AI Gateway', 'เกี่ยวกับ AI Gateway') }}</h1>
        <p class="gw-about-mission">
          {{
            t(
              'AI Gateway is an all-in-one platform for generating images, videos, audio, and chat — built on Gommo with a unified API, developer docs, and a signed-in portal for creators and teams.',
              'AI Gateway là nền tảng tất cả trong một để tạo ảnh, video, audio và chat — xây trên Gommo với API thống nhất, docs developer và portal đăng nhập cho creator và team.',
              'AI Gateway คือแพลตฟอร์มครบวงจรสำหรับสร้างรูป วิดีโอ เสียง และแชท — สร้างบน Gommo ด้วย API รวม เอกสาร developer และ portal สำหรับ creator และทีม',
            )
          }}
        </p>
      </section>

      <section class="gw-about-stats" :aria-label="t('Platform stats', 'Thống kê nền tảng', 'สถิติแพลตฟอร์ม')">
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
          {{ t('Built for creators and developers', 'Dành cho creator và developer', 'สำหรับ creator และ developer') }}
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
        <h2>{{ t('Ready to get started?', 'Sẵn sàng bắt đầu?', 'พร้อมเริ่มแล้วหรือยัง?') }}</h2>
        <p>
          {{
            t(
              'Join creators and developers building with AI Gateway.',
              'Tham gia cùng creator và developer đang dùng AI Gateway.',
              'เข้าร่วมกับ creator และ developer ที่ใช้ AI Gateway',
            )
          }}
        </p>
        <a :href="signupLink" class="gw-about-btn gw-about-btn-primary gw-about-btn-block">{{
          t('Sign up for free', 'Đăng ký miễn phí', 'สมัครฟรี')
        }}</a>
        <p class="gw-about-cta-alt">
          {{ t('Or', 'Hoặc', 'หรือ') }}
          <a :href="chatLink">{{ t('open Chat', 'mở Chat', 'เปิด Chat') }}</a>
          {{
            t(
              'without signing up again if you already have an account.',
              'nếu bạn đã có tài khoản.',
              'หากคุณมีบัญชีแล้ว ไม่ต้องสมัครใหม่',
            )
          }}
        </p>
      </section>
    </div>
  </div>
</template>
