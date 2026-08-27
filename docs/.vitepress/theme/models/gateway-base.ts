/** Dev: VitePress proxy → :3001. Prod: set VITE_GATEWAY_URL at build. */
export function apiBase(): string {
  const env = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'https://api.yourdomain.com';
}

export function playgroundUrl(): string {
  const base = apiBase();
  if (base) return `${base}/portal/playground.html`;
  if (import.meta.env.DEV) return 'http://localhost:3001/portal/playground.html';
  return '/portal/playground.html';
}
