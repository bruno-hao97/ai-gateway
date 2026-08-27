export type DocsZone = 'guide' | 'reference' | 'sdk' | 'cookbook';

export function normalizePath(path: string): string {
  let p = path.split('?')[0]?.split('#')[0] ?? '/';
  if (p.endsWith('.html')) p = p.slice(0, -5) || '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p.endsWith('/index')) p = p.slice(0, -6) || '/';
  return p || '/';
}

export function stripLocale(path: string): { locale: 'en' | 'vi'; path: string } {
  const normalized = normalizePath(path);
  if (normalized === '/vi' || normalized.startsWith('/vi/')) {
    const rest = normalized.slice(3) || '/';
    return { locale: 'vi', path: rest === '' ? '/' : rest };
  }
  return { locale: 'en', path: normalized };
}

const GUIDE_PREFIXES = [
  '/quickstart',
  '/authentication',
  '/principles',
  '/mcp',
  '/faq',
  '/report-feedback',
  '/guides',
  '/features',
  '/privacy',
  '/best-practices',
  '/deploy',
  '/community',
  '/integration-modes',
  '/routing',
];

function isModelsDocPath(path: string): boolean {
  return (
    path === '/models/guide' ||
    path === '/models/job-types' ||
    path === '/models/parameters' ||
    path.startsWith('/models/guide/') ||
    path.startsWith('/models/job-types/') ||
    path.startsWith('/models/parameters/')
  );
}

function isGuidePath(path: string): boolean {
  return (
    isModelsDocPath(path) ||
    GUIDE_PREFIXES.some((pre) => path === pre || path.startsWith(`${pre}/`))
  );
}

export function getDocsZone(path: string): DocsZone | null {
  const { path: p } = stripLocale(path);
  if (p.startsWith('/reference')) return 'reference';
  if (p.startsWith('/cookbook')) return 'cookbook';
  if (p.startsWith('/sdk')) return 'sdk';
  if (isGuidePath(p)) return 'guide';
  return null;
}

export function showDocsSubNav(path: string): boolean {
  return getDocsZone(path) !== null;
}

export function isAppShellPath(path: string): boolean {
  const { path: p } = stripLocale(path);
  if (p === '/') return true;
  if (p.startsWith('/app')) return true;
  if (p.startsWith('/login') || p.startsWith('/signup')) return true;
  if (isModelsDocPath(p)) return false;
  if (p.startsWith('/models')) return true;
  return false;
}
