<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));
const year = new Date().getFullYear();

function t(en: string, vi: string): string {
  return isVi.value ? vi : en;
}

const footerAriaLabel = computed(() => t('Site', 'Trang web'));
const privacyPolicyLabel = computed(() => t('Privacy Policy', 'Chính sách quyền riêng tư'));
const termsLabel = computed(() => t('Terms of Service', 'Điều khoản dịch vụ'));
const legalAriaLabel = computed(() => t('Legal', 'Pháp lý'));

const linkColumns = computed((): FooterColumn[] => {
  const p = prefix.value;
  return [
    {
      id: 'platform',
      title: t('Platform', 'Nền tảng'),
      links: [
        { label: t('Models', 'Models'), href: `${p}/models/` },
        { label: t('Compare models', 'So sánh models'), href: `${p}/models/compare/` },
        { label: t('Media Playground', 'Media Playground'), href: `${p}/app/playground/` },
        { label: t('Chat', 'Chat'), href: `${p}/app/chat/` },
        { label: t('MCP', 'MCP'), href: `${p}/mcp/` },
        { label: t('Credits', 'Credits'), href: `${p}/app/credits/` },
      ],
    },
    {
      id: 'company',
      title: t('Company', 'Công ty'),
      links: [
        { label: t('About', 'Về chúng tôi'), href: `${p}/about/` },
        { label: t('Privacy Policy', 'Chính sách quyền riêng tư'), href: `${p}/privacy-policy/` },
        { label: t('Terms of Service', 'Điều khoản dịch vụ'), href: `${p}/terms/` },
        { label: t('Principles', 'Nguyên tắc'), href: `${p}/principles` },
        { label: t('Report feedback', 'Góp ý'), href: `${p}/report-feedback` },
        { label: t('Community', 'Cộng đồng'), href: `${p}/community/` },
        { label: t('Best practices', 'Best practices'), href: `${p}/best-practices/` },
        { label: t('Deploy & ops', 'Deploy & ops'), href: `${p}/deploy/` },
      ],
    },
    {
      id: 'developer',
      title: t('Developer', 'Developer'),
      links: [
        { label: t('Quickstart', 'Quickstart'), href: `${p}/quickstart` },
        { label: t('Authentication', 'Authentication'), href: `${p}/authentication` },
        { label: t('API Reference', 'API Reference'), href: `${p}/reference/openapi` },
        { label: t('Cookbook', 'Cookbook'), href: `${p}/cookbook/` },
        { label: t('SDK', 'SDK'), href: `${p}/sdk/` },
        { label: t('FAQ', 'FAQ'), href: `${p}/faq` },
      ],
    },
  ];
});
</script>

<template>
  <footer class="gw-site-footer" :aria-label="footerAriaLabel">
    <div class="gw-site-footer-main">
      <div class="gw-site-footer-brand">
        <a :href="`${prefix}/`" class="gw-site-footer-logo">AI Gateway</a>
      </div>

      <div v-for="col in linkColumns" :key="col.id" class="gw-site-footer-col">
        <h3 class="gw-site-footer-heading">{{ col.title }}</h3>
        <ul class="gw-site-footer-links">
          <li v-for="link in col.links" :key="link.href">
            <a
              :href="link.href"
              :target="link.external ? '_blank' : undefined"
              :rel="link.external ? 'noopener noreferrer' : undefined"
            >
              {{ link.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="gw-site-footer-bottom">
      <span class="gw-site-footer-copy">© {{ year }} AI Gateway</span>
      <nav class="gw-site-footer-legal" :aria-label="legalAriaLabel">
        <a :href="`${prefix}/privacy-policy/`">{{ privacyPolicyLabel }}</a>
        <a :href="`${prefix}/terms/`">{{ termsLabel }}</a>
      </nav>
    </div>
  </footer>
</template>
