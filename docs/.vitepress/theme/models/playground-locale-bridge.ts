import { playgroundOrigin } from './gateway-base';
import { stripLocale } from './docs-nav';

export type PlaygroundPortalLocale = 'en' | 'vi';

const EMBED_STORE_KEY = '__gwApiPlaygroundEmbed';

export function normalizePlaygroundPortalLocale(raw: string): PlaygroundPortalLocale {
  const v = String(raw || '').toLowerCase();
  if (v === 'vi' || v === 'vi-vn' || v.startsWith('vi')) return 'vi';
  return 'en';
}

/** Same logical page in the other docs locale (playground hybrid switch). */
export function resolvePlaygroundLocaleSwitch(
  linkHref: string,
  currentPath: string,
): PlaygroundPortalLocale | null {
  try {
    const target = stripLocale(new URL(linkHref, window.location.origin).pathname);
    const current = stripLocale(currentPath);
    if (target.path !== current.path) return null;
    if (target.locale === current.locale) return null;
    return target.locale;
  } catch {
    return null;
  }
}

export function localizedPlaygroundPath(path: string, locale: PlaygroundPortalLocale): string {
  const { path: bare } = stripLocale(path);
  if (locale === 'vi') return bare === '/' ? '/vi' : `/vi${bare}`;
  return bare;
}

export function postPlaygroundLocale(locale: PlaygroundPortalLocale) {
  try {
    localStorage.setItem('portal_ui_lang', locale);
  } catch {
    /* ignore */
  }
  const store = (window as unknown as Record<string, { iframe?: HTMLIFrameElement } | undefined>)[
    EMBED_STORE_KEY
  ];
  const frame = store?.iframe?.contentWindow;
  const targetOrigin = playgroundOrigin();
  if (!frame || !targetOrigin) return;
  frame.postMessage({ type: 'ai-gateway-locale', locale }, targetOrigin);
}
