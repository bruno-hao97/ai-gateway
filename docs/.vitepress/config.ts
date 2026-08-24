import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'AI Gateway',
  description: 'Developer docs — Gommo integration (proxy + REST gateway)',
  base: '/',
  themeConfig: {
    nav: [
      { text: 'Quickstart', link: '/quickstart' },
      { text: 'Integration modes', link: '/integration-modes' },
      { text: 'Reference', link: '/reference/media' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quickstart', link: '/quickstart' },
          { text: 'Authentication', link: '/authentication' },
          { text: 'Integration modes', link: '/integration-modes' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Media & jobs', link: '/reference/media' },
          { text: 'Upload', link: '/reference/upload' },
          { text: 'Chat', link: '/reference/chat' },
          { text: 'Audio', link: '/reference/audio' },
          { text: 'Billing (PayOS)', link: '/reference/billing' },
          { text: 'Admin (server-only)', link: '/reference/admin' },
        ],
      },
    ],
    socialLinks: [],
  },
});
