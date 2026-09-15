/** Portal / docs locale — site-owned i18n (Gommo upstream may not localize TH). */
export type SiteLocale = 'en' | 'vi' | 'th';

/** Gommo form `language` for payment / credit_plans (lowercase). */
export type GommoFormLanguage = 'en' | 'vi';

/** Gommo usage-history logs use uppercase language codes. */
export type GommoLogsLanguage = 'EN' | 'VI';

export function normalizeSiteLocale(raw: string | undefined | null): SiteLocale {
  const v = String(raw || '').toLowerCase();
  if (v === 'vi' || v === 'vi-vn' || v.startsWith('vi')) return 'vi';
  if (v === 'th' || v === 'th-th' || v.startsWith('th')) return 'th';
  return 'en';
}

/** Catalog query ?lang= — vi = upstream default (no cache merge). */
export function normalizeCatalogLang(raw: string | undefined | null): SiteLocale | undefined {
  const v = String(raw || '').toLowerCase();
  if (!v || v === 'vi') return undefined;
  if (v === 'en' || v === 'th') return v;
  return undefined;
}

/**
 * Gommo does not return Thai for language=th (verified 2026-03).
 * Thai portal uses English upstream messages; UI strings are translated on-site.
 */
export function gommoFormLanguage(_locale?: SiteLocale): GommoFormLanguage {
  return 'en';
}

export function gommoUsageStatsLanguage(locale?: SiteLocale): string {
  if (locale === 'vi') return 'vi';
  return 'en';
}

export function gommoUsageLogsLanguage(locale?: SiteLocale): GommoLogsLanguage {
  if (locale === 'vi') return 'VI';
  return 'EN';
}

export function gommoChatCatalogLanguage(locale?: SiteLocale): 'VI' | 'EN' {
  if (locale === 'vi') return 'VI';
  return 'EN';
}
