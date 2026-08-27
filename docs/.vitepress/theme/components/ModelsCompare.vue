<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useData } from 'vitepress';
import {
  COMPARE_PRESETS,
  INPUT_MODALITIES,
  JOB_TYPES,
  applyComparePreset,
  buildCompareRows,
  catalogProviders,
  fetchAllModels,
  findCatalogModel,
  formatRelativeTime,
  modelDescription,
  modelInputModalities,
  modelTags,
  monthGroupLabel,
  playgroundUrl,
  presetPreviewModels,
  presetExampleNames,
  providerInitials,
  type CatalogLang,
  type CatalogModel,
  type ComparePreset,
  type InputModalityId,
  type JobTypeId,
} from '../models/catalog-api';

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const catalogLang = computed((): CatalogLang | undefined => (isVi.value ? 'vi' : 'en'));

const homeLink = computed(() => (isVi.value ? '/vi/' : '/'));
const catalogLink = computed(() => (isVi.value ? '/vi/models/' : '/models/'));

const loading = ref(true);
const error = ref('');
const allModels = ref<CatalogModel[]>([]);

const slotA = ref<CatalogModel | null>(null);
const slotB = ref<CatalogModel | null>(null);

const modalOpen = ref(false);
const modalTarget = ref<'a' | 'b'>('a');
const modalSearch = ref('');
const modalJobType = ref<JobTypeId | 'all'>('all');
const modalProvider = ref('');
const modalModality = ref<InputModalityId | 'all'>('all');
const modalPreset = ref<ComparePreset | null>(null);
const modalHighlight = ref('');

const providers = computed(() => catalogProviders(allModels.value));

const modalFiltered = computed(() => {
  let list = modalPreset.value ? applyComparePreset(allModels.value, modalPreset.value) : allModels.value;
  const q = modalSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (m) =>
        m.slug.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q),
    );
  }
  if (modalJobType.value !== 'all') list = list.filter((m) => m.jobType === modalJobType.value);
  if (modalProvider.value) list = list.filter((m) => m.provider === modalProvider.value);
  if (modalModality.value !== 'all') {
    list = list.filter((m) => modelInputModalities(m).includes(modalModality.value as InputModalityId));
  }
  return list;
});

const modalGroups = computed(() => {
  const map = new Map<string, CatalogModel[]>();
  for (const m of modalFiltered.value) {
    const key = monthGroupLabel(m.sortDate, isVi.value);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()];
});

const modalPreview = computed(() => {
  const slug = modalHighlight.value;
  if (slug) return findCatalogModel(modalFiltered.value, slug) ?? modalFiltered.value[0];
  return modalFiltered.value[0];
});

const compareRows = computed(() => {
  if (!slotA.value || !slotB.value) return [];
  return buildCompareRows(slotA.value, slotB.value, isVi.value);
});

const compareSpecRows = computed(() =>
  compareRows.value.filter((row) => row.key !== 'credits' && row.key !== 'slug'),
);

const showSlotPicker = computed(() => !(slotA.value && slotB.value));

const presetCards = computed(() =>
  COMPARE_PRESETS.map((preset) => ({
    preset,
    preview: presetPreviewModels(allModels.value, preset),
    examples: presetExampleNames(allModels.value, preset),
  })),
);

function compareRowLabel(row: (typeof compareRows.value)[number]): string {
  return isVi.value ? row.labelVi : row.labelEn;
}

function syncUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (slotA.value) url.searchParams.set('a', slotA.value.slug);
  else url.searchParams.delete('a');
  if (slotB.value) url.searchParams.set('b', slotB.value.slug);
  else url.searchParams.delete('b');
  history.replaceState(null, '', url);
}

function loadFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const a = params.get('a');
  const b = params.get('b');
  if (a) slotA.value = findCatalogModel(allModels.value, a) ?? null;
  if (b) slotB.value = findCatalogModel(allModels.value, b) ?? null;
}

