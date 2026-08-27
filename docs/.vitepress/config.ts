import { defineConfig } from 'vitepress';

const playgroundLink = 'http://localhost:3001/portal/playground.html';

const overviewSidebarEn = [
  { text: 'Introduction', link: '/' },
  { text: 'Quickstart', link: '/quickstart' },
  { text: 'Authentication', link: '/authentication' },
  { text: 'Principles', link: '/principles' },
  { text: 'MCP & agents', link: '/mcp' },
  { text: 'Billing & credits', link: '/guides/billing-credits' },
  { text: 'FAQ', link: '/faq' },
  { text: 'Report feedback', link: '/report-feedback' },
];

const overviewSidebarVi = [
  { text: 'Giới thiệu', link: '/vi/' },
  { text: 'Quickstart', link: '/vi/quickstart' },
  { text: 'Authentication', link: '/vi/authentication' },
  { text: 'Nguyên tắc', link: '/vi/principles' },
  { text: 'MCP & agents', link: '/vi/mcp' },
  { text: 'Billing & credits', link: '/vi/guides/billing-credits' },
  { text: 'FAQ', link: '/vi/faq' },
  { text: 'Góp ý', link: '/vi/report-feedback' },
];

const routingSidebarEn = [
  { text: 'Overview', link: '/routing/' },
  { text: 'Upstream hosts', link: '/routing/upstream-hosts' },
  { text: 'Integration modes', link: '/routing/integration-modes' },
  { text: 'Endpoint map', link: '/routing/endpoint-map' },
  { text: 'Choosing a mode', link: '/routing/choosing-a-mode' },
];

const routingSidebarVi = [
  { text: 'Tổng quan', link: '/vi/routing/' },
  { text: 'Upstream hosts', link: '/vi/routing/upstream-hosts' },
  { text: 'Integration modes', link: '/vi/routing/integration-modes' },
  { text: 'Endpoint map', link: '/vi/routing/endpoint-map' },
  { text: 'Choosing a mode', link: '/vi/routing/choosing-a-mode' },
];

const modelsSidebarEn = [
  { text: 'Catalog', link: '/models/' },
  { text: 'Compare', link: '/models/compare/' },
  { text: 'Integration guide', link: '/models/guide' },
  { text: 'Job types', link: '/models/job-types' },
  { text: 'Parameters', link: '/models/parameters' },
  { text: 'Playground', link: playgroundLink, target: '_blank' },
];

const modelsSidebarVi = [
  { text: 'Catalog', link: '/vi/models/' },
  { text: 'So sánh', link: '/vi/models/compare/' },
  { text: 'Hướng dẫn tích hợp', link: '/vi/models/guide' },
  { text: 'Job types', link: '/vi/models/job-types' },
  { text: 'Parameters', link: '/vi/models/parameters' },
  { text: 'Playground', link: playgroundLink, target: '_blank' },
];

const modelsSectionSidebarEn = [
  { text: 'Models', items: modelsSidebarEn },
  { text: 'Routing', items: routingSidebarEn },
];

const modelsSectionSidebarVi = [
  { text: 'Models', items: modelsSidebarVi },
  { text: 'Routing', items: routingSidebarVi },
];

const featuresSidebarEn = [
  { text: 'Overview', link: '/features/' },
  { text: 'Media jobs', link: '/features/media-jobs' },
  { text: 'Chat', link: '/features/chat' },
  { text: 'Upload', link: '/features/upload' },
  { text: 'Audio & TTS', link: '/features/audio' },
];

const featuresSidebarVi = [
  { text: 'Tổng quan', link: '/vi/features/' },
  { text: 'Media jobs', link: '/vi/features/media-jobs' },
  { text: 'Chat', link: '/vi/features/chat' },
  { text: 'Upload', link: '/vi/features/upload' },
  { text: 'Audio & TTS', link: '/vi/features/audio' },
];

const communitySidebarEn = [
  { text: 'Overview', link: '/community/' },
];

const communitySidebarVi = [
  { text: 'Tổng quan', link: '/vi/community/' },
];

const opsSidebarEn = [
  { text: 'Privacy & security', link: '/privacy/' },
  { text: 'Best practices', link: '/best-practices/' },
  { text: 'Deploy & ops', link: '/deploy/' },
];

