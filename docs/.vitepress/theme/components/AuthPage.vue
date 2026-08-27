<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import {
  DEFAULT_DOMAIN,
  getStoredToken,
  loginWithEmail,
  registerAccount,
  setStoredDomain,
  setStoredToken,
} from '../models/auth-api';
import { fetchMe } from '../models/user-api';

const props = defineProps<{
  mode: 'login' | 'signup';
}>();

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));

const homeLink = computed(() => `${prefix.value}/`);
const loginLink = computed(() => `${prefix.value}/login/`);
const signupLink = computed(() => `${prefix.value}/signup/`);
const appLink = computed(() => `${prefix.value}/app/`);

const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const phone = ref('');
const agreeTerms = ref(false);
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const tokenMode = ref(false);
const pasteToken = ref(getStoredToken());

const isSignup = computed(() => props.mode === 'signup');

async function prefetchProfile() {
  try {
    await fetchMe();
  } catch {
    /* Overview will retry — avoid blocking redirect */
  }
}

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    if (tokenMode.value) {
      const t = pasteToken.value.trim();
      if (!t) throw new Error(isVi.value ? 'Nhập token' : 'Enter a token');
      setStoredToken(t);
      setStoredDomain(DEFAULT_DOMAIN);
      await prefetchProfile();
      window.location.href = appLink.value;
      return;
    }

    if (isSignup.value) {
      if (!agreeTerms.value) {
        throw new Error(isVi.value ? 'Đồng ý điều khoản để tiếp tục' : 'Accept terms to continue');
      }
      const name = [firstName.value.trim(), lastName.value.trim()].filter(Boolean).join(' ');
      await registerAccount({
        email: email.value,
        password: password.value,
        phone: phone.value,
        name: name || undefined,
      });
    } else {
      await loginWithEmail(email.value, password.value);
    }
    await prefetchProfile();
    window.location.href = appLink.value;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="gw-auth">
    <div class="gw-auth-card">
      <a :href="homeLink" class="gw-auth-logo" aria-label="Home">
        <span class="gw-auth-logo-mark">⬡</span>
        <span>AI Gateway</span>
      </a>

      <h1 class="gw-auth-title">
        {{ isSignup ? (isVi ? 'Đăng ký' : 'Sign Up') : isVi ? 'Đăng nhập' : 'Sign In' }}
      </h1>
      <p class="gw-auth-sub">
        {{
          isSignup
            ? isVi
              ? 'Tạo tài khoản Gommo qua gateway — email và mật khẩu.'
              : 'Create a Gommo account via the gateway — email and password.'
            : isVi
              ? 'Đăng nhập bằng email và mật khẩu Gommo.'
              : 'Sign in with your Gommo email and password.'
        }}
      </p>

      <div class="gw-auth-tabs">
        <button
          type="button"
          class="gw-auth-tab"
          :class="{ active: !tokenMode }"
          @click="tokenMode = false"
        >
          Email
        </button>
        <button
          type="button"
          class="gw-auth-tab"
          :class="{ active: tokenMode }"
          @click="tokenMode = true"
        >
          Bearer token
        </button>
      </div>

      <form class="gw-auth-form" @submit.prevent="onSubmit">
        <template v-if="tokenMode">
          <label class="gw-auth-field">
            <span>Access token</span>
            <textarea
              v-model="pasteToken"
              rows="3"
              class="gw-auth-input gw-auth-textarea"
              :placeholder="isVi ? 'Dán access_token…' : 'Paste access_token…'"
            />
          </label>
        </template>

        <template v-else>
          <div v-if="isSignup" class="gw-auth-row">
            <label class="gw-auth-field">
              <span>{{ isVi ? 'Họ' : 'First name' }} <em>optional</em></span>
              <input v-model="firstName" type="text" autocomplete="given-name" class="gw-auth-input" />
            </label>
            <label class="gw-auth-field">
              <span>{{ isVi ? 'Tên' : 'Last name' }} <em>optional</em></span>
              <input v-model="lastName" type="text" autocomplete="family-name" class="gw-auth-input" />
            </label>
          </div>

          <label class="gw-auth-field">
            <span>{{ isVi ? 'Email' : 'Email address' }}</span>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="username"
              class="gw-auth-input"
              placeholder="you@example.com"
            />
          </label>

          <label v-if="isSignup" class="gw-auth-field">
            <span>{{ isVi ? 'Số điện thoại' : 'Phone' }}</span>
            <input
              v-model="phone"
              type="tel"
              required
              autocomplete="tel"
              class="gw-auth-input"
              :placeholder="isVi ? 'Bắt buộc trên Gommo' : 'Required by Gommo'"
            />
          </label>

          <label class="gw-auth-field">
            <span>{{ isVi ? 'Mật khẩu' : 'Password' }}</span>
            <div class="gw-auth-password-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                :autocomplete="isSignup ? 'new-password' : 'current-password'"
                class="gw-auth-input"
                :placeholder="isSignup ? (isVi ? 'Tạo mật khẩu' : 'Create a password') : ''"
              />
              <button
                type="button"
                class="gw-auth-eye"
                :aria-label="showPassword ? 'Hide' : 'Show'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '◉' : '○' }}
              </button>
            </div>
          </label>

          <label v-if="isSignup" class="gw-auth-check">
            <input v-model="agreeTerms" type="checkbox" required />
            <span>
              {{
                isVi
                  ? 'Tôi đồng ý Terms of Service và Privacy Policy.'
                  : 'I agree to the Terms of Service and Privacy Policy.'
              }}
            </span>
          </label>
        </template>

        <p v-if="error" class="gw-auth-error">{{ error }}</p>

        <button type="submit" class="gw-auth-submit" :disabled="loading">
          {{
            loading
              ? isVi
                ? 'Đang xử lý…'
                : 'Please wait…'
              : tokenMode
                ? isVi
                  ? 'Lưu token'
                  : 'Save token'
                : isSignup
                  ? isVi
                    ? 'Tiếp tục'
                    : 'Continue'
                  : isVi
                    ? 'Đăng nhập'
                    : 'Sign in'
          }}
        </button>
      </form>

      <p class="gw-auth-switch">
        <template v-if="isSignup">
          {{ isVi ? 'Đã có tài khoản?' : 'Already have an account?' }}
          <a :href="loginLink">{{ isVi ? 'Đăng nhập' : 'Sign in' }}</a>
        </template>
        <template v-else>
          {{ isVi ? 'Chưa có tài khoản?' : "Don't have an account?" }}
          <a :href="signupLink">{{ isVi ? 'Đăng ký ngay' : 'Sign up' }}</a>
        </template>
      </p>

      <a :href="homeLink" class="gw-auth-back">← {{ isVi ? 'Về trang chủ' : 'Back to home' }}</a>
    </div>
  </div>
</template>
