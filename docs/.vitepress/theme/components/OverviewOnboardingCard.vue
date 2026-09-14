<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isVi: boolean;
  prefix: string;
  tokenCopied: boolean;
  hasJobs: boolean;
}>();

const show = computed(() => !props.hasJobs);

const steps = computed(() => [
  {
    id: 'token',
    done: props.tokenCopied,
    label: props.isVi ? 'Copy access token' : 'Copy your access token',
    href: `${props.prefix}/app/token/`,
  },
  {
    id: 'playground',
    done: props.hasJobs,
    label: props.isVi ? 'Chạy job đầu tiên trong Playground' : 'Run your first job in Playground',
    href: `${props.prefix}/app/playground/`,
  },
  {
    id: 'activity',
    done: props.hasJobs,
    label: props.isVi ? 'Xem usage trên Activity' : 'Review usage in Activity',
    href: `${props.prefix}/app/activity/?period=7d`,
  },
  {
    id: 'docs',
    done: false,
    label: props.isVi ? 'Đọc Quickstart REST' : 'Read the REST Quickstart',
    href: `${props.prefix}/quickstart`,
  },
]);
</script>

<template>
  <section v-if="show" class="or-overview-onboarding" aria-labelledby="overview-onboarding-title">
    <h2 id="overview-onboarding-title" class="or-overview-onboarding-title">
      {{ isVi ? 'Bắt đầu' : 'Get started' }}
    </h2>
    <p class="or-overview-onboarding-sub">
      {{
        isVi
          ? 'Bốn bước nhanh để tích hợp gateway.'
          : 'Four quick steps to start using the gateway.'
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
