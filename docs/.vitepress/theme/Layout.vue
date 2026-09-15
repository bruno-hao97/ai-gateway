<script setup lang="ts">

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import DefaultTheme from 'vitepress/theme';

import { useData, useRoute } from 'vitepress';
import { clearAuth, getStoredToken } from './models/auth-api';

import {
  PLAYGROUND_LOCALE_EVENT,
  playgroundLocaleFromPath,
  LOCALE_MENU_LABEL_SET,
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

import {
  localeFromVitepressLang,
  localePrefix,
  pickMsg,
  type PortalLocale,
} from './models/portal-locale';

import SiteFooter from './components/SiteFooter.vue';



const { Layout } = DefaultTheme;

const { lang } = useData();

const route = useRoute();



const signedIn = ref(false);

const subNavEl = ref<HTMLElement | null>(null);



const playgroundImmersive = computed(() => isPlaygroundImmersivePath(route.path));

const hybridNavLocale = ref<PortalLocale | null>(null);

const navLocale = computed((): PortalLocale => {
  if (hybridNavLocale.value) return hybridNavLocale.value;
  return localeFromVitepressLang(lang.value);
});

const prefix = computed(() => localePrefix(navLocale.value));

function navMsg(en: string, vi: string, th?: string): string {
  return pickMsg(navLocale.value, en, vi, th);
}



const showSubNav = computed(() => showDocsSubNav(route.path));

const appShell = computed(() => isAppShellPath(route.path));

const chatImmersive = computed(() => isChatImmersivePath(route.path));

const hideSiteFooter = computed(() => chatImmersive.value || playgroundImmersive.value);



const docsSubNav = computed(() => {

  const p = prefix.value;

  const zone = getDocsZone(route.path);

  return [
    {
      id: 'guide' as const,
      label: navMsg('Docs', 'Docs', 'เอกสาร'),
      href: `${p}/quickstart`,
    },
    {
      id: 'reference' as const,
      label: navMsg('API Reference', 'API Reference', 'อ้างอิง API'),
      href: `${p}/reference/openapi`,
    },
    {
      id: 'sdk' as const,
      label: navMsg('Client SDKs', 'Client SDKs', 'SDK ไคลเอนต์'),
      href: `${p}/sdk/`,
    },
    {
      id: 'cookbook' as const,
      label: navMsg('Cookbook', 'Cookbook', 'คู่มือปฏิบัติ'),
      href: `${p}/cookbook/`,
    },
  ].map((item) => ({ ...item, active: zone === item.id }));

});



function refreshSignedIn() {

  signedIn.value = Boolean(getStoredToken());

}



const HYBRID_VP_NAV = [
  { en: 'Home', vi: 'Trang chủ', th: 'หน้าแรก', hrefEn: '/app/', hrefVi: '/vi/app/', hrefTh: '/th/app/' },
  { en: 'Models', vi: 'Models', th: 'โมเดล', hrefEn: '/models/', hrefVi: '/vi/models/', hrefTh: '/th/models/' },
  { en: 'Playground', vi: 'Playground', th: 'สนามทดลอง', hrefEn: '/app/playground/', hrefVi: '/vi/app/playground/', hrefTh: '/th/app/playground/' },
  { en: 'Chat', vi: 'Chat', th: 'แชท', hrefEn: '/app/chat/', hrefVi: '/vi/app/chat/', hrefTh: '/th/app/chat/' },
  { en: 'Docs', vi: 'Docs', th: 'เอกสาร', hrefEn: '/quickstart', hrefVi: '/vi/quickstart', hrefTh: '/th/quickstart' },
];

function hybridNavHref(item: (typeof HYBRID_VP_NAV)[number]): string {
  const loc = navLocale.value;
  if (loc === 'vi') return item.hrefVi;
  if (loc === 'th') return item.hrefTh;
  return item.hrefEn;
}

function patchHybridVpNavMenu() {

  if (typeof document === 'undefined' || !appShell.value) return;

  const origin = window.location.origin;

  for (const link of document.querySelectorAll('.VPNavBarMenu a')) {

    if (!(link instanceof HTMLAnchorElement)) continue;

    const label = link.textContent?.trim();

    if (!label) continue;

    for (const item of HYBRID_VP_NAV) {

      if (label !== item.en && label !== item.vi && label !== item.th) continue;

      link.textContent = navMsg(item.en, item.vi, item.th);

      link.href = `${origin}${hybridNavHref(item)}`;

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

  const homeLabels = [navMsg('Home', 'Trang chủ', 'หน้าแรก')];

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

  const docsLabels = new Set([
    'Docs',
    'Tài liệu',
    navMsg('Docs', 'Docs', 'เอกสาร'),
  ]);

  for (const link of document.querySelectorAll('.VPNavBarMenu a')) {

    const label = link.textContent?.trim();

    if (label && docsLabels.has(label)) {

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

    return Boolean(label && LOCALE_MENU_LABEL_SET.has(label));

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

  const host = localeMenuLinkHost(root);

  cleanupHybridLocaleMenuLinks(root);

  for (const link of localeMenuLinks(root)) {

    removeLocaleMenuLink(link);

  }

  for (const item of items) {

    createHybridLocaleMenuLink(host, item);

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

    document.documentElement.lang =
      navLocale.value === 'vi' ? 'vi' : navLocale.value === 'th' ? 'th' : 'en';

  }

}



function syncHybridNavFromUrl() {

  if (!appShell.value) {

    hybridNavLocale.value = null;

    return;

  }

  if (typeof window === 'undefined') {

    hybridNavLocale.value = localeFromVitepressLang(lang.value);

    return;

  }

  const locale = playgroundLocaleFromPath(window.location.pathname);

  hybridNavLocale.value = locale;

  syncPlaygroundStorageFromUrl(window.location.pathname);

}



function onPlaygroundLocaleEvent(event: Event) {

  const detail = (event as CustomEvent<{ locale?: PlaygroundPortalLocale }>).detail;

  if (!detail?.locale) return;

  hybridNavLocale.value = detail.locale;

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

        :aria-label="navMsg('Documentation', 'Tài liệu', 'เอกสาร')"

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

            {{ navMsg('Sign out', 'Đăng xuất', 'ออกจากระบบ') }}

          </button>

        </template>

        <template v-else>

          <a :href="`${prefix}/login/`" class="gw-nav-link">
            {{ navMsg('Sign in', 'Đăng nhập', 'เข้าสู่ระบบ') }}
          </a>

          <a :href="`${prefix}/signup/`" class="gw-nav-btn gw-nav-btn-primary">
            {{ navMsg('Sign Up', 'Đăng ký', 'สมัครสมาชิก') }}
          </a>

        </template>

      </div>

    </template>

  </Layout>

</template>

