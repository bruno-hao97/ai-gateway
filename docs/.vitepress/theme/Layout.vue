<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { clearAuth, getStoredToken } from './models/auth-api';

const { Layout } = DefaultTheme;
const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));

const signedIn = ref(false);

onMounted(() => {
  signedIn.value = Boolean(getStoredToken());
});

function signOut() {
  clearAuth();
  signedIn.value = false;
  window.location.reload();
}
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <div class="gw-nav-auth">
        <template v-if="signedIn">
          <a :href="`${prefix}/app/`" class="gw-nav-link">{{ isVi ? 'Home' : 'Home' }}</a>
          <a :href="`${prefix}/models/`" class="gw-nav-link">Models</a>
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
