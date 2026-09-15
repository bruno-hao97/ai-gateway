<script setup lang="ts">
import { computed } from 'vue';
import { pickMsg, type PortalLocale } from '../models/portal-locale';

const props = defineProps<{
  locale: PortalLocale;
  prefix: string;
  tokenCopied: boolean;
  hasJobs: boolean;
}>();

function m(en: string, vi: string, th?: string): string {
  return pickMsg(props.locale, en, vi, th);
}

const show = computed(() => !props.hasJobs);

const steps = computed(() => [
  {
    id: 'token',
    done: props.tokenCopied,
    label: m('Copy your access token', 'Copy access token', 'คัดลอกโทเค็นเข้าถึง'),
    href: `${props.prefix}/app/token/`,
  },
  {
    id: 'playground',
    done: props.hasJobs,
    label: m(
      'Run your first job in Playground',
      'Chạy job đầu tiên trong Playground',
      'รันงานแรกใน Playground',
    ),
    href: `${props.prefix}/app/playground/`,
  },
  {
    id: 'activity',
    done: props.hasJobs,
    label: m('Review usage in Activity', 'Xem usage trên Activity', 'ดูการใช้งานในกิจกรรม'),
    href: `${props.prefix}/app/activity/?period=7d`,
  },
  {
    id: 'docs',
    done: false,
    label: m('Read the REST Quickstart', 'Đọc Quickstart REST', 'อ่าน REST Quickstart'),
    href: `${props.prefix}/quickstart`,
  },
]);
</script>

<template>
  <section v-if="show" class="or-overview-onboarding" aria-labelledby="overview-onboarding-title">
    <h2 id="overview-onboarding-title" class="or-overview-onboarding-title">
      {{ m('Get started', 'Bắt đầu', 'เริ่มต้น') }}
    </h2>
    <p class="or-overview-onboarding-sub">
      {{
        m(
          'Four quick steps to start using the gateway.',
          'Bốn bước nhanh để tích hợp gateway.',
          'สี่ขั้นตอนง่ายๆ เพื่อเริ่มใช้เกตเวย์',
        )
      }}
    </p>
    <ol class="or-overview-onboarding-list">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="or-overview-onboarding-step"
        :class="{ 'or-overview-onboarding-step--done': step.done }"
      >
        <span class="or-overview-onboarding-marker" aria-hidden="true">
          {{ step.done ? '✓' : index + 1 }}
        </span>
        <a :href="step.href" class="or-overview-onboarding-link">{{ step.label }}</a>
      </li>
    </ol>
  </section>
</template>
