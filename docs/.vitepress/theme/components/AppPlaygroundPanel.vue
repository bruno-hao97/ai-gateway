<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useData } from 'vitepress';
import { modelCatalogUnavailable, modelUnavailableSuffix, type CatalogModel } from '../models/catalog-api';
import {
  catalogJobFieldDefs,
  formatImageJobFieldSummary,
  resolveImageFieldValues,
  validateCatalogJobFields,
  type CatalogJobField,
  type CatalogJobFieldValues,
} from '../models/catalog-job-fields';
import { formatMediaJobError, type FormattedChatError } from '../models/chat-errors';
import {
  createMediaJobWait,
  fetchMediaCatalogModels,
  filterModelsForPlaygroundTab,
  readLastMediaModelSlug,
  resolveMediaJobType,
  resolveMediaModel,
  type MediaJobResult,
  type PlaygroundMediaType,
} from '../models/media-job';
import { startMediaJobProgressTimer } from '../models/media-job-progress';
import { appendUsageRecord } from '../models/usage-history';
import { formatCredits, resolveChatCostCredits } from '../models/user-api';
import { playgroundUrl } from '../models/gateway-base';

const props = defineProps<{
  credits?: number;
  initialType?: string;
  initialModel?: string;
  onCreditsRefresh?: () => Promise<void>;
}>();

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const prefix = computed(() => (isVi.value ? '/vi' : ''));

const MEDIA_TABS: Array<{ id: PlaygroundMediaType; labelEn: string; labelVi: string }> = [
  { id: 'image', labelEn: 'Image', labelVi: 'Ảnh' },
  { id: 'video', labelEn: 'Video', labelVi: 'Video' },
];

const mediaType = ref<PlaygroundMediaType>('image');
const models = ref<CatalogModel[]>([]);
const modelsLoading = ref(false);
const modelSlug = ref('');
const fieldValues = ref<CatalogJobFieldValues>({});
const prompt = ref('');
const running = ref(false);
const error = ref('');
const jobErrorHint = ref<FormattedChatError | null>(null);
const progressLabel = ref('');
const result = ref<MediaJobResult | null>(null);
const abortRef = ref<AbortController | null>(null);
let progressStop: (() => void) | null = null;
let generateLock = false;

const activeModel = computed(() => resolveMediaModel(models.value, modelSlug.value));
const activeModelUnavailable = computed(() =>
  activeModel.value ? modelCatalogUnavailable(activeModel.value) : false,
);
const fieldDefs = computed(() => catalogJobFieldDefs(activeModel.value));
const resultMediaType = computed(() => result.value?.jobType ?? mediaType.value);

const apiExplorerUrl = computed(() => {
  const jobType = activeModel.value ? resolveMediaJobType(activeModel.value) : mediaType.value;
  return playgroundUrl({ jobType, model: modelSlug.value || undefined });
});

function parseInitialType(raw?: string): PlaygroundMediaType {
  return raw === 'video' ? 'video' : 'image';
}

function syncFieldValues(model?: CatalogModel | null) {
  const m = model ?? activeModel.value;
  if (!m) {
    fieldValues.value = {};
    return;
  }
  fieldValues.value = resolveImageFieldValues(m, fieldValues.value);
}

function setField(field: CatalogJobField, value: string) {
  fieldValues.value = { ...fieldValues.value, [field]: value };
}

function stopProgressTimer() {
  progressStop?.();
  progressStop = null;
  progressLabel.value = '';
}

function startProgressTimer(jobType: PlaygroundMediaType) {
  stopProgressTimer();
  progressStop = startMediaJobProgressTimer(
    (label) => {
      progressLabel.value = label;
    },
    jobType,
    isVi.value,
  );
}

function pickFirstAvailableSlug(
  list: CatalogModel[],
  tab: PlaygroundMediaType,
  preferred?: string,
): string {
  const hint = preferred?.trim();
  if (hint && list.some((m) => m.slug === hint && !modelCatalogUnavailable(m))) return hint;
  const saved = readLastMediaModelSlug(tab);
  if (saved && list.some((m) => m.slug === saved && !modelCatalogUnavailable(m))) return saved;
  const available = list.find((m) => !modelCatalogUnavailable(m));
  return available?.slug || list[0]?.slug || '';
}

function switchToNextModel() {
  const list = models.value.filter((m) => !modelCatalogUnavailable(m));
  if (!list.length) return;
  const idx = list.findIndex((m) => m.slug === modelSlug.value);
  const next = list[(idx + 1) % list.length]!;
  modelSlug.value = next.slug;
  jobErrorHint.value = null;
  error.value = '';
}

