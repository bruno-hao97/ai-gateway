import { computed, type ComputedRef } from 'vue';
import { pickMsg, type PortalLocale } from '../models/portal-locale';

function resolveLocale(locale: ComputedRef<PortalLocale> | PortalLocale): ComputedRef<PortalLocale> {
  if (typeof locale === 'string') {
    return computed(() => locale);
  }
  return locale;
}

/** Portal UI strings: en | vi | th (th falls back to en when omitted). */
export function usePortalCopy(locale: ComputedRef<PortalLocale> | PortalLocale) {
  const loc = resolveLocale(locale);
  const isVi = computed(() => loc.value === 'vi');
  const isTh = computed(() => loc.value === 'th');
  const isEn = computed(() => loc.value === 'en');

  function m(en: string, vi: string, th?: string): string {
    return pickMsg(loc.value, en, vi, th);
  }

  return { locale: loc, isVi, isTh, isEn, m };
}
