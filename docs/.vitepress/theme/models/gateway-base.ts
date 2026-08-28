/** Dev: VitePress proxy → :3001. Prod: set VITE_GATEWAY_URL at build. */
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

/** Full portal tab (topbar) — dev tool / open in new tab. */
export function playgroundUrl(model?: PlaygroundModelRef): string {
  const base = rawPlaygroundBase();
  if (!model?.slug && !model?.jobType) return base;
  const u = new URL(base);
  if (model.slug) u.searchParams.set('model', model.slug);
  if (model.jobType) u.searchParams.set('type', model.jobType);
  return u.toString();
}

function rawPlaygroundBase(): string {
  const base = apiBase();
  if (base) return `${base}/portal/playground.html`;
  if (import.meta.env.DEV) return 'http://localhost:3001/portal/playground.html';
  return '/portal/playground.html';
}

export function playgroundOrigin(): string {
  try {
    return new URL(rawPlaygroundBase()).origin;
  } catch {
    return '';
  }
}

export interface PlaygroundEmbedOptions {
  type?: string;
  model?: string;
  panel?: string;
}

export function playgroundEmbedUrl(opts?: PlaygroundEmbedOptions): string {
  const u = new URL(rawPlaygroundBase());
  u.searchParams.set('embed', '1');
  if (opts?.type) u.searchParams.set('type', opts.type);
  if (opts?.model) u.searchParams.set('model', opts.model);
  if (opts?.panel) u.searchParams.set('panel', opts.panel);
  return u.toString();
}
