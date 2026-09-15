import { playgroundOrigin } from './gateway-base';
import { isAppShellPath } from './docs-nav';
import {
  localizedPath,
  localeFromPath,
  localePrefix,
  normalizePortalLocale,
  stripLocaleFromPath,
  type PortalLocale,
} from './portal-locale';

export type PlaygroundPortalLocale = PortalLocale;

const EMBED_STORE_KEY = '__gwApiPlaygroundEmbed';

export function normalizePlaygroundPortalLocale(raw: string): PlaygroundPortalLocale {
  return normalizePortalLocale(raw);
}

/** Playground UI locale from browser path (/vi/ or /th/ prefix). */
export function playgroundLocaleFromPath(path?: string): PlaygroundPortalLocale {
  const p = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  return localeFromPath(p);
}

/** Keep portal_ui_lang aligned with the playground URL (URL is source of truth). */
export function syncPlaygroundStorageFromUrl(path?: string): PlaygroundPortalLocale {
  const locale = playgroundLocaleFromPath(path);
  try {
    localStorage.setItem('portal_ui_lang', locale);
  } catch {
    /* ignore */
  }
  return locale;
}

/**
 * Locale target when clicking a VitePress locale link on the same playground path.
 * Returns the target locale even when it matches the current URL (no-op switch).
 */
export function resolvePlaygroundLocaleNavTarget(
  linkHref: string,
  currentPath: string,
): PlaygroundPortalLocale | null {
  try {
    const targetPath = new URL(linkHref, window.location.origin).pathname;
    const target = stripLocaleFromPath(targetPath);
    const current = stripLocaleFromPath(currentPath);
    if (target.path !== current.path) return null;
    return target.locale;
  } catch {
    return null;
  }
}

/** Same logical page in another docs locale (playground hybrid switch). */
export function resolvePlaygroundLocaleSwitch(
  linkHref: string,
  currentPath: string,
): PlaygroundPortalLocale | null {
  const targetLocale = resolvePlaygroundLocaleNavTarget(linkHref, currentPath);
  if (!targetLocale) return null;
  const currentLocale = playgroundLocaleFromPath(currentPath);
  if (targetLocale === currentLocale) return null;
  return targetLocale;
}

export function localizedPlaygroundPath(path: string, locale: PlaygroundPortalLocale): string {
  const { path: bare } = stripLocaleFromPath(path);
  return localizedPath(bare, locale);
}

export interface PlaygroundLocaleMenuItem {
  locale: PlaygroundPortalLocale;
  label: string;
  href: string;
  active: boolean;
}

export const LOCALE_MENU_LABELS: Record<PlaygroundPortalLocale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  th: 'ไทย',
};

export const LOCALE_MENU_LABEL_SET = new Set(Object.values(LOCALE_MENU_LABELS));

/** Fixed locale entries for hybrid playground locale menu (URL + query preserved). */
export function playgroundLocaleMenuItems(): PlaygroundLocaleMenuItem[] {
  const suffix =
    typeof window !== 'undefined' ? window.location.search + window.location.hash : '';
  const path =
    typeof window !== 'undefined' ? window.location.pathname : '/app/playground';
  const current = playgroundLocaleFromPath(path);
  const { path: bare } = stripLocaleFromPath(path);
  return (['en', 'vi', 'th'] as const).map((locale) => ({
    locale,
    label: LOCALE_MENU_LABELS[locale],
    href: localizedPath(bare, locale) + suffix,
    active: locale === current,
  }));
}

function normalizeNavPath(path: string): string {
  return path.split('?')[0]?.split('#')[0] ?? path;
}

/** Same app-shell page, locale prefix may differ (/app ↔ /vi/app ↔ /th/app). */
export function isHybridLocaleNav(fromPath: string, toHref: string): boolean {
  try {
    const fromBare = normalizeNavPath(fromPath);
    const toBare = normalizeNavPath(toHref);
    const toPathname = new URL(toBare, window.location.origin).pathname;
    if (!isAppShellPath(fromBare) || !isAppShellPath(toPathname)) return false;
    const target = stripLocaleFromPath(toPathname);
    const current = stripLocaleFromPath(fromBare);
    return target.path === current.path;
  } catch {
    return false;
  }
}

/** @deprecated Use isHybridLocaleNav */
export function isPlaygroundHybridLocaleNav(fromPath: string, toHref: string): boolean {
  return isHybridLocaleNav(fromPath, toHref);
}

export const PLAYGROUND_LOCALE_EVENT = 'gw-playground-locale';

/** Switch playground locale without VitePress navigation (iframe postMessage + URL replaceState). */
export function applyPlaygroundHybridLocale(locale: PlaygroundPortalLocale) {
  postPlaygroundLocale(locale);
  try {
    const { path: bare } = stripLocaleFromPath(window.location.pathname);
    const path = localizedPath(bare, locale);
    const url = new URL(path, window.location.origin);
    url.search = window.location.search;
    url.hash = window.location.hash;
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(PLAYGROUND_LOCALE_EVENT, { detail: { locale } }));
}

/**
 * Intercept VitePress locale navigation on playground — swap iframe locale only, no route change.
 * @param fromPath VitePress route path (not URL bar — may differ after replaceState).
 * @returns true when navigation should be cancelled
 */
export function tryHybridLocaleSwitch(to: string, fromPath?: string): boolean {
  if (typeof window === 'undefined') return false;

  const from = fromPath ?? window.location.pathname;
  if (!isHybridLocaleNav(from, to)) return false;

  const toBare = normalizeNavPath(to);
  const targetLocale = resolvePlaygroundLocaleNavTarget(toBare, from);
  if (!targetLocale) return false;

  const currentLocale = playgroundLocaleFromPath(window.location.pathname);
  if (targetLocale === currentLocale) return false;

  applyPlaygroundHybridLocale(targetLocale);
  return true;
}

/** @deprecated Use tryHybridLocaleSwitch */
export function tryPlaygroundHybridLocaleSwitch(to: string, fromPath?: string): boolean {
  return tryHybridLocaleSwitch(to, fromPath);
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
