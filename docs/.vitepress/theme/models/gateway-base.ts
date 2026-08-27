/** Dev: VitePress proxy → :3001. Prod: set VITE_GATEWAY_URL at build. */
export function apiBase(): string {
  const env = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'https://api.yourdomain.com';
}

export function playgroundUrl(model?: { slug?: string; jobType?: string }): string {
  const base = rawPlaygroundBase();
  if (!model?.slug) return base;
  const u = new URL(base);
  u.searchParams.set('model', model.slug);
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
