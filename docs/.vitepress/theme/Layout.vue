<script setup lang="ts">

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import DefaultTheme from 'vitepress/theme';

import { useData, useRoute } from 'vitepress';
import { clearAuth, getStoredToken } from './models/auth-api';

import {
  PLAYGROUND_LOCALE_EVENT,
  playgroundLocaleFromPath,
  playgroundLocaleMenuItems,
  syncPlaygroundStorageFromUrl,
  tryHybridLocaleSwitch,
  type PlaygroundLocaleMenuItem,
  type PlaygroundPortalLocale,
} from './models/playground-locale-bridge';

import {

  getDocsZone,

  isAppShellPath,

  isChatImmersivePath,

  isPlaygroundImmersivePath,

  showDocsSubNav,

} from './models/docs-nav';

import SiteFooter from './components/SiteFooter.vue';



const { Layout } = DefaultTheme;

const { lang } = useData();

const route = useRoute();



const signedIn = ref(false);

const subNavEl = ref<HTMLElement | null>(null);



const playgroundImmersive = computed(() => isPlaygroundImmersivePath(route.path));

const isVi = computed(() => lang.value === 'vi-VN');

const hybridNavVi = ref<boolean | null>(null);

const navIsVi = computed(() => hybridNavVi.value ?? isVi.value);

const prefix = computed(() => (navIsVi.value ? '/vi' : ''));



const showSubNav = computed(() => showDocsSubNav(route.path));

const appShell = computed(() => isAppShellPath(route.path));

const chatImmersive = computed(() => isChatImmersivePath(route.path));

const hideSiteFooter = computed(() => chatImmersive.value || playgroundImmersive.value);



const docsSubNav = computed(() => {

  const p = prefix.value;

  const zone = getDocsZone(route.path);

  return [

    { id: 'guide' as const, label: 'Docs', href: `${p}/quickstart` },

    { id: 'reference' as const, label: 'API Reference', href: `${p}/reference/openapi` },

    { id: 'sdk' as const, label: 'Client SDKs', href: `${p}/sdk/` },

    { id: 'cookbook' as const, label: 'Cookbook', href: `${p}/cookbook/` },

  ].map((item) => ({ ...item, active: zone === item.id }));

});



function refreshSignedIn() {

  signedIn.value = Boolean(getStoredToken());

}



const HYBRID_VP_NAV = [
  { en: 'Home', vi: 'Trang chủ', hrefEn: '/app/', hrefVi: '/vi/app/' },
  { en: 'Models', vi: 'Models', hrefEn: '/models/', hrefVi: '/vi/models/' },
  { en: 'Playground', vi: 'Playground', hrefEn: '/app/playground/', hrefVi: '/vi/app/playground/' },
  { en: 'Chat', vi: 'Chat', hrefEn: '/app/chat/', hrefVi: '/vi/app/chat/' },
  { en: 'Docs', vi: 'Docs', hrefEn: '/quickstart', hrefVi: '/vi/quickstart' },
];

function patchHybridVpNavMenu() {

  if (typeof document === 'undefined' || !appShell.value) return;

  const vi = navIsVi.value;

  const origin = window.location.origin;

  for (const link of document.querySelectorAll('.VPNavBarMenu a')) {

    if (!(link instanceof HTMLAnchorElement)) continue;

    const label = link.textContent?.trim();

    if (!label) continue;

    for (const item of HYBRID_VP_NAV) {

      if (label !== item.en && label !== item.vi) continue;

      link.textContent = vi ? item.vi : item.en;

      link.href = `${origin}${vi ? item.hrefVi : item.hrefEn}`;

      break;

    }

  }

}



function patchNavTitleLink() {

  if (typeof document === 'undefined') return;

  const el = document.querySelector('.VPNavBarTitle a.title');

  if (!(el instanceof HTMLAnchorElement)) return;

  el.href = `${prefix.value}/` || '/';

}



function patchNavHomeLink() {

  if (typeof document === 'undefined') return;

  const homeLabels = navIsVi.value ? ['Trang chủ'] : ['Home'];

  for (const link of document.querySelectorAll('.VPNavBarMenu a')) {

    const label = link.textContent?.trim();

    if (!label || !homeLabels.includes(label)) continue;

    const item = link.parentElement;

    if (item instanceof HTMLElement) {

      item.style.display = signedIn.value ? '' : 'none';

    }

    break;

  }

}



