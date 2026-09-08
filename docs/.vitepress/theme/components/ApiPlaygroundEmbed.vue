<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { getStoredDomain, getStoredToken } from '../models/auth-api';
import { playgroundEmbedUrl, playgroundOrigin } from '../models/gateway-base';
import type { PlaygroundPortalLocale } from '../models/playground-locale-bridge';
import {
  postPlaygroundLocale,
} from '../models/playground-locale-bridge';

const props = defineProps<{
  locale: PlaygroundPortalLocale;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const iframeReady = ref(false);
const showLoading = ref(true);
const hasToken = ref(false);

const EMBED_STORE_KEY = '__gwApiPlaygroundEmbed';
const HOLD_ID = 'gw-api-playground-embed-hold';

type EmbedStore = { iframe: HTMLIFrameElement; src: string };

function readEmbedQuery(): {
  type?: string;
  model?: string;
  panel?: string;
  worker?: string;
} {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  return {
    type: q.get('type') || undefined,
    model: q.get('model') || undefined,
    panel: q.get('panel') || undefined,
    worker: q.get('worker') || undefined,
  };
}

function syncParentPlaygroundUrl(opts: { worker?: string; model?: string }) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (opts.worker) url.searchParams.set('worker', opts.worker);
  else url.searchParams.delete('worker');
  url.searchParams.delete('type');
  url.searchParams.delete('panel');
  if (opts.model) url.searchParams.set('model', opts.model);
  else url.searchParams.delete('model');
  const next = url.pathname + url.search + url.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (next !== current) window.history.replaceState(null, '', next);
}

function onPlaygroundMessage(event: MessageEvent) {
  const targetOrigin = playgroundOrigin();
  if (!targetOrigin || event.origin !== targetOrigin) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'ai-gateway-playground-nav') {
    syncParentPlaygroundUrl({
      worker: typeof data.worker === 'string' ? data.worker : undefined,
      model: typeof data.model === 'string' ? data.model : undefined,
    });
  }
}

function embedSrcKey(src: string): string {
  try {
    const u = new URL(src, window.location.origin);
    u.searchParams.delete('lang');
    return u.pathname + u.search;
  } catch {
    return src;
  }
}

function buildEmbedSrc() {
  if (typeof window === 'undefined') return '';
  const q = readEmbedQuery();
  return playgroundEmbedUrl({
    parentOrigin: window.location.origin,
    lang: props.locale,
    ...q,
  });
}

function getEmbedStore(): EmbedStore | null {
  return (window as unknown as Record<string, EmbedStore | undefined>)[EMBED_STORE_KEY] ?? null;
}

function setEmbedStore(store: EmbedStore) {
  (window as unknown as Record<string, EmbedStore>)[EMBED_STORE_KEY] = store;
}

function parkIframe(iframe: HTMLIFrameElement) {
  let hold = document.getElementById(HOLD_ID);
  if (!hold) {
    hold = document.createElement('div');
    hold.id = HOLD_ID;
    hold.hidden = true;
    document.body.appendChild(hold);
  }
  hold.appendChild(iframe);
}

function refreshTokenState() {
  hasToken.value = Boolean(getStoredToken());
}

function postLocaleOnly() {
  postPlaygroundLocale(props.locale);
}

function postAuthToIframe() {
  const frame = iframeRef.value?.contentWindow;
  const targetOrigin = playgroundOrigin();
  if (!frame || !targetOrigin || !iframeReady.value) return;
  const token = getStoredToken();
  if (!token) return;
  frame.postMessage(
    {
      type: 'ai-gateway-token',
      token,
      domain: getStoredDomain(),
    },
    targetOrigin,
  );
}

function syncIframeMessages() {
  postLocaleOnly();
  postAuthToIframe();
}

function onIframeLoad() {
  iframeReady.value = true;
  showLoading.value = false;
  syncIframeMessages();
}

function mountIframe() {
  const container = containerRef.value;
  const src = buildEmbedSrc();
  if (!container || !src) return;

  const existing = getEmbedStore();
  if (existing?.iframe && embedSrcKey(existing.src) === embedSrcKey(src)) {
    container.appendChild(existing.iframe);
    iframeRef.value = existing.iframe;
    iframeReady.value = true;
    showLoading.value = false;
    syncIframeMessages();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.className = 'gw-api-playground-frame';
  iframe.title = 'API Playground';
  iframe.src = src;
  iframe.addEventListener('load', onIframeLoad);
  container.appendChild(iframe);
  iframeRef.value = iframe;
  setEmbedStore({ iframe, src });
}

function onStorage() {
  refreshTokenState();
  postAuthToIframe();
}

onMounted(() => {
  refreshTokenState();
  mountIframe();
  window.addEventListener('storage', onStorage);
  window.addEventListener('message', onPlaygroundMessage);
});

onUnmounted(() => {
  window.removeEventListener('storage', onStorage);
  window.removeEventListener('message', onPlaygroundMessage);
  if (iframeRef.value) parkIframe(iframeRef.value);
  iframeRef.value = null;
  iframeReady.value = false;
});

watch(hasToken, () => postAuthToIframe());
watch(
  () => props.locale,
  () => {
    postLocaleOnly();
  },
);
</script>

<template>
  <div ref="containerRef" class="gw-api-playground">
    <p v-if="showLoading" class="gw-api-playground-loading">
      {{ locale === 'vi' ? 'Đang tải playground…' : 'Loading playground…' }}
    </p>
  </div>
</template>