const opsSidebarVi = [
  { text: 'Privacy & security', link: '/vi/privacy/' },
  { text: 'Best practices', link: '/vi/best-practices/' },
  { text: 'Deploy & ops', link: '/vi/deploy/' },
];

const referenceSidebarEn = [
  { text: 'OpenAPI', link: '/reference/openapi' },
  { text: 'Media & jobs', link: '/reference/media' },
  { text: 'Upload', link: '/reference/upload' },
  { text: 'Chat', link: '/reference/chat' },
  { text: 'Audio', link: '/reference/audio' },
  { text: 'Billing (PayOS)', link: '/reference/billing' },
  { text: 'Admin (server-only)', link: '/reference/admin' },
];

const referenceSidebarVi = [
  { text: 'OpenAPI', link: '/vi/reference/openapi' },
  { text: 'Media & jobs', link: '/vi/reference/media' },
  { text: 'Upload', link: '/vi/reference/upload' },
  { text: 'Chat', link: '/vi/reference/chat' },
  { text: 'Audio', link: '/vi/reference/audio' },
  { text: 'Billing (PayOS)', link: '/vi/reference/billing' },
  { text: 'Admin (server-only)', link: '/vi/reference/admin' },
];

const cookbookSidebarEn = [
  { text: 'Overview', link: '/cookbook/' },
  { text: 'First image job (wait)', link: '/cookbook/image-job-wait' },
  { text: 'Async job + poll', link: '/cookbook/job-poll-async' },
  { text: 'Video or music job', link: '/cookbook/video-music-job' },
  { text: 'Tool jobs (upscale, remove-bg)', link: '/cookbook/tool-jobs' },
  { text: 'Upload image', link: '/cookbook/upload-image' },
  { text: 'Chat + stream', link: '/cookbook/chat-stream' },
  { text: 'Audio TTS', link: '/cookbook/audio-tts' },
  { text: 'PayOS topup', link: '/cookbook/payos-topup' },
  { text: 'Agent HTTP flow', link: '/cookbook/agent-http-flow' },
];

const cookbookSidebarVi = [
  { text: 'Tổng quan', link: '/vi/cookbook/' },
  { text: 'Image job đầu tiên (wait)', link: '/vi/cookbook/image-job-wait' },
  { text: 'Job async + poll', link: '/vi/cookbook/job-poll-async' },
  { text: 'Video hoặc music job', link: '/vi/cookbook/video-music-job' },
  { text: 'Tool jobs (upscale, remove-bg)', link: '/vi/cookbook/tool-jobs' },
  { text: 'Upload ảnh', link: '/vi/cookbook/upload-image' },
  { text: 'Chat + stream', link: '/vi/cookbook/chat-stream' },
  { text: 'Audio TTS', link: '/vi/cookbook/audio-tts' },
  { text: 'PayOS nạp credit', link: '/vi/cookbook/payos-topup' },
  { text: 'Agent HTTP flow', link: '/vi/cookbook/agent-http-flow' },
];

const sdkSidebarEn = [
  { text: 'Overview', link: '/sdk/' },
  {
    text: 'TypeScript SDK',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/sdk/typescript/' },
      { text: 'Installation', link: '/sdk/typescript/installation' },
      { text: 'Authentication', link: '/sdk/typescript/authentication' },
      { text: 'Models', link: '/sdk/typescript/models' },
      { text: 'Jobs', link: '/sdk/typescript/jobs' },
      { text: 'Chat', link: '/sdk/typescript/chat' },
      { text: 'Upload', link: '/sdk/typescript/upload' },
      { text: 'Audio', link: '/sdk/typescript/audio' },
      { text: 'Billing', link: '/sdk/typescript/billing' },
      { text: 'Errors', link: '/sdk/typescript/errors' },
    ],
  },
];

