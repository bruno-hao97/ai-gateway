import type { PortalLocale } from './portal-locale';

/** Gommo usage-history stats `language` form field. */
export function portalUsageStatsLanguage(locale: PortalLocale): 'vi' | 'en' {
  return locale === 'vi' ? 'vi' : 'en';
}

/** Gommo usage-history logs `language` (uppercase). Thai site uses EN upstream. */
export function portalUsageLogsLanguage(locale: PortalLocale): 'VI' | 'EN' {
  return locale === 'vi' ? 'VI' : 'EN';
}
