<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import DefaultTheme from 'vitepress/theme';
import { useData, useRoute } from 'vitepress';
import { clearAuth, getStoredToken } from './models/auth-api';
import { getDocsZone, isChatImmersivePath, showDocsSubNav } from './models/docs-nav';

const { Layout } = DefaultTheme;
const { lang } = useData();
const route = useRoute();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));

const signedIn = ref(false);
const subNavEl = ref<HTMLElement | null>(null);

const showSubNav = computed(() => showDocsSubNav(route.path));
const chatImmersive = computed(() => isChatImmersivePath(route.path));

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

function patchNavTitleLink() {
  if (typeof document === 'undefined') return;
  const el = document.querySelector('.VPNavBarTitle a.title');
  if (!(el instanceof HTMLAnchorElement)) return;
  el.href = signedIn.value ? `${prefix.value}/app/` : `${prefix.value}/` || '/';
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
  document.body.classList.toggle('gw-chat-immersive', chatImmersive.value);
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

function syncLayoutChrome() {
  patchNavTitleLink();
  patchDocsNavActive();
  syncSubNavBodyClass();
  if (showSubNav.value) placeSubNavAfterNav();
}

onMounted(() => {
  refreshSignedIn();
  nextTick(syncLayoutChrome);
});

watch(showSubNav, () => {
  nextTick(syncLayoutChrome);
});

watch(
  () => route.path,
  () => {
    refreshSignedIn();
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

    <template #nav-bar-content-after>
      <div class="gw-nav-auth">
        <template v-if="signedIn">
          <button type="button" class="gw-nav-btn gw-nav-btn-ghost" @click="signOut">
            {{ isVi ? 'Đăng xuất' : 'Sign out' }}
          </button>
        </template>
        <template v-else>
          <a :href="`${prefix}/login/`" class="gw-nav-link">{{
            isVi ? 'Đăng nhập' : 'Sign in'
          }}</a>
          <a :href="`${prefix}/signup/`" class="gw-nav-btn gw-nav-btn-primary">{{
            isVi ? 'Đăng ký' : 'Sign Up'
          }}</a>
        </template>
      </div>
    </template>
  </Layout>
</template>
