export type PortalLocale = 'en' | 'vi' | 'th';

export type LocalePrefix = '' | '/vi' | '/th';

export function normalizePortalLocale(raw: string | undefined | null): PortalLocale {
  const v = String(raw || '').toLowerCase();
  if (v === 'vi' || v === 'vi-vn' || v.startsWith('vi')) return 'vi';
  if (v === 'th' || v === 'th-th' || v.startsWith('th')) return 'th';
  return 'en';
}

export function localeFromVitepressLang(lang: string): PortalLocale {
  return normalizePortalLocale(lang);
}

export function localePrefix(locale: PortalLocale): LocalePrefix {
  if (locale === 'vi') return '/vi';
  if (locale === 'th') return '/th';
  return '';
}

export function localeFromPath(path: string): PortalLocale {
  const p = path.split('?')[0]?.split('#')[0] ?? '/';
  if (p === '/vi' || p.startsWith('/vi/')) return 'vi';
  if (p === '/th' || p.startsWith('/th/')) return 'th';
  return 'en';
}

export function stripLocaleFromPath(path: string): { locale: PortalLocale; path: string } {
  const normalized = path.split('?')[0]?.split('#')[0] ?? '/';
  let bare = normalized;
  if (bare.endsWith('/') && bare.length > 1) bare = bare.slice(0, -1);
  if (bare.endsWith('/index')) bare = bare.slice(0, -6) || '/';

  if (bare === '/vi' || bare.startsWith('/vi/')) {
    const rest = bare.slice(3) || '/';
    return { locale: 'vi', path: rest === '' ? '/' : rest };
  }
  if (bare === '/th' || bare.startsWith('/th/')) {
    const rest = bare.slice(3) || '/';
    return { locale: 'th', path: rest === '' ? '/' : rest };
  }
  return { locale: 'en', path: bare || '/' };
}

export function localizedPath(barePath: string, locale: PortalLocale): string {
  const pre = localePrefix(locale);
  const p = barePath === '' ? '/' : barePath.startsWith('/') ? barePath : `/${barePath}`;
  if (!pre) return p;
  return p === '/' ? pre : `${pre}${p}`;
}

/** UI copy: Thai falls back to English when `th` omitted. */
export function pickMsg(locale: PortalLocale, en: string, vi: string, th?: string): string {
  if (locale === 'vi') return vi;
  if (locale === 'th') return th ?? en;
  return en;
}

/** Resolve label locale; boolean legacy: `true` → vi, `false` → en. */
export function resolveLabelLocale(localeOrVi: PortalLocale | boolean): PortalLocale {
  if (typeof localeOrVi === 'boolean') return localeOrVi ? 'vi' : 'en';
  return localeOrVi;
}