function patchDocsNavActive() {

  if (typeof document === 'undefined') return;

  const inDocs = showSubNav.value;

  for (const link of document.querySelectorAll('.VPNavBarMenu a')) {

    if (link.textContent?.trim() === 'Docs') {

      link.classList.toggle('active', inDocs);

    }

  }

}



function syncSubNavBodyClass() {

  if (typeof document === 'undefined') return;

  document.body.classList.toggle('gw-has-docs-subnav', showSubNav.value);

  document.body.classList.toggle('gw-app-shell', appShell.value);

  document.body.classList.toggle('gw-chat-immersive', chatImmersive.value);

  document.body.classList.toggle('gw-api-playground-immersive', playgroundImmersive.value);

}



function placeSubNavAfterNav() {

  nextTick(() => {

    const sub = subNavEl.value;

    const vpNav = document.querySelector('.VPNav');

    if (!sub || !vpNav) return;

    if (sub.previousElementSibling !== vpNav) {

      vpNav.insertAdjacentElement('afterend', sub);

    }

  });

}



function applyPlaygroundLocaleMenuItem(link: HTMLAnchorElement, item: PlaygroundLocaleMenuItem) {

  link.textContent = item.label;

  link.href = item.href;

  link.classList.toggle('active', item.active);

  if (item.active) link.setAttribute('aria-current', 'page');

  else link.removeAttribute('aria-current');

}



function localeMenuLinkHost(root: Element): Element {

  const menu = root.classList.contains('VPMenu') ? root : root.querySelector('.VPMenu');

  const ul = menu?.querySelector(':scope > ul');

  if (ul) return ul;

  if (menu) return menu;

  return root;

}



function localeMenuLinks(root: Element): HTMLAnchorElement[] {

  return [...root.querySelectorAll('a.link')].filter((link): link is HTMLAnchorElement => {

    if (!(link instanceof HTMLAnchorElement)) return false;

    const label = link.textContent?.trim();

    return label === 'English' || label === 'Tiếng Việt';

  });

}



function removeLocaleMenuLink(link: HTMLAnchorElement) {

  link.closest('li.VPMenuLink')?.remove() ?? link.remove();

}



function createHybridLocaleMenuLink(host: Element, item: PlaygroundLocaleMenuItem): HTMLAnchorElement {

  const li = document.createElement('li');

  li.className = 'VPMenuLink';

  li.dataset.gwHybridLocale = item.locale;

  const link = document.createElement('a');

  link.className = 'link';

  link.dataset.gwHybridLocale = item.locale;

  li.appendChild(link);

  host.appendChild(li);

  applyPlaygroundLocaleMenuItem(link, item);

  return link;

}



function syncPlaygroundLocaleLinksInRoot(root: Element, items: PlaygroundLocaleMenuItem[]) {

  const existing = localeMenuLinks(root);

  const host = localeMenuLinkHost(root);

  for (let i = 0; i < items.length; i++) {

    const item = items[i]!;

    const link = existing[i];

    if (link) {

      link.dataset.gwHybridLocale = item.locale;

      link.closest('li.VPMenuLink')?.setAttribute('data-gw-hybrid-locale', item.locale);

      applyPlaygroundLocaleMenuItem(link, item);

      continue;

    }

    createHybridLocaleMenuLink(host, item);

  }

  for (let i = items.length; i < existing.length; i++) {

    removeLocaleMenuLink(existing[i]!);

  }

}



function cleanupHybridLocaleMenuLinks(root: Element) {

  for (const el of [...root.querySelectorAll('[data-gw-hybrid-locale]')]) {

    if (el instanceof HTMLAnchorElement) removeLocaleMenuLink(el);

    else el.remove();

  }

}



function dedupeLocaleMenuLinks(root: Element) {

  const seen = new Set<string>();

  for (const link of localeMenuLinks(root)) {

    const label = link.textContent?.trim() ?? '';

    if (seen.has(label)) removeLocaleMenuLink(link);

    else seen.add(label);

  }

}



function localeMenuRoots(): Element[] {

  return [

    document.querySelector('.VPNavBarTranslations .VPMenu'),

    document.querySelector('.VPNavBarExtra .group.translations'),

    document.querySelector('.VPNavScreenTranslations'),

  ].filter((el): el is Element => el instanceof Element);

}