const sdkSidebarVi = [
  { text: 'Tổng quan', link: '/vi/sdk/' },
  {
    text: 'TypeScript SDK',
    collapsed: false,
    items: [
      { text: 'Tổng quan', link: '/vi/sdk/typescript/' },
      { text: 'Installation', link: '/vi/sdk/typescript/installation' },
      { text: 'Authentication', link: '/vi/sdk/typescript/authentication' },
      { text: 'Models', link: '/vi/sdk/typescript/models' },
      { text: 'Jobs', link: '/vi/sdk/typescript/jobs' },
      { text: 'Chat', link: '/vi/sdk/typescript/chat' },
      { text: 'Upload', link: '/vi/sdk/typescript/upload' },
      { text: 'Audio', link: '/vi/sdk/typescript/audio' },
      { text: 'Billing', link: '/vi/sdk/typescript/billing' },
      { text: 'Errors', link: '/vi/sdk/typescript/errors' },
    ],
  },
];

/** Default sidebar — excludes sections that have their own top nav tab. */
const docsSidebarEn = [
  { text: 'Overview', items: overviewSidebarEn },
  { text: 'Features', items: featuresSidebarEn },
  { text: 'Privacy & ops', items: opsSidebarEn },
  { text: 'Community', items: communitySidebarEn },
];

const docsSidebarVi = [
  { text: 'Overview', items: overviewSidebarVi },
  { text: 'Features', items: featuresSidebarVi },
  { text: 'Privacy & ops', items: opsSidebarVi },
  { text: 'Community', items: communitySidebarVi },
];

const navEn = [
  { text: 'Quickstart', link: '/quickstart' },
  { text: 'Models', link: '/models/' },
  { text: 'API Reference', link: '/reference/media' },
  { text: 'Cookbook', link: '/cookbook/' },
  { text: 'Client SDKs', link: '/sdk/' },
  { text: 'Playground', link: playgroundLink, target: '_blank' },
];

const navVi = [
  { text: 'Quickstart', link: '/vi/quickstart' },
  { text: 'Models', link: '/vi/models/' },
  { text: 'API Reference', link: '/vi/reference/media' },
  { text: 'Cookbook', link: '/vi/cookbook/' },
  { text: 'Client SDKs', link: '/vi/sdk/' },
  { text: 'Playground', link: playgroundLink, target: '_blank' },
];

const pathSidebarEn = {
  '/cookbook/': [{ text: 'Cookbook', items: cookbookSidebarEn }],
  '/sdk/': [{ text: 'Client SDKs', items: sdkSidebarEn }],
  '/reference/': [{ text: 'API Reference', items: referenceSidebarEn }],
  '/models/': modelsSectionSidebarEn,
  '/routing/': modelsSectionSidebarEn,
  '/': docsSidebarEn,
};

const pathSidebarVi = {
  '/vi/cookbook/': [{ text: 'Cookbook', items: cookbookSidebarVi }],
  '/vi/sdk/': [{ text: 'Client SDKs', items: sdkSidebarVi }],
  '/vi/reference/': [{ text: 'API Reference', items: referenceSidebarVi }],
  '/vi/models/': modelsSectionSidebarVi,
  '/vi/routing/': modelsSectionSidebarVi,
  '/vi/': docsSidebarVi,
};

export default defineConfig({
  title: 'AI Gateway',
  description: 'Developer docs — Gommo proxy + REST gateway (OpenRouter-style API platform)',
  base: '/',
  appearance: 'dark',
  lastUpdated: true,
  ignoreDeadLinks: [/^https?:\/\/localhost/, /README/],
  vite: {
    server: {
      proxy: {
        '/gateway': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/ai': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/billing': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'AI Gateway',
      description: 'Developer docs — Gommo proxy + REST gateway',
      themeConfig: {
        nav: navEn,
        sidebar: pathSidebarEn,
        outline: { level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        darkModeSwitchLabel: 'Appearance',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
      },
    },
    vi: {
      label: 'Tiếng Việt',
      lang: 'vi-VN',
      link: '/vi/',
      title: 'AI Gateway',
      description: 'Tài liệu developer — proxy + REST gateway Gommo',
      themeConfig: {
        nav: navVi,
        sidebar: pathSidebarVi,
        outline: { level: [2, 3] },
        docFooter: { prev: 'Trước', next: 'Tiếp' },
        darkModeSwitchLabel: 'Giao diện',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Lên đầu trang',
        langMenuLabel: 'Ngôn ngữ',
      },
    },
  },
});
