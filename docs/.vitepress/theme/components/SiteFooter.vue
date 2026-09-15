<script setup lang="ts">
import { computed } from 'vue';
import { useHybridLocale } from '../composables/use-hybrid-locale';

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

const { prefix, t } = useHybridLocale();
const year = new Date().getFullYear();

const footerAriaLabel = computed(() => t('Site', 'Trang web', 'เว็บไซต์'));
const privacyPolicyLabel = computed(() =>
  t('Privacy Policy', 'Chính sách quyền riêng tư', 'นโยบายความเป็นส่วนตัว'),
);
const termsLabel = computed(() => t('Terms of Service', 'Điều khoản dịch vụ', 'ข้อกำหนดการใช้บริการ'));
const legalAriaLabel = computed(() => t('Legal', 'Pháp lý', 'กฎหมาย'));

const linkColumns = computed((): FooterColumn[] => {
  const p = prefix.value;
  return [
    {
      id: 'platform',
      title: t('Platform', 'Nền tảng', 'แพลตฟอร์ม'),
      links: [
        { label: t('Models', 'Models', 'โมเดล'), href: `${p}/models/` },
        { label: t('Compare models', 'So sánh models', 'เปรียบเทียบโมเดล'), href: `${p}/models/compare/` },
        {
          label: t('Media Playground', 'Media Playground', 'สนามทดลอง'),
          href: `${p}/app/playground/`,
        },
        { label: t('Chat', 'Chat', 'แชท'), href: `${p}/app/chat/` },
        { label: t('MCP', 'MCP', 'MCP'), href: `${p}/mcp/` },
        { label: t('Credits', 'Credits', 'เครดิต'), href: `${p}/app/credits/` },
      ],
    },
    {
      id: 'company',
      title: t('Company', 'Công ty', 'บริษัท'),
      links: [
        { label: t('About', 'Về chúng tôi', 'เกี่ยวกับเรา'), href: `${p}/about/` },
        {
          label: t('Privacy Policy', 'Chính sách quyền riêng tư', 'นโยบายความเป็นส่วนตัว'),
          href: `${p}/privacy-policy/`,
        },
        {
          label: t('Terms of Service', 'Điều khoản dịch vụ', 'ข้อกำหนดการใช้บริการ'),
          href: `${p}/terms/`,
        },
        { label: t('Principles', 'Nguyên tắc', 'หลักการ'), href: `${p}/principles` },
        { label: t('Report feedback', 'Góp ý', 'ส่ง feedback'), href: `${p}/report-feedback` },
        { label: t('Community', 'Cộng đồng', 'ชุมชน'), href: `${p}/community/` },
        {
          label: t('Best practices', 'Best practices', 'แนวปฏิบัติ'),
          href: `${p}/best-practices/`,
        },
        { label: t('Deploy & ops', 'Deploy & ops', 'Deploy & ops'), href: `${p}/deploy/` },
      ],
    },
    {
      id: 'developer',
      title: t('Developer', 'Developer', 'นักพัฒนา'),
      links: [
        { label: t('Quickstart', 'Quickstart', 'Quickstart'), href: `${p}/quickstart` },
        { label: t('Changelog', 'Changelog', 'Changelog'), href: `${p}/changelog` },
        {
          label: t('Authentication', 'Authentication', 'การยืนยันตัวตน'),
          href: `${p}/authentication`,
        },
        { label: t('API Reference', 'API Reference', 'อ้างอิง API'), href: `${p}/reference/openapi` },
        { label: t('Cookbook', 'Cookbook', 'Cookbook'), href: `${p}/cookbook/` },
        { label: t('SDK', 'SDK', 'SDK'), href: `${p}/sdk/` },
        { label: t('FAQ', 'FAQ', 'FAQ'), href: `${p}/faq` },
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
