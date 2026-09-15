import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import { loadEnv } from 'vite';
import { portalStaticPlugin } from './portal-plugin';
import { docRedirects } from './redirects';

const GITHUB_REPO = 'https://github.com/bruno-hao97/ai-gateway';
const EDIT_BRANCH = 'main';

type LocaleChrome = 'en' | 'vi' | 'th';

const CHROME_LABELS: Record<
  LocaleChrome,
  { appearance: string; menu: string; returnToTop: string; langMenu: string }
> = {
  en: {
    appearance: 'Appearance',
    menu: 'Menu',
    returnToTop: 'Return to top',
    langMenu: 'Change language',
  },
  vi: {
    appearance: 'Giao diện',
    menu: 'Menu',
    returnToTop: 'Lên đầu trang',
    langMenu: 'Ngôn ngữ',
  },
  th: {
    appearance: 'ธีม',
    menu: 'เมนู',
    returnToTop: 'กลับด้านบน',
    langMenu: 'เปลี่ยนภาษา',
  },
};

function sharedThemeConfig(opts: {
  logoLink: string;
  prev: string;
  next: string;
  editText: string;
  chrome: LocaleChrome;
}) {
  const labels = CHROME_LABELS[opts.chrome];
  return {
    logo: '/logo.svg',
    logoLink: opts.logoLink,
    search: {
      provider: 'local' as const,
      options: { detailedView: true },
    },
    editLink: {
      pattern: `${GITHUB_REPO}/edit/${EDIT_BRANCH}/docs/:path`,
      text: opts.editText,
    },
    socialLinks: [{ icon: 'github' as const, link: GITHUB_REPO }],
    outline: { level: [2, 3] as [number, number] },
    docFooter: { prev: opts.prev, next: opts.next },
    darkModeSwitchLabel: labels.appearance,
    sidebarMenuLabel: labels.menu,
    returnToTopLabel: labels.returnToTop,
    langMenuLabel: labels.langMenu,
  };
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = loadEnv('', repoRoot, '');
const gatewayProxyTarget = (
  env.GATEWAY_PROXY_TARGET ||
  env.VITE_GATEWAY_URL ||
  env.GATEWAY_URL ||
  'http://localhost:3001'
).replace(/\/$/, '');

const apiProxy = { target: gatewayProxyTarget, changeOrigin: true };

if (process.env.NODE_ENV !== 'production') {
  console.log(`[docs] API proxy → ${gatewayProxyTarget}`);
}

const overviewSidebarEn = [
  { text: 'Quickstart', link: '/quickstart' },
  { text: 'Changelog', link: '/changelog' },
  { text: 'Gommo public API', link: '/reference/gommo-public-api' },
  { text: 'Authentication', link: '/authentication' },
  { text: 'Principles', link: '/principles' },
  { text: 'MCP & agents', link: '/mcp' },
  { text: 'Billing & credits', link: '/guides/billing-credits' },
  { text: 'Activity hub', link: '/guides/activity-hub' },
  { text: 'Portal smoke test', link: '/guides/portal-smoke' },
  { text: 'BYOK production', link: '/guides/byok-production' },
  { text: 'FAQ', link: '/faq' },
  { text: 'Report feedback', link: '/report-feedback' },
];

const overviewSidebarVi = [
  { text: 'Quickstart', link: '/vi/quickstart' },
  { text: 'Changelog', link: '/vi/changelog' },
  { text: 'Gommo public API', link: '/vi/reference/gommo-public-api' },
  { text: 'Authentication', link: '/vi/authentication' },
  { text: 'Nguyên tắc', link: '/vi/principles' },
  { text: 'MCP & agents', link: '/vi/mcp' },
  { text: 'Billing & credits', link: '/vi/guides/billing-credits' },
  { text: 'Activity hub', link: '/vi/guides/activity-hub' },
  { text: 'Portal smoke test', link: '/vi/guides/portal-smoke' },
  { text: 'BYOK production', link: '/vi/guides/byok-production' },
  { text: 'FAQ', link: '/vi/faq' },
  { text: 'Góp ý', link: '/vi/report-feedback' },
];

const modelsRoutingInDocsEn = [
  { text: 'Integration guide', link: '/models/guide' },
  { text: 'Job types', link: '/models/job-types' },
  { text: 'Parameters', link: '/models/parameters' },
  { text: 'Routing overview', link: '/routing/' },
  { text: 'Upstream hosts', link: '/routing/upstream-hosts' },
  { text: 'Integration modes', link: '/routing/integration-modes' },
  { text: 'Endpoint map', link: '/routing/endpoint-map' },
  { text: 'Choosing a mode', link: '/routing/choosing-a-mode' },
];

const modelsRoutingInDocsVi = [
  { text: 'Hướng dẫn tích hợp', link: '/vi/models/guide' },
  { text: 'Job types', link: '/vi/models/job-types' },
  { text: 'Parameters', link: '/vi/models/parameters' },
  { text: 'Routing overview', link: '/vi/routing/' },
  { text: 'Upstream hosts', link: '/vi/routing/upstream-hosts' },
  { text: 'Integration modes', link: '/vi/routing/integration-modes' },
  { text: 'Endpoint map', link: '/vi/routing/endpoint-map' },
  { text: 'Choosing a mode', link: '/vi/routing/choosing-a-mode' },
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
  { text: 'Gommo public API', link: '/reference/gommo-public-api' },
  { text: 'OpenAPI', link: '/reference/openapi' },
  { text: 'API Playground', link: '/app/playground/' },
  { text: 'Media & jobs', link: '/reference/media' },
  { text: 'Upload', link: '/reference/upload' },
  { text: 'Chat', link: '/reference/chat' },
  { text: 'Audio', link: '/reference/audio' },
  { text: 'Billing', link: '/reference/billing' },
  { text: 'Usage history', link: '/reference/usage' },
  { text: 'Observability (beta)', link: '/reference/observability' },
  { text: 'BYOK (beta)', link: '/reference/byok' },
  { text: 'Admin (server-only)', link: '/reference/admin' },
];

const referenceSidebarVi = [
  { text: 'Gommo public API', link: '/vi/reference/gommo-public-api' },
  { text: 'OpenAPI', link: '/vi/reference/openapi' },
  { text: 'API Playground', link: '/vi/app/playground/' },
  { text: 'Media & jobs', link: '/vi/reference/media' },
  { text: 'Upload', link: '/vi/reference/upload' },
  { text: 'Chat', link: '/vi/reference/chat' },
  { text: 'Audio', link: '/vi/reference/audio' },
  { text: 'Billing', link: '/vi/reference/billing' },
  { text: 'Lịch sử usage', link: '/vi/reference/usage' },
  { text: 'Observability (beta)', link: '/vi/reference/observability' },
  { text: 'BYOK (beta)', link: '/vi/reference/byok' },
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
  { text: 'Gommo VietQR topup', link: '/cookbook/gommo-topup' },
  { text: 'PayOS topup (legacy)', link: '/cookbook/payos-topup' },
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
  { text: 'Gommo VietQR nạp credit', link: '/vi/cookbook/gommo-topup' },
  { text: 'PayOS nạp credit (legacy)', link: '/vi/cookbook/payos-topup' },
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

const mcpSidebarEn = [
  { text: 'Overview', link: '/mcp/' },
  { text: 'Other MCP hosts', link: '/mcp/other-hosts' },
  { text: 'Tool reference (10)', link: '/mcp/tools' },
  { text: 'Use cases & prompts', link: '/mcp/use-cases' },
  { text: 'Self-hosted (advanced)', link: '/mcp/self-hosted' },
];

const mcpSidebarVi = [
  { text: 'Tổng quan', link: '/vi/mcp/' },
  { text: 'Host MCP khác', link: '/vi/mcp/other-hosts' },
  { text: 'Tool reference (10)', link: '/vi/mcp/tools' },
  { text: 'Use cases & prompt', link: '/vi/mcp/use-cases' },
  { text: 'Self-hosted (nâng cao)', link: '/vi/mcp/self-hosted' },
];

/** Docs guide sidebar (tab Docs). */
const docsSidebarEn = [
  { text: 'Overview', items: overviewSidebarEn },
  { text: 'MCP', items: mcpSidebarEn },
  { text: 'Features', items: featuresSidebarEn },
  { text: 'Models & routing', items: modelsRoutingInDocsEn },
  { text: 'Privacy & ops', items: opsSidebarEn },
  { text: 'Community', items: communitySidebarEn },
];

const docsSidebarVi = [
  { text: 'Overview', items: overviewSidebarVi },
  { text: 'MCP', items: mcpSidebarVi },
  { text: 'Features', items: featuresSidebarVi },
  { text: 'Models & routing', items: modelsRoutingInDocsVi },
  { text: 'Privacy & ops', items: opsSidebarVi },
  { text: 'Community', items: communitySidebarVi },
];

const navEn = [
  { text: 'Home', link: '/app/' },
  { text: 'Models', link: '/models/' },
  { text: 'Playground', link: '/app/playground/' },
  { text: 'Chat', link: '/app/chat/' },
  { text: 'Docs', link: '/quickstart' },
];

const navVi = [
  { text: 'Trang chủ', link: '/vi/app/' },
  { text: 'Models', link: '/vi/models/' },
  { text: 'Playground', link: '/vi/app/playground/' },
  { text: 'Chat', link: '/vi/app/chat/' },
  { text: 'Docs', link: '/vi/quickstart' },
];

const navTh = [
  { text: 'หน้าแรก', link: '/th/app/' },
  { text: 'โมเดล', link: '/th/models/' },
  { text: 'สนามทดลอง', link: '/th/app/playground/' },
  { text: 'แชท', link: '/th/app/chat/' },
  { text: 'เอกสาร', link: '/th/quickstart' },
];

type SidebarItem = {
  text: string;
  link: string;
  items?: SidebarItem[];
  collapsed?: boolean;
};

function prefixSidebar<T extends SidebarItem>(items: T[], localePrefix: string): T[] {
  return items.map((item) => {
    const next = { ...item } as T;
    if (item.link) {
      next.link =
        item.link.startsWith(localePrefix) || item.link.startsWith('http')
          ? item.link
          : `${localePrefix}${item.link}`;
    }
    if (item.items?.length) next.items = prefixSidebar(item.items, localePrefix);
    return next;
  });
}

const overviewSidebarTh = [
  { text: 'เริ่มต้นใช้งาน', link: '/th/quickstart' },
  { text: 'บันทึกการเปลี่ยนแปลง', link: '/th/changelog' },
  { text: 'Gommo public API', link: '/th/reference/gommo-public-api' },
  { text: 'การยืนยันตัวตน', link: '/th/authentication' },
  { text: 'หลักการ', link: '/th/principles' },
  { text: 'MCP & เอเจนต์', link: '/th/mcp' },
  { text: 'Billing & เครดิต', link: '/th/guides/billing-credits' },
  { text: 'ฮับกิจกรรม', link: '/th/guides/activity-hub' },
  { text: 'ทดสอบ portal', link: '/th/guides/portal-smoke' },
  { text: 'BYOK production', link: '/th/guides/byok-production' },
  { text: 'คำถามที่พบบ่อย', link: '/th/faq' },
  { text: 'ส่ง feedback', link: '/th/report-feedback' },
];

const modelsRoutingInDocsTh = [
  { text: 'คู่มือการเชื่อมต่อ', link: '/th/models/guide' },
  { text: 'ประเภทงาน', link: '/th/models/job-types' },
  { text: 'พารามิเตอร์', link: '/th/models/parameters' },
  { text: 'ภาพรวม routing', link: '/th/routing/' },
  { text: 'โฮสต์ upstream', link: '/th/routing/upstream-hosts' },
  { text: 'โหมดการเชื่อมต่อ', link: '/th/routing/integration-modes' },
  { text: 'แผนที่ endpoint', link: '/th/routing/endpoint-map' },
  { text: 'เลือกโหมด', link: '/th/routing/choosing-a-mode' },
];

const featuresSidebarTh = [
  { text: 'ภาพรวม', link: '/th/features/' },
  { text: 'งานมีเดีย', link: '/th/features/media-jobs' },
  { text: 'แชท', link: '/th/features/chat' },
  { text: 'อัปโหลด', link: '/th/features/upload' },
  { text: 'เสียง & TTS', link: '/th/features/audio' },
];

const communitySidebarTh = [{ text: 'ภาพรวม', link: '/th/community/' }];

const opsSidebarTh = [
  { text: 'ความเป็นส่วนตัว & ความปลอดภัย', link: '/th/privacy/' },
  { text: 'แนวปฏิบัติที่ดี', link: '/th/best-practices/' },
  { text: 'Deploy & ปฏิบัติการ', link: '/th/deploy/' },
];

const referenceSidebarTh = [
  { text: 'Gommo public API', link: '/th/reference/gommo-public-api' },
  { text: 'OpenAPI', link: '/th/reference/openapi' },
  { text: 'สนามทดลอง API', link: '/th/app/playground/' },
  { text: 'มีเดีย & งาน', link: '/th/reference/media' },
  { text: 'อัปโหลด', link: '/th/reference/upload' },
  { text: 'แชท', link: '/th/reference/chat' },
  { text: 'เสียง', link: '/th/reference/audio' },
  { text: 'การเรียกเก็บเงิน', link: '/th/reference/billing' },
  { text: 'ประวัติการใช้งาน', link: '/th/reference/usage' },
  { text: 'Observability (เบต้า)', link: '/th/reference/observability' },
  { text: 'BYOK (เบต้า)', link: '/th/reference/byok' },
  { text: 'Admin (เซิร์ฟเวอร์เท่านั้น)', link: '/th/reference/admin' },
];

const cookbookSidebarTh = [
  { text: 'ภาพรวม', link: '/th/cookbook/' },
  { text: 'งานรูปแรก (wait)', link: '/th/cookbook/image-job-wait' },
  { text: 'งาน async + poll', link: '/th/cookbook/job-poll-async' },
  { text: 'งานวิดีโอหรือเพลง', link: '/th/cookbook/video-music-job' },
  { text: 'งาน tool (upscale, remove-bg)', link: '/th/cookbook/tool-jobs' },
  { text: 'อัปโหลดรูป', link: '/th/cookbook/upload-image' },
  { text: 'แชท + stream', link: '/th/cookbook/chat-stream' },
  { text: 'เสียง TTS', link: '/th/cookbook/audio-tts' },
  { text: 'Gommo VietQR เติมเครดิต', link: '/th/cookbook/gommo-topup' },
  { text: 'PayOS เติมเครดิต (legacy)', link: '/th/cookbook/payos-topup' },
  { text: 'Flow HTTP เอเจนต์', link: '/th/cookbook/agent-http-flow' },
];

const sdkSidebarTh = [
  { text: 'ภาพรวม', link: '/th/sdk/' },
  {
    text: 'TypeScript SDK',
    collapsed: false,
    items: [
      { text: 'ภาพรวม', link: '/th/sdk/typescript/' },
      { text: 'การติดตั้ง', link: '/th/sdk/typescript/installation' },
      { text: 'การยืนยันตัวตน', link: '/th/sdk/typescript/authentication' },
      { text: 'โมเดล', link: '/th/sdk/typescript/models' },
      { text: 'งาน', link: '/th/sdk/typescript/jobs' },
      { text: 'แชท', link: '/th/sdk/typescript/chat' },
      { text: 'อัปโหลด', link: '/th/sdk/typescript/upload' },
      { text: 'เสียง', link: '/th/sdk/typescript/audio' },
      { text: 'การเรียกเก็บเงิน', link: '/th/sdk/typescript/billing' },
      { text: 'ข้อผิดพลาด', link: '/th/sdk/typescript/errors' },
    ],
  },
];

const mcpSidebarTh = [
  { text: 'ภาพรวม', link: '/th/mcp/' },
  { text: 'MCP host อื่น', link: '/th/mcp/other-hosts' },
  { text: 'อ้างอิง tool (10)', link: '/th/mcp/tools' },
  { text: 'กรณีใช้งาน & prompt', link: '/th/mcp/use-cases' },
  { text: 'Self-hosted (ขั้นสูง)', link: '/th/mcp/self-hosted' },
];

const docsSidebarTh = [
  { text: 'ภาพรวม', items: overviewSidebarTh },
  { text: 'MCP', items: mcpSidebarTh },
  { text: 'ฟีเจอร์', items: featuresSidebarTh },
  { text: 'โมเดล & routing', items: modelsRoutingInDocsTh },
  { text: 'ความเป็นส่วนตัว & ปฏิบัติการ', items: opsSidebarTh },
  { text: 'ชุมชน', items: communitySidebarTh },
];

const pathSidebarTh = {
  '/th/cookbook/': [{ text: 'คู่มือปฏิบัติ', items: cookbookSidebarTh }],
  '/th/sdk/': [{ text: 'SDK ไคลเอนต์', items: sdkSidebarTh }],
  '/th/reference/': [{ text: 'อ้างอิง API', items: referenceSidebarTh }],
};

const pathSidebarEn = {
  '/cookbook/': [{ text: 'Cookbook', items: cookbookSidebarEn }],
  '/sdk/': [{ text: 'Client SDKs', items: sdkSidebarEn }],
  '/reference/': [{ text: 'API Reference', items: referenceSidebarEn }],
};

const pathSidebarVi = {
  '/vi/cookbook/': [{ text: 'Cookbook', items: cookbookSidebarVi }],
  '/vi/sdk/': [{ text: 'Client SDKs', items: sdkSidebarVi }],
  '/vi/reference/': [{ text: 'API Reference', items: referenceSidebarVi }],
};

/** Docs guide sidebar keys — models doc pages + routing stay in Docs zone (not catalog sidebar). */
const docsGuideSidebarEn = {
  '/quickstart': docsSidebarEn,
  '/changelog': docsSidebarEn,
  '/authentication': docsSidebarEn,
  '/principles': docsSidebarEn,
  '/mcp': docsSidebarEn,
  '/mcp/': docsSidebarEn,
  '/faq': docsSidebarEn,
  '/report-feedback': docsSidebarEn,
  '/guides/': docsSidebarEn,
  '/features/': docsSidebarEn,
  '/privacy/': docsSidebarEn,
  '/best-practices/': docsSidebarEn,
  '/deploy/': docsSidebarEn,
  '/community/': docsSidebarEn,
  '/integration-modes': docsSidebarEn,
  '/models/guide': docsSidebarEn,
  '/models/job-types': docsSidebarEn,
  '/models/parameters': docsSidebarEn,
  '/routing/': docsSidebarEn,
};

const docsGuideSidebarVi = {
  '/vi/quickstart': docsSidebarVi,
  '/vi/changelog': docsSidebarVi,
  '/vi/authentication': docsSidebarVi,
  '/vi/principles': docsSidebarVi,
  '/vi/mcp': docsSidebarVi,
  '/vi/mcp/': docsSidebarVi,
  '/vi/faq': docsSidebarVi,
  '/vi/report-feedback': docsSidebarVi,
  '/vi/guides/': docsSidebarVi,
  '/vi/features/': docsSidebarVi,
  '/vi/privacy/': docsSidebarVi,
  '/vi/best-practices/': docsSidebarVi,
  '/vi/deploy/': docsSidebarVi,
  '/vi/community/': docsSidebarVi,
  '/vi/integration-modes': docsSidebarVi,
  '/vi/models/guide': docsSidebarVi,
  '/vi/models/job-types': docsSidebarVi,
  '/vi/models/parameters': docsSidebarVi,
  '/vi/routing/': docsSidebarVi,
};

const docsGuideSidebarTh: Record<string, typeof docsSidebarTh> = {};
for (const key of Object.keys(docsGuideSidebarEn)) {
  docsGuideSidebarTh[`/th${key}`] = docsSidebarTh;
}

export default defineConfig({
  title: 'AI Gateway',
  description: 'Developer docs — Gommo proxy + REST gateway (OpenRouter-style API platform)',
  base: '/',
  cleanUrls: true,
  appearance: 'dark',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'AI Gateway' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
  ],
  ignoreDeadLinks: [/^https?:\/\/localhost/, /README/],
  redirects: docRedirects,
  vite: {
    plugins: [portalStaticPlugin()],
    server: {
      // Quick tunnel: cloudflared tunnel --url http://localhost:5173
      allowedHosts: ['.trycloudflare.com'],
      proxy: {
        '/gateway': apiProxy,
        '/ai': apiProxy,
        '/billing': apiProxy,
        '/api/apps/go-mmo': apiProxy,
        '/api/library': apiProxy,
        '/health': apiProxy,
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
        ...sharedThemeConfig({
          logoLink: '/',
          prev: 'Previous',
          next: 'Next',
          editText: 'Edit this page on GitHub',
          chrome: 'en',
        }),
        nav: navEn,
        sidebar: {
          ...pathSidebarEn,
          ...docsGuideSidebarEn,
        },
      },
    },
    vi: {
      label: 'Tiếng Việt',
      lang: 'vi-VN',
      link: '/vi/',
      title: 'AI Gateway',
      description: 'Tài liệu developer — proxy + REST gateway Gommo',
      themeConfig: {
        ...sharedThemeConfig({
          logoLink: '/vi/',
          prev: 'Trước',
          next: 'Tiếp',
          editText: 'Sửa trang trên GitHub',
          chrome: 'vi',
        }),
        nav: navVi,
        sidebar: {
          ...pathSidebarVi,
          ...docsGuideSidebarVi,
        },
      },
    },
    th: {
      label: 'ไทย',
      lang: 'th-TH',
      link: '/th/',
      title: 'AI Gateway',
      description: 'เอกสารนักพัฒนา — Gommo proxy + REST gateway',
      themeConfig: {
        ...sharedThemeConfig({
          logoLink: '/th/',
          prev: 'ก่อนหน้า',
          next: 'ถัดไป',
          editText: 'แก้ไขบน GitHub',
          chrome: 'th',
        }),
        nav: navTh,
        sidebar: {
          ...pathSidebarTh,
          ...docsGuideSidebarTh,
        },
      },
    },
  },
});
