<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useData } from 'vitepress';
import { getStoredDomain, getStoredToken } from '../models/auth-api';
import { playgroundEmbedUrl, playgroundOrigin } from '../models/gateway-base';

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');

const iframeRef = ref<HTMLIFrameElement | null>(null);
const iframeReady = ref(false);
const embedSrc = ref('');
const hasToken = ref(false);

function readEmbedQuery(): { type?: string; model?: string; panel?: string } {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  return {
    type: q.get('type') || undefined,
    model: q.get('model') || undefined,
    panel: q.get('panel') || undefined,
  };
}

function buildEmbedSrc() {
  if (typeof window === 'undefined') return '';
  const q = readEmbedQuery();
  return playgroundEmbedUrl({
    parentOrigin: window.location.origin,
    ...q,
  });
}

function refreshTokenState() {
  hasToken.value = Boolean(getStoredToken());
}

function postTokenToIframe() {
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

function onIframeLoad() {
  iframeReady.value = true;
  postTokenToIframe();
}

function onStorage() {
  refreshTokenState();
  postTokenToIframe();
}

onMounted(() => {
  embedSrc.value = buildEmbedSrc();
  refreshTokenState();
  window.addEventListener('storage', onStorage);
});

onUnmounted(() => {
  window.removeEventListener('storage', onStorage);
});

watch(hasToken, () => postTokenToIframe());
</script>

<template>
  <div class="gw-api-playground">
    <p v-if="!embedSrc" class="gw-api-playground-loading">
      {{ isVi ? 'Đang tải playground…' : 'Loading playground…' }}
    </p>

    <iframe
      v-else
      ref="iframeRef"
      class="gw-api-playground-frame"
      :src="embedSrc"
      title="API Playground"
      @load="onIframeLoad"
    />
  </div>
</template>