function patchHybridVpTranslationsMenu() {

  if (typeof document === 'undefined') return;

  const roots = localeMenuRoots();

  if (appShell.value) {

    const items = playgroundLocaleMenuItems();

    const current = items.find((item) => item.active) ?? items[0]!;

    const triggerTitle = document.querySelector('.VPNavBarTranslations button .title');

    if (triggerTitle) triggerTitle.textContent = current.label;

    for (const root of roots) syncPlaygroundLocaleLinksInRoot(root, items);

    return;

  }

  for (const root of roots) {

    cleanupHybridLocaleMenuLinks(root);

    dedupeLocaleMenuLinks(root);

  }

}



function syncLayoutChrome() {

  patchNavTitleLink();

  patchHybridVpNavMenu();

  patchHybridVpTranslationsMenu();

  patchNavHomeLink();

  patchDocsNavActive();

  syncSubNavBodyClass();

  if (showSubNav.value) placeSubNavAfterNav();

  if (typeof document !== 'undefined') {

    document.documentElement.lang = navIsVi.value ? 'vi' : 'en';

  }

}



function syncHybridNavFromUrl() {

  if (!appShell.value) {

    hybridNavVi.value = null;

    return;

  }

  if (typeof window === 'undefined') {

    hybridNavVi.value = isVi.value;

    return;

  }

  const locale = playgroundLocaleFromPath(window.location.pathname);

  hybridNavVi.value = locale === 'vi';

  syncPlaygroundStorageFromUrl(window.location.pathname);

}



function onPlaygroundLocaleEvent(event: Event) {

  const detail = (event as CustomEvent<{ locale?: PlaygroundPortalLocale }>).detail;

  if (!detail?.locale) return;

  hybridNavVi.value = detail.locale === 'vi';

  nextTick(syncLayoutChrome);

}



function onHybridLangClick(event: MouseEvent) {

  if (!appShell.value) return;

  const anchor = (event.target as Element | null)?.closest?.('a');

  if (!(anchor instanceof HTMLAnchorElement)) return;

  const to = `${anchor.pathname}${anchor.search}${anchor.hash}`;

  if (!tryHybridLocaleSwitch(to, route.path)) return;

  event.preventDefault();

  event.stopPropagation();

  nextTick(syncLayoutChrome);

}



onMounted(() => {

  refreshSignedIn();

  syncHybridNavFromUrl();

  document.addEventListener('click', onHybridLangClick, true);

  window.addEventListener(PLAYGROUND_LOCALE_EVENT, onPlaygroundLocaleEvent);

  nextTick(syncLayoutChrome);

});



onUnmounted(() => {

  document.removeEventListener('click', onHybridLangClick, true);

  window.removeEventListener(PLAYGROUND_LOCALE_EVENT, onPlaygroundLocaleEvent);

});



watch(showSubNav, () => {

  nextTick(syncLayoutChrome);

});



watch(

  () => route.path,

  () => {

    refreshSignedIn();

    syncHybridNavFromUrl();

    nextTick(syncLayoutChrome);

  },

);



function signOut() {

  clearAuth();

  signedIn.value = false;

  window.location.href = `${prefix.value}/` || '/';

}

</script>



<template>

  <Layout>

    <template #layout-top>

      <nav

        v-if="showSubNav"

        ref="subNavEl"

        class="gw-docs-subnav"

        aria-label="Documentation"

      >

        <div class="gw-docs-subnav-inner">

          <a

            v-for="item in docsSubNav"

            :key="item.id"

            :href="item.href"

            class="gw-docs-subnav-link"

            :class="{ active: item.active }"

          >

            {{ item.label }}

          </a>

        </div>

      </nav>

    </template>



    <template #layout-bottom>

      <SiteFooter v-if="!hideSiteFooter" />

    </template>



    <template #nav-bar-content-after>

      <div class="gw-nav-auth">

        <template v-if="signedIn">

          <button type="button" class="gw-nav-btn gw-nav-btn-ghost" @click="signOut">

            {{ navIsVi ? 'Đăng xuất' : 'Sign out' }}

          </button>

        </template>

        <template v-else>

          <a :href="`${prefix}/login/`" class="gw-nav-link">
            {{ navIsVi ? 'Đăng nhập' : 'Sign in' }}
          </a>

          <a :href="`${prefix}/signup/`" class="gw-nav-btn gw-nav-btn-primary">
            {{ navIsVi ? 'Đăng ký' : 'Sign Up' }}
          </a>

        </template>

      </div>

    </template>

  </Layout>

</template>

