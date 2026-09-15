<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHybridLocale } from '../composables/use-hybrid-locale';
import {
  getStoredDomain,
  getStoredToken,
  loginWithEmail,
  registerAccount,
  setStoredToken,
  readRedirectFromLocation,
} from '../models/auth-api';
import { fetchMe } from '../models/user-api';

const props = defineProps<{
  mode: 'login' | 'signup';
}>();

const { prefix, t } = useHybridLocale();

const homeLink = computed(() => `${prefix.value}/`);
const loginLink = computed(() => `${prefix.value}/login/`);
const signupLink = computed(() => `${prefix.value}/signup/`);
const appLink = computed(() => `${prefix.value}/app/`);
const termsLink = computed(() => `${prefix.value}/terms/`);
const privacyPolicyLink = computed(() => `${prefix.value}/privacy-policy/`);

function afterAuthRedirect() {
  return readRedirectFromLocation(appLink.value);
}

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
      const pasted = pasteToken.value.trim();
      if (!pasted) throw new Error(t('Enter a token', 'Nhập token', 'ใส่โทเค็น'));
      setStoredToken(pasted);
      await prefetchProfile();
      window.location.href = afterAuthRedirect();
      return;
    }

    if (isSignup.value) {
      if (!agreeTerms.value) {
        throw new Error(t('Accept terms to continue', 'Đồng ý điều khoản để tiếp tục', 'ยอมรับข้อกำหนดเพื่อดำเนินการต่อ'));
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
    window.location.href = afterAuthRedirect();
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
        {{ isSignup ? t('Sign Up', 'Đăng ký', 'สมัครสมาชิก') : t('Sign In', 'Đăng nhập', 'เข้าสู่ระบบ') }}
      </h1>
      <p class="gw-auth-sub">
        {{
          isSignup
            ? t(
                'Create a Gommo account via the gateway — email and password.',
                'Tạo tài khoản Gommo qua gateway — email và mật khẩu.',
                'สร้างบัญชี Gommo ผ่านเกตเวย์ — อีเมลและรหัสผ่าน',
              )
            : t(
                'Sign in with your Gommo email and password.',
                'Đăng nhập bằng email và mật khẩu Gommo.',
                'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน Gommo',
              )
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
              :placeholder="t('Paste access_token…', 'Dán access_token…', 'วาง access_token…')"
            />
          </label>
        </template>

        <template v-else>
          <div v-if="isSignup" class="gw-auth-row">
            <label class="gw-auth-field">
              <span>{{ t('First name', 'Họ', 'ชื่อ') }} <em>optional</em></span>
              <input v-model="firstName" type="text" autocomplete="given-name" class="gw-auth-input" />
            </label>
            <label class="gw-auth-field">
              <span>{{ t('Last name', 'Tên', 'นามสกุล') }} <em>optional</em></span>
              <input v-model="lastName" type="text" autocomplete="family-name" class="gw-auth-input" />
            </label>
          </div>

          <label class="gw-auth-field">
            <span>{{ t('Email address', 'Email', 'อีเมล') }}</span>
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
            <span>{{ t('Phone', 'Số điện thoại', 'โทรศัพท์') }}</span>
            <input
              v-model="phone"
              type="tel"
              required
              autocomplete="tel"
              class="gw-auth-input"
              :placeholder="t('Required by Gommo', 'Bắt buộc trên Gommo', 'จำเป็นบน Gommo')"
            />
          </label>

          <label class="gw-auth-field">
            <span>{{ t('Password', 'Mật khẩu', 'รหัสผ่าน') }}</span>
            <div class="gw-auth-password-wrap">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                :autocomplete="isSignup ? 'new-password' : 'current-password'"
                class="gw-auth-input"
                :placeholder="isSignup ? t('Create a password', 'Tạo mật khẩu', 'สร้างรหัสผ่าน') : ''"
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
              {{ t('I agree to the', 'Tôi đồng ý', 'ฉันยอมรับ') }}
              <a :href="termsLink" target="_blank" rel="noopener">
                {{ t('Terms of Service', 'Điều khoản dịch vụ', 'ข้อกำหนดการใช้บริการ') }}
              </a>
              {{ t('and', 'và', 'และ') }}
              <a :href="privacyPolicyLink" target="_blank" rel="noopener">
                {{ t('Privacy Policy', 'Chính sách quyền riêng tư', 'นโยบายความเป็นส่วนตัว') }}
              </a>.
            </span>
          </label>
        </template>

        <p v-if="error" class="gw-auth-error">{{ error }}</p>

        <button type="submit" class="gw-auth-submit" :disabled="loading">
          {{
            loading
              ? t('Please wait…', 'Đang xử lý…', 'กรุณารอ…')
              : tokenMode
                ? t('Save token', 'Lưu token', 'บันทึกโทเค็น')
                : isSignup
                  ? t('Continue', 'Tiếp tục', 'ดำเนินการต่อ')
                  : t('Sign in', 'Đăng nhập', 'เข้าสู่ระบบ')
          }}
        </button>
      </form>

      <p class="gw-auth-switch">
        <template v-if="isSignup">
          {{ t('Already have an account?', 'Đã có tài khoản?', 'มีบัญชีแล้ว?') }}
          <a :href="loginLink">{{ t('Sign in', 'Đăng nhập', 'เข้าสู่ระบบ') }}</a>
        </template>
        <template v-else>
          {{ t("Don't have an account?", 'Chưa có tài khoản?', 'ยังไม่มีบัญชี?') }}
          <a :href="signupLink">{{ t('Sign up', 'Đăng ký ngay', 'สมัครเลย') }}</a>
        </template>
      </p>

      <a :href="homeLink" class="gw-auth-back">← {{ t('Back to home', 'Về trang chủ', 'กลับหน้าแรก') }}</a>
    </div>
  </div>
</template>
