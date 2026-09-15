<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import {
  getLegalContent,
  SUPPORT_EMAIL,
  type LegalPageType,
} from '../models/legal-content';
import { localeFromVitepressLang, localePrefix, pickMsg } from '../models/portal-locale';

const props = defineProps<{
  type: LegalPageType;
}>();

const { lang } = useData();
const locale = computed(() => localeFromVitepressLang(lang.value));
const prefix = computed(() => localePrefix(locale.value));

function m(en: string, vi: string, th?: string): string {
  return pickMsg(locale.value, en, vi, th);
}

const year = new Date().getFullYear();

const content = computed(() => getLegalContent(props.type, locale.value));

const homeLink = computed(() => `${prefix.value}/`);

const crossNavHref = computed(() => {
  const href = content.value.crossNav.href.replace(/^\/vi/, '');
  return `${prefix.value}${href.startsWith('/') ? href : `/${href}`}`;
});
const isPrivacy = computed(() => props.type === 'privacy');
</script>

<template>
  <div class="gw-legal">
    <div class="gw-legal-shell">
      <header class="gw-legal-topbar">
        <a :href="homeLink" class="gw-legal-brand">
          <span class="gw-legal-brand-mark" aria-hidden="true">⬡</span>
          <span>AI Gateway</span>
        </a>
        <nav class="gw-legal-topnav" :aria-label="m('Legal', 'Pháp lý', 'กฎหมาย')">
          <a :href="homeLink">{{ m('Home', 'Trang chủ', 'หน้าแรก') }}</a>
          <a :href="crossNavHref">{{ content.crossNav.label }}</a>
        </nav>
      </header>

      <article class="gw-legal-card">
        <div class="gw-legal-card-head">
          <span
            class="gw-legal-icon"
            :class="isPrivacy ? 'gw-legal-icon-privacy' : 'gw-legal-icon-terms'"
            aria-hidden="true"
          >
            {{ isPrivacy ? '🛡' : '📄' }}
          </span>
          <h1 class="gw-legal-title">{{ content.title }}</h1>
        </div>

        <p class="gw-legal-intro">{{ content.intro }}</p>

        <section
          v-if="content.compliance"
          class="gw-legal-compliance"
          aria-labelledby="gw-legal-compliance-heading"
        >
          <p class="gw-legal-compliance-badge">{{ content.compliance.badge }}</p>
          <h2 id="gw-legal-compliance-heading" class="gw-legal-compliance-heading">
            {{ content.compliance.heading }}
          </h2>
          <p class="gw-legal-compliance-warning">{{ content.compliance.warning }}</p>
          <ol class="gw-legal-compliance-list">
            <li v-for="(item, i) in content.compliance.items" :key="i">{{ item }}</li>
          </ol>
        </section>

        <section
          v-for="section in content.sections"
          :key="section.id"
          class="gw-legal-section"
        >
          <h2 class="gw-legal-section-title">{{ section.title }}</h2>
          <ul class="gw-legal-list">
            <li v-for="(item, i) in section.items" :key="i">
              <template v-if="item.title">
                <strong>{{ item.title }}:</strong> {{ item.text }}
              </template>
              <template v-else>{{ item.text }}</template>
            </li>
          </ul>
        </section>

        <div class="gw-legal-contact">
          <p class="gw-legal-contact-label">{{ content.contactLabel }}</p>
          <a class="gw-legal-contact-email" :href="`mailto:${SUPPORT_EMAIL}`">{{
            SUPPORT_EMAIL
          }}</a>
        </div>
      </article>

      <p class="gw-legal-page-copy">© {{ year }} AI Gateway</p>
    </div>
  </div>
</template>
