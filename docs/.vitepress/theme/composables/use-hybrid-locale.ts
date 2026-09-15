import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useData, useRoute } from 'vitepress';
import { isAppShellPath } from '../models/docs-nav';
import {
  localeFromVitepressLang,
  localePrefix,
  pickMsg,
  type PortalLocale,
} from '../models/portal-locale';
import {
  normalizePlaygroundPortalLocale,
  PLAYGROUND_LOCALE_EVENT,
  playgroundLocaleFromPath,
  syncPlaygroundStorageFromUrl,
} from '../models/playground-locale-bridge';

function currentPath(routePath: string): string {
  if (typeof window !== 'undefined') return window.location.pathname;
  return routePath;
}

export function useHybridLocale() {
  const { lang } = useData();
  const route = useRoute();
  const uiLocale = ref<PortalLocale>('en');

  const usesHybridLocale = computed(() => isAppShellPath(currentPath(route.path)));

  function syncUiLocaleFromUrl() {
    if (typeof window === 'undefined') return;
    uiLocale.value = playgroundLocaleFromPath(window.location.pathname);
    if (usesHybridLocale.value) {
      syncPlaygroundStorageFromUrl(window.location.pathname);
    }
  }

  function onLocaleEvent(event: Event) {
    const detail = (event as CustomEvent<{ locale?: PortalLocale }>).detail;
    if (!detail?.locale || !usesHybridLocale.value) return;
    uiLocale.value = normalizePlaygroundPortalLocale(detail.locale);
  }

  onMounted(() => {
    syncUiLocaleFromUrl();
    window.addEventListener(PLAYGROUND_LOCALE_EVENT, onLocaleEvent);
  });

  onUnmounted(() => {
    window.removeEventListener(PLAYGROUND_LOCALE_EVENT, onLocaleEvent);
  });

  const locale = computed((): PortalLocale => {
    if (usesHybridLocale.value) return uiLocale.value;
    return localeFromVitepressLang(lang.value);
  });

  const isVi = computed(() => locale.value === 'vi');
  const isTh = computed(() => locale.value === 'th');
  const isEn = computed(() => locale.value === 'en');
  const prefix = computed(() => localePrefix(locale.value));

  function t(en: string, vi: string, th?: string): string {
    return pickMsg(locale.value, en, vi, th);
  }

  return { isVi, isTh, isEn, locale, prefix, t, usesHybridLocale, syncUiLocaleFromUrl };
}