async function loadCatalog(type: PlaygroundMediaType, preferredSlug?: string) {
  modelsLoading.value = true;
  error.value = '';
  jobErrorHint.value = null;
  try {
    const slugHint = preferredSlug?.trim() || '';
    let tab = type;
    let list = filterModelsForPlaygroundTab(await fetchMediaCatalogModels(tab), tab);

    if (slugHint && !list.some((m) => m.slug === slugHint)) {
      const other: PlaygroundMediaType = tab === 'image' ? 'video' : 'image';
      const otherList = filterModelsForPlaygroundTab(await fetchMediaCatalogModels(other), other);
      if (otherList.some((m) => m.slug === slugHint)) {
        tab = other;
        list = otherList;
        mediaType.value = other;
      }
    }

    models.value = list;
    modelSlug.value = pickFirstAvailableSlug(list, tab, slugHint);
    syncFieldValues(resolveMediaModel(list, modelSlug.value));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load catalog';
    models.value = [];
    modelSlug.value = '';
  } finally {
    modelsLoading.value = false;
  }
}

async function handleGenerate() {
  const model = activeModel.value;
  const text = prompt.value.trim();
  if (!model || !text || running.value || generateLock) return;

  if (modelCatalogUnavailable(model)) {
    error.value = isVi.value
      ? 'Model đang tạm ngưng trên upstream. Chọn model khác.'
      : 'Model is temporarily unavailable upstream. Pick another model.';
    jobErrorHint.value = { message: error.value, suggestModel: true, suggestRetry: false };
    return;
  }

  const validation = validateCatalogJobFields(model, fieldValues.value, isVi.value);
  if (validation) {
    error.value = validation;
    jobErrorHint.value = null;
    return;
  }

  generateLock = true;
  error.value = '';
  jobErrorHint.value = null;
  result.value = null;
  const controller = new AbortController();
  abortRef.value = controller;
  running.value = true;
  startProgressTimer(resolveMediaJobType(model));
  const balanceBefore = props.credits ?? null;

  try {
    const job = await createMediaJobWait(model, text, fieldValues.value, controller.signal);
    result.value = job;
    await props.onCreditsRefresh?.();
    const balanceAfter = props.credits ?? null;
    const costCredits = resolveChatCostCredits({
      balanceBefore,
      balanceAfter,
      usageCredits: job.credits,
    });
    appendUsageRecord({
      jobType: job.jobType,
      model: job.modelLabel,
      prompt: text,
      status: 'success',
      credits: costCredits ?? job.credits ?? null,
      jobId: job.jobId,
      resultUrl: job.resultUrl,
      source: 'playground',
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    const formatted = formatMediaJobError(err, isVi.value);
    jobErrorHint.value = formatted;
    error.value = formatted.message;
    appendUsageRecord({
      jobType: resolveMediaJobType(model),
      model: model.name,
      prompt: text,
      status: 'failed',
      credits: model.credits,
      source: 'playground',
    });
  } finally {
    stopProgressTimer();
    abortRef.value = null;
    running.value = false;
    generateLock = false;
  }
}

function handleStop() {
  abortRef.value?.abort();
  stopProgressTimer();
}

onUnmounted(() => stopProgressTimer());

function copyResultUrl() {
  if (!result.value?.resultUrl) return;
  void navigator.clipboard.writeText(result.value.resultUrl);
}

watch(modelSlug, () => syncFieldValues());

function switchMediaType(type: PlaygroundMediaType) {
  if (mediaType.value === type || running.value) return;
  mediaType.value = type;
  result.value = null;
  error.value = '';
  void loadCatalog(type);
}

watch(
  () => [props.initialType, props.initialModel] as const,
  ([type, model]) => {
    const nextType = parseInitialType(type);
    mediaType.value = nextType;
    void loadCatalog(nextType, model?.trim() || undefined);
  },
  { immediate: true },
);
</script>

<template>
  <div class="or-pg">
    <div class="or-pg-head">
      <div class="or-pg-tabs" role="tablist">
        <button
          v-for="tab in MEDIA_TABS"
          :key="tab.id"
          type="button"
          class="or-pg-tab"
          :class="{ active: mediaType === tab.id }"
          role="tab"
          :aria-selected="mediaType === tab.id"
          :disabled="running"
          @click="switchMediaType(tab.id)"
        >
          {{ isVi ? tab.labelVi : tab.labelEn }}
        </button>
      </div>
      <a :href="apiExplorerUrl" target="_blank" rel="noreferrer" class="or-pg-api-link">
        {{ isVi ? 'API explorer ↗' : 'API explorer ↗' }}
      </a>
    </div>

    <div class="or-pg-body">
      <section class="or-pg-form">
        <label class="or-pg-field">
          <span class="or-pg-label">{{ isVi ? 'Prompt' : 'Prompt' }}</span>
          <textarea
            v-model="prompt"
            class="or-pg-prompt"
            rows="4"
            :disabled="running"
            :placeholder="
              mediaType === 'image'
                ? isVi
                  ? 'Mô tả ảnh muốn tạo…'
                  : 'Describe the image you want…'
                : isVi
                  ? 'Mô tả video muốn tạo…'
                  : 'Describe the video you want…'
            "
          />
        </label>

        <label class="or-pg-field">
          <span class="or-pg-label">{{ isVi ? 'Model' : 'Model' }}</span>
          <select v-model="modelSlug" class="or-pg-select" :disabled="running || modelsLoading || !models.length">
            <option
              v-for="m in models"
              :key="m.slug"
              :value="m.slug"
              :disabled="modelCatalogUnavailable(m)"
            >
              {{ m.name }} · {{ m.creditsLabel }}{{ modelUnavailableSuffix(m, isVi) }}
            </option>
          </select>
        </label>

        <p v-if="activeModelUnavailable" class="or-pg-hint or-pg-warn">
          {{
            isVi
              ? 'Model này đang tạm ngưng trên upstream — chọn model khác trước khi Generate.'
              : 'This model is temporarily unavailable upstream — pick another before Generate.'
          }}
        </p>

        <label v-for="def in fieldDefs" :key="def.field" class="or-pg-field">
          <span class="or-pg-label">{{ def.field }}</span>
          <select
            class="or-pg-select"
            :value="fieldValues[def.field] || ''"
            :disabled="running"
            @change="setField(def.field, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in def.options" :key="opt.value" :value="opt.value">
              {{ opt.label !== opt.value ? `${opt.label} (${opt.value})` : opt.value }}
            </option>
          </select>
        </label>

        <p v-if="modelsLoading" class="or-pg-hint">{{ isVi ? 'Đang tải catalog…' : 'Loading catalog…' }}</p>
        <p v-else-if="activeModel?.credits != null" class="or-pg-hint">
          {{ isVi ? 'Ước tính' : 'Est.' }} ~{{ formatCredits(activeModel.credits) }} credits
        </p>

        <div class="or-pg-actions">
          <button
            v-if="running"
            type="button"
            class="or-app-btn or-pg-btn-stop"
            @click="handleStop"
          >
            {{ isVi ? 'Dừng' : 'Stop' }}
          </button>
          <button
            v-else
            type="button"
            class="or-app-btn or-app-btn-primary or-pg-btn-run"
            :disabled="!prompt.trim() || !activeModel || modelsLoading || activeModelUnavailable"
            @click="handleGenerate"
          >
            {{ isVi ? 'Tạo' : 'Generate' }}
          </button>
        </div>

        <div v-if="error" class="or-app-alert or-pg-error">
          <p>{{ error }}</p>
          <div v-if="jobErrorHint" class="or-pg-error-actions">
            <button
              v-if="jobErrorHint.suggestModel"
              type="button"
              class="or-app-btn or-app-btn-ghost or-pg-error-btn"
              @click="switchToNextModel"
            >
              {{ isVi ? 'Thử model khác' : 'Try another model' }}
            </button>
          </div>
        </div>
      </section>

      <section class="or-pg-result">
        <div v-if="running" class="or-pg-result-empty">
          <div class="or-pg-progress">
            <span class="or-pg-progress-spinner" aria-hidden="true" />
            <p class="or-pg-result-status">{{ progressLabel || (isVi ? 'Đang tạo…' : 'Generating…') }}</p>
          </div>
        </div>
        <div v-else-if="result" class="or-pg-result-media">
          <img
            v-if="resultMediaType === 'image'"
            :src="result.resultUrl"
            :alt="result.modelLabel"
            class="or-pg-result-img"
          />
          <video
            v-else
            :src="result.resultUrl"
            :poster="result.coverUrl || undefined"
            class="or-pg-result-video"
            controls
            playsinline
          />
          <div class="or-pg-result-meta">
            <span>{{ result.modelLabel }}</span>
            <span v-if="result.latencyMs">{{ (result.latencyMs / 1000).toFixed(1) }}s</span>
            <span v-if="formatImageJobFieldSummary(result.fields)">{{ formatImageJobFieldSummary(result.fields) }}</span>
          </div>
          <div class="or-pg-result-actions">
            <a :href="result.resultUrl" target="_blank" rel="noreferrer" class="or-app-btn or-app-btn-ghost">
              {{ isVi ? 'Mở' : 'Open' }} ↗
            </a>
            <button type="button" class="or-app-btn or-app-btn-ghost" @click="copyResultUrl">
              {{ isVi ? 'Copy URL' : 'Copy URL' }}
            </button>
          </div>
        </div>
        <div v-else class="or-pg-result-empty">
          <p>{{ isVi ? 'Kết quả hiện ở đây' : 'Result will appear here' }}</p>
          <p class="or-pg-hint">
            {{
              isVi
                ? 'Chọn model và tham số từ catalog — không đoán ratio/mode.'
                : 'Pick model and params from catalog — never guess ratio/mode.'
            }}
          </p>
        </div>
      </section>
    </div>

    <p class="or-pg-foot">
      <a :href="`${prefix}/models/`">{{ isVi ? 'Xem catalog' : 'Browse catalog' }}</a>
      ·
      <a :href="`${prefix}/app/profile/?section=usage`">{{ isVi ? 'Usage' : 'Usage' }}</a>
    </p>
  </div>
</template>
