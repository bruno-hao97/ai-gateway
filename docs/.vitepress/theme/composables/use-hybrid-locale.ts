import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useData, useRoute } from 'vitepress';
import { isAppShellPath } from '../models/docs-nav';
import {
  normalizePlaygroundPortalLocale,
  PLAYGROUND_LOCALE_EVENT,
  playgroundLocaleFromPath,
  syncPlaygroundStorageFromUrl,
  type PlaygroundPortalLocale,
} from '../models/playground-locale-bridge';

function currentPath(routePath: string): string {
  if (typeof window !== 'undefined') return window.location.pathname;
  return routePath;
}

export function useHybridLocale() {
  const { lang } = useData();
  const route = useRoute();
  const uiLocale = ref<PlaygroundPortalLocale>('en');

  const usesHybridLocale = computed(() => isAppShellPath(currentPath(route.path)));

  function syncUiLocaleFromUrl() {
    if (typeof window === 'undefined') return;
    uiLocale.value = playgroundLocaleFromPath(window.location.pathname);
    if (usesHybridLocale.value) {
      syncPlaygroundStorageFromUrl(window.location.pathname);
    }
  }

  function onLocaleEvent(event: Event) {
    const detail = (event as CustomEvent<{ locale?: PlaygroundPortalLocale }>).detail;
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

  const isVi = computed(() => {
    if (usesHybridLocale.value) return uiLocale.value === 'vi';
    return lang.value === 'vi-VN';
  });

  const prefix = computed((): '' | '/vi' => (isVi.value ? '/vi' : ''));
  const locale = computed(() => uiLocale.value);

  return { isVi, prefix, locale, usesHybridLocale, syncUiLocaleFromUrl };
}