async function loadCatalog() {
  loading.value = true;
  error.value = '';
  try {
    allModels.value = await fetchAllModels(catalogLang.value);
    loadFromUrl();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function openModal(target: 'a' | 'b', preset: ComparePreset | null = null) {
  modalTarget.value = target;
  modalPreset.value = preset;
  modalSearch.value = '';
  modalJobType.value = preset?.jobType ?? 'all';
  modalProvider.value = '';
  modalModality.value = 'all';
  modalHighlight.value = '';
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  modalPreset.value = null;
}

function selectModel(m: CatalogModel) {
  if (modalTarget.value === 'a') slotA.value = m;
  else slotB.value = m;
  syncUrl();
  closeModal();
}

function clearSlot(target: 'a' | 'b') {
  if (target === 'a') slotA.value = null;
  else slotB.value = null;
  syncUrl();
}

function onPresetClick(preset: ComparePreset) {
  const picks = applyComparePreset(allModels.value, preset);
  if (picks.length >= 2) {
    slotA.value = picks[0];
    slotB.value = picks[1];
    syncUrl();
    return;
  }
  if (picks.length === 1) {
    slotA.value = picks[0];
    slotB.value = null;
    syncUrl();
    openModal('b', preset);
    return;
  }
  openModal('a', preset);
}

watch(modalFiltered, (list) => {
  if (!list.length) {
    modalHighlight.value = '';
    return;
  }
  if (!list.some((m) => m.slug === modalHighlight.value)) {
    modalHighlight.value = list[0].slug;
  }
});

watch(isVi, () => {
  void loadCatalog();
});

onMounted(() => {
  void loadCatalog();
});
</script>

<template>
  <div class="or-catalog or-compare">
    <div class="or-compare-wrap">
      <nav class="or-compare-crumb" aria-label="Breadcrumb">
        <a :href="homeLink">Home</a>
        <span aria-hidden="true">/</span>
        <span>{{ isVi ? 'So sánh' : 'Compare' }}</span>
      </nav>

      <header class="or-compare-header">
        <div class="or-compare-header-top">
          <h1 class="or-compare-title">
            {{ isVi ? 'So sánh model AI' : 'AI Model Comparison' }}
          </h1>
          <a :href="catalogLink" class="or-compare-catalog-link">{{
            isVi ? 'Catalog →' : 'Catalog →'
          }}</a>
        </div>
        <p class="or-compare-sub">
          {{
            isVi
              ? 'So sánh credits, tham số catalog và loại job — cùng nguồn GET /gateway/models.'
              : 'Compare credits, catalog parameters, and job types — same data as GET /gateway/models.'
          }}
        </p>
      </header>

      <div class="or-compare-presets">
        <button
          v-for="{ preset, preview, examples } in presetCards"
          :key="preset.id"
          type="button"
          class="or-compare-preset"
          @click="onPresetClick(preset)"
        >
          <div v-if="preview.length" class="or-compare-preset-icons">
            <span
              v-for="m in preview"
              :key="m.slug"
              class="or-provider-avatar or-provider-avatar--sm"
              :title="m.name"
            >{{ providerInitials(m.provider || m.slug) }}</span>
          </div>
          <div v-else-if="loading" class="or-compare-preset-icons or-compare-preset-icons--placeholder" aria-hidden="true">
            <span class="or-provider-avatar or-provider-avatar--sm or-compare-icon-skeleton" />
            <span class="or-provider-avatar or-provider-avatar--sm or-compare-icon-skeleton" />
            <span class="or-provider-avatar or-provider-avatar--sm or-compare-icon-skeleton" />
          </div>
          <strong>{{ isVi ? preset.titleVi : preset.titleEn }}</strong>
          <span class="or-compare-preset-desc">{{
            isVi ? preset.descVi : preset.descEn
          }}</span>
          <span v-if="examples" class="or-compare-preset-examples">{{ examples }}</span>
        </button>
      </div>

      <p v-if="error" class="or-status or-status-err">{{ error }}</p>
      <p v-else-if="loading" class="or-status">{{ isVi ? 'Đang tải…' : 'Loading…' }}</p>

      <div v-else-if="showSlotPicker" class="or-compare-slots">
        <div class="or-compare-slot">
          <button
            v-if="!slotA"
            type="button"
            class="or-compare-slot-empty"
            @click="openModal('a')"
          >
            <span class="or-compare-plus">+</span>
            {{ isVi ? 'Chọn model' : 'Select a model' }}
          </button>
          <div v-else class="or-compare-slot-filled">
            <span class="or-provider-avatar">{{
              providerInitials(slotA.provider || slotA.slug)
            }}</span>
            <div class="or-compare-slot-body">
              <strong>{{ slotA.name }}</strong>
              <code>{{ slotA.slug }}</code>
            </div>
            <button type="button" class="or-link" @click="openModal('a')">
              {{ isVi ? 'Đổi' : 'Change' }}
            </button>
            <button type="button" class="or-link or-compare-clear" @click="clearSlot('a')">×</button>
          </div>
        </div>

        <div class="or-compare-slot">
          <button
            v-if="!slotB"
            type="button"
            class="or-compare-slot-empty"
            @click="openModal('b')"
          >
            <span class="or-compare-plus">+</span>
            {{ isVi ? 'Chọn model' : 'Select a model' }}
          </button>
          <div v-else class="or-compare-slot-filled">
            <span class="or-provider-avatar">{{
              providerInitials(slotB.provider || slotB.slug)
            }}</span>
            <div class="or-compare-slot-body">
              <strong>{{ slotB.name }}</strong>
              <code>{{ slotB.slug }}</code>
            </div>
            <button type="button" class="or-link" @click="openModal('b')">
              {{ isVi ? 'Đổi' : 'Change' }}
            </button>
            <button type="button" class="or-link or-compare-clear" @click="clearSlot('b')">×</button>
          </div>
        </div>
      </div>

      <section v-if="slotA && slotB" class="or-compare-results" aria-label="Comparison">
        <div class="or-compare-col-heads">
          <article v-for="(model, idx) in [slotA, slotB]" :key="model.slug" class="or-compare-col-head">
            <div class="or-compare-col-head-main">
              <span class="or-provider-avatar">{{
                providerInitials(model.provider || model.slug)
              }}</span>
              <div class="or-compare-col-head-body">
                <h2 class="or-compare-col-title">{{ model.name }}</h2>
                <code class="or-compare-col-slug">{{ model.slug }}</code>
              </div>
            </div>
            <div class="or-compare-col-head-meta">
              <span class="or-compare-col-credits">{{ model.creditsLabel }}</span>
              <div class="or-compare-col-actions">
                <button type="button" class="or-link" @click="openModal(idx === 0 ? 'a' : 'b')">
                  {{ isVi ? 'Đổi' : 'Change' }}
                </button>
                <a
                  :href="playgroundUrl(model)"
                  target="_blank"
                  rel="noopener"
                  class="or-compare-play-btn"
                >
                  Playground
                </a>
                <button
                  type="button"
                  class="or-link or-compare-clear"
                  :aria-label="isVi ? 'Xóa' : 'Clear'"
                  @click="clearSlot(idx === 0 ? 'a' : 'b')"
                >
                  ×
                </button>
              </div>
            </div>
          </article>
          <span class="or-compare-vs" aria-hidden="true">vs</span>
        </div>

        <div class="or-compare-specs">
          <div
            v-for="row in compareSpecRows"
            :key="row.key"
            class="or-compare-spec"
            :class="{ 'or-compare-spec--diff': row.diff }"
          >
            <h3 class="or-compare-spec-label">{{ compareRowLabel(row) }}</h3>
            <div class="or-compare-spec-values">
              <div
                class="or-compare-spec-val"
                :class="{
                  'or-compare-spec-val--desc': row.key === 'description',
                  'is-diff': row.diff,
                }"
              >
                {{ row.valueA }}
              </div>
              <div
                class="or-compare-spec-val"
                :class="{
                  'or-compare-spec-val--desc': row.key === 'description',
                  'is-diff': row.diff,
                }"
              >
                {{ row.valueB }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="modalOpen"
      class="or-compare-modal-backdrop"
      role="presentation"
      @click.self="closeModal"
    >
      <div class="or-compare-modal" role="dialog" aria-modal="true" :aria-label="isVi ? 'Chọn model' : 'Select model'">
        <header class="or-compare-modal-head">
          <input
            v-model="modalSearch"
            type="search"
            class="or-search or-compare-modal-search"
            :placeholder="isVi ? 'Tìm model…' : 'Search models…'"
          />
          <span class="or-compare-modal-count"
            >{{ modalFiltered.length }} {{ isVi ? 'model' : 'models' }}</span
          >
          <button type="button" class="or-compare-modal-close" aria-label="Close" @click="closeModal">
            ×
          </button>
        </header>

        <div class="or-compare-modal-filters">
          <select v-model="modalJobType" class="or-select">
            <option value="all">{{ isVi ? 'Mọi loại' : 'All types' }}</option>
            <option v-for="t in JOB_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
          <select v-model="modalProvider" class="or-select">
            <option value="">{{ isVi ? 'Mọi provider' : 'All providers' }}</option>
            <option v-for="p in providers" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="modalModality" class="or-select">
            <option value="all">{{ isVi ? 'Mọi input' : 'All inputs' }}</option>
            <option v-for="m in INPUT_MODALITIES" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>

        <div class="or-compare-modal-body">
          <div class="or-compare-modal-list">
            <p v-if="!modalFiltered.length" class="or-muted or-compare-modal-empty">
              {{ isVi ? 'Không có model.' : 'No models found.' }}
            </p>
            <section v-for="[month, items] in modalGroups" :key="month" class="or-compare-modal-group">
              <h3 class="or-compare-modal-month">{{ month }}</h3>
              <button
                v-for="m in items"
                :key="m.slug"
                type="button"
                class="or-compare-modal-item"
                :class="{ active: modalPreview?.slug === m.slug }"
                @mouseenter="modalHighlight = m.slug"
                @focus="modalHighlight = m.slug"
                @click="selectModel(m)"
              >
                <span class="or-provider-avatar or-provider-avatar--sm">{{
                  providerInitials(m.provider || m.slug)
                }}</span>
                <span class="or-compare-modal-item-name">{{ m.name }}</span>
                <span v-if="m.credits != null" class="or-compare-modal-item-credits">{{
                  m.creditsLabel
                }}</span>
              </button>
            </section>
          </div>

          <aside v-if="modalPreview" class="or-compare-modal-preview">
            <div class="or-compare-preview-head">
              <span class="or-provider-avatar">{{
                providerInitials(modalPreview.provider || modalPreview.slug)
              }}</span>
              <div>
                <h2 class="or-compare-preview-title">{{ modalPreview.name }}</h2>
                <code class="or-compare-preview-slug">{{ modalPreview.slug }}</code>
              </div>
            </div>
            <p v-if="modelDescription(modalPreview, isVi)" class="or-compare-preview-desc">
              {{ modelDescription(modalPreview, isVi) }}
            </p>
            <dl class="or-compare-preview-meta">
              <div>
                <dt>{{ isVi ? 'Credits' : 'Credits' }}</dt>
                <dd>{{ modalPreview.creditsLabel }}</dd>
              </div>
              <div>
                <dt>{{ isVi ? 'Loại' : 'Type' }}</dt>
                <dd>{{ JOB_TYPES.find((t) => t.id === modalPreview!.jobType)?.label }}</dd>
              </div>
              <div v-if="modalPreview.provider">
                <dt>Provider</dt>
                <dd>{{ modalPreview.provider }}</dd>
              </div>
              <div v-if="modalPreview.sortDate">
                <dt>{{ isVi ? 'Thêm' : 'Added' }}</dt>
                <dd>{{ formatRelativeTime(modalPreview.sortDate, isVi) }}</dd>
              </div>
            </dl>
            <div class="or-row-tags">
              <span v-for="tag in modelTags(modalPreview)" :key="tag" class="or-tag">{{ tag }}</span>
            </div>
            <button type="button" class="or-compare-select-btn" @click="selectModel(modalPreview)">
              {{ isVi ? 'Chọn model này' : 'Select this model' }}
            </button>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>
