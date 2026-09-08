/** Dev: same-origin via VitePress proxy (GATEWAY_PROXY_TARGET). Prod: VITE_GATEWAY_URL at build. */
export function apiBase(): string {
  const env = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'https://api.yourdomain.com';
}

export type LocalePrefix = '' | '/vi';

export interface PlaygroundModelRef {
  slug?: string;
  jobType?: string;
}

export interface PlaygroundEmbedOptions {
  type?: string;
  model?: string;
  panel?: string;
  parentOrigin?: string;
  lang?: string;
}

function resolvePlaygroundUrl(base: string): URL {
  if (base.startsWith('/')) {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(base, origin);
  }
  return new URL(base);
}

function rawPlaygroundBase(): string {
  const base = apiBase();
  if (base) return `${base}/portal/playground.html`;
  return '/portal/playground.html';
}

/** Docs app route — auth guard redirects guests to login. */
export function playgroundAppPath(
  localePrefix: LocalePrefix = '',
  model?: PlaygroundModelRef,
): string {
  const base = `${localePrefix}/app/playground/`;
  if (!model?.slug && !model?.jobType) return base;
  const params = new URLSearchParams();
  if (model.jobType) params.set('type', model.jobType);
  if (model.slug) params.set('model', model.slug);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/** Full portal page — open in new tab. */
export function playgroundUrl(model?: PlaygroundModelRef): string {
  const u = resolvePlaygroundUrl(rawPlaygroundBase());
  if (model?.slug) u.searchParams.set('model', model.slug);
  if (model?.jobType) u.searchParams.set('type', model.jobType);
  return u.toString();
}

export function playgroundOrigin(): string {
  try {
    const base = rawPlaygroundBase();
    if (base.startsWith('/')) {
      if (typeof window !== 'undefined') return window.location.origin;
      return '';
    }
    return new URL(base).origin;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}

export function playgroundEmbedUrl(opts?: PlaygroundEmbedOptions): string {
  const u = resolvePlaygroundUrl(rawPlaygroundBase());
  u.searchParams.set('embed', '1');
  if (opts?.type) u.searchParams.set('type', opts.type);
  if (opts?.model) u.searchParams.set('model', opts.model);
  if (opts?.panel) u.searchParams.set('panel', opts.panel);
  if (opts?.parentOrigin) u.searchParams.set('parentOrigin', opts.parentOrigin);
  if (opts?.lang) u.searchParams.set('lang', opts.lang);
  return u.pathname + u.search;
}
