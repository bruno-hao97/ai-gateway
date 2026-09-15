<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useHybridLocale } from '../composables/use-hybrid-locale';
import FilterCheckList from './FilterCheckList.vue';
import SidebarIcon from './SidebarIcon.vue';
import {
  CATALOG_TABS,
  INPUT_MODALITIES,
  catalogCreditRange,
  catalogJobTypeLabel,
  catalogProviders,
  catalogUniqueValues,
  inputModalityLabel,
  fetchAllModels,
  fetchModelsForType,
  dedupeCatalogModels,
  formatRelativeTime,
  modelDescription,
  modelInputModalities,
  modelMatchesParamFilters,
  modelTags,
  playgroundUrl,
  providerInitials,
  sortModels,
  tabJobTypes,
  type CatalogLang,
  type CatalogModel,
  type CatalogTabId,
  type InputModalityId,
  type JobTypeId,
  type SortKey,
  type ViewMode,
} from '../models/catalog-api';

const { locale, prefix: localePrefix, t } = useHybridLocale();

const tabLabel = (id: CatalogTabId): string => {
  const labels: Record<CatalogTabId, [string, string, string]> = {
    all: ['All', 'Tất cả', 'ทั้งหมด'],
    image: ['Image', 'Image', 'รูปภาพ'],
    video: ['Video', 'Video', 'วิดีโอ'],
    music: ['Music', 'Music', 'เพลง'],
    tts: ['TTS', 'TTS', 'TTS'],
    'avatar-lipsync': ['Avatar', 'Avatar', 'อวตาร'],
    tools: ['Tools', 'Tools', 'เครื่องมือ'],
  };
  const [en, vi, th] = labels[id];
  return t(en, vi, th);
};
const catalogLang = computed((): CatalogLang => locale.value);

const LIST_LIMIT = 6;

const loading = ref(true);
const error = ref('');
const allModels = ref<CatalogModel[]>([]);
const search = ref('');
const sort = ref<SortKey>('newest');
const viewMode = ref<ViewMode>('list');
const activeTab = ref<CatalogTabId>('all');
const mobileFilters = ref(false);

const filterGroup = ref<'all' | 'media' | 'tools'>('all');
const filterModalities = ref<InputModalityId[]>([]);
const filterRatios = ref<string[]>([]);
const filterModes = ref<string[]>([]);
const filterResolutions = ref<string[]>([]);
const filterDurations = ref<string[]>([]);
const filterProviders = ref<string[]>([]);
const filterCreditsMax = ref<number | null>(null);

const creditRange = computed(() => catalogCreditRange(allModels.value));

const facetRatios = computed(() => catalogUniqueValues(allModels.value, 'ratios'));
const facetModes = computed(() => catalogUniqueValues(allModels.value, 'modes'));
const facetResolutions = computed(() => catalogUniqueValues(allModels.value, 'resolutions'));
const facetDurations = computed(() => catalogUniqueValues(allModels.value, 'durations'));
const providers = computed(() => catalogProviders(allModels.value));

const hasParamFacets = computed(
  () =>
    facetRatios.value.length > 0 ||
    facetModes.value.length > 0 ||
    facetResolutions.value.length > 0 ||
    facetDurations.value.length > 0,
);

const creditsSliderValue = computed({
  get: () => filterCreditsMax.value ?? creditRange.value?.max ?? 0,
  set: (v: number) => {
    filterCreditsMax.value = v;
  },
});

const creditsFilterActive = computed(() => {
  const r = creditRange.value;
  if (!r || filterCreditsMax.value === null) return false;
  return filterCreditsMax.value < r.max;
});

const hasActiveFilters = computed(
  () =>
    filterGroup.value !== 'all' ||
    filterModalities.value.length > 0 ||
    filterRatios.value.length > 0 ||
    filterModes.value.length > 0 ||
    filterResolutions.value.length > 0 ||
    filterDurations.value.length > 0 ||
    filterProviders.value.length > 0 ||
    creditsFilterActive.value ||
    search.value.trim() !== '',
);

const tabCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const tab of CATALOG_TABS) {
    if (tab.id === 'all') {
      counts.all = allModels.value.length;
      continue;
    }
    const types = tabJobTypes(tab.id);
    counts[tab.id] = types
      ? allModels.value.filter((m) => types.includes(m.jobType)).length
      : 0;
  }
  return counts;
});

function applySidebarFilters(list: CatalogModel[]): CatalogModel[] {
  let out = list;

  if (filterGroup.value !== 'all') {
    out = out.filter((m) => m.group === filterGroup.value);
  }
  if (filterModalities.value.length) {
    out = out.filter((m) =>
      filterModalities.value.some((mod) => modelInputModalities(m).includes(mod)),
    );
  }
  out = out.filter((m) =>
    modelMatchesParamFilters(m, {
      ratios: filterRatios.value,
      modes: filterModes.value,
      resolutions: filterResolutions.value,
      durations: filterDurations.value,
    }),
  );
  if (filterProviders.value.length) {
    out = out.filter((m) => filterProviders.value.includes(m.provider));
  }
  if (creditsFilterActive.value && filterCreditsMax.value != null) {
    out = out.filter((m) => m.credits == null || m.credits <= filterCreditsMax.value!);
  }
  return out;
}

const filtered = computed(() => {
  let list = allModels.value;

  const types = tabJobTypes(activeTab.value);
  if (types) list = list.filter((m) => types.includes(m.jobType));

  list = applySidebarFilters(list);

  const q = search.value.trim().toLowerCase();
  if (q) {
    list = list.filter((m) => {
      const desc = modelDescription(m, catalogLang.value);
      return (
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        m.descriptionVi.toLowerCase().includes(q) ||
        m.descriptionEn.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });
  }

  return sortModels(list, sort.value);
});

const guideLink = computed(() => `${localePrefix.value}/models/guide`);
const compareLink = computed(() => `${localePrefix.value}/models/compare/`);

watch(creditRange, (r) => {
  if (r) filterCreditsMax.value = r.max;
});

async function loadCatalog() {
  loading.value = true;
  error.value = '';
  try {
    allModels.value = await fetchAllModels(catalogLang.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function refreshType(type: JobTypeId) {
  loading.value = true;
  error.value = '';
  try {
    const fresh = await fetchModelsForType(type, catalogLang.value);
    const rest = allModels.value.filter((m) => m.jobType !== type);
    allModels.value = dedupeCatalogModels([...rest, ...fresh]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function setTab(tabId: CatalogTabId) {
  activeTab.value = tabId;
}

function toggleModality(id: InputModalityId) {
  const i = filterModalities.value.indexOf(id);
  if (i >= 0) filterModalities.value.splice(i, 1);
  else filterModalities.value.push(id);
}

function clearFilters() {
  filterGroup.value = 'all';
  filterModalities.value = [];
  filterRatios.value = [];
  filterModes.value = [];
  filterResolutions.value = [];
  filterDurations.value = [];
  filterProviders.value = [];
  if (creditRange.value) filterCreditsMax.value = creditRange.value.max;
  search.value = '';
}

function relativeTime(m: CatalogModel): string {
  return formatRelativeTime(m.sortDate, locale.value);
}

function displayDescription(m: CatalogModel): string {
  return modelDescription(m, catalogLang.value);
}

function formatCredits(n: number): string {
  return n.toLocaleString();
}

onMounted(() => {
  void loadCatalog();
});

watch(locale, () => {
  void loadCatalog();
});

watch(activeTab, (tab) => {
  const types = tabJobTypes(tab);
  if (!types) return;
  for (const t of types) {
    if (allModels.value.filter((m) => m.jobType === t).length === 0) {
      void refreshType(t);
    }
  }
});
</script>

<template>
  <div class="or-catalog">
    <aside
      class="or-sidebar"
      :class="{ 'or-sidebar--open': mobileFilters }"
      :aria-label="t('Filters', 'Bộ lọc', 'ตัวกรอง')"
    >
      <div class="or-sidebar-head">
        <span>{{ t('Filters', 'Bộ lọc', 'ตัวกรอง') }}</span>
        <button type="button" class="or-sidebar-close" @click="mobileFilters = false">×</button>
      </div>

      <details class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="modalities" />
            {{ t('Input modalities', 'Input modalities', 'ประเภทอินพุต') }}
          </span>
        </summary>
        <div class="or-filter-body or-filter-body--indent">
          <label
            v-for="mod in INPUT_MODALITIES"
            :key="mod.id"
            class="or-check or-check--plain"
          >
            <input
              type="checkbox"
              :checked="filterModalities.includes(mod.id)"
              @change="toggleModality(mod.id)"
            />
            <span>{{ inputModalityLabel(mod.id, catalogLang) }}</span>
          </label>
        </div>
      </details>

      <details class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="categories" />
            {{ t('Categories', 'Categories', 'หมวดหมู่') }}
          </span>
        </summary>
        <div class="or-filter-body or-filter-body--indent">
          <label v-for="g in ['all', 'media', 'tools'] as const" :key="g" class="or-check or-check--plain">
            <input v-model="filterGroup" type="radio" name="or-group" :value="g" />
            <span>{{
              g === 'all'
                ? t('All', 'Tất cả', 'ทั้งหมด')
                : g === 'media'
                  ? t('Media', 'Media', 'มีเดีย')
                  : t('Tools', 'Tools', 'เครื่องมือ')
            }}</span>
          </label>
        </div>
      </details>

      <details v-if="hasParamFacets" class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="params" />
            {{ t('Supported parameters', 'Supported parameters', 'พารามิเตอร์ที่รองรับ') }}
          </span>
        </summary>
        <div class="or-filter-body or-param-groups">
          <div v-if="facetRatios.length" class="or-param-group">
            <p class="or-param-label">ratio</p>
            <FilterCheckList v-model="filterRatios" :items="facetRatios" :limit="LIST_LIMIT" />
          </div>
          <div v-if="facetModes.length" class="or-param-group">
            <p class="or-param-label">mode</p>
            <FilterCheckList v-model="filterModes" :items="facetModes" :limit="LIST_LIMIT" />
          </div>
          <div v-if="facetResolutions.length" class="or-param-group">
            <p class="or-param-label">resolution</p>
            <FilterCheckList v-model="filterResolutions" :items="facetResolutions" :limit="LIST_LIMIT" />
          </div>
          <div v-if="facetDurations.length" class="or-param-group">
            <p class="or-param-label">duration</p>
            <FilterCheckList v-model="filterDurations" :items="facetDurations" :limit="LIST_LIMIT" />
          </div>
        </div>
      </details>

      <details v-if="creditRange" class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="pricing" />
            {{ t('Credits pricing', 'Credits pricing', 'ราคาเครดิต') }}
          </span>
        </summary>
        <div class="or-filter-body or-credits-filter">
          <div class="or-credits-labels">
            <span>{{ t('Free', 'Free', 'ฟรี') }}</span>
            <span>{{ formatCredits(creditsSliderValue) }}</span>
          </div>
          <input
            v-model.number="creditsSliderValue"
            type="range"
            class="or-range"
            :min="creditRange.min"
            :max="creditRange.max"
            :step="Math.max(1, Math.floor((creditRange.max - creditRange.min) / 100))"
          />
        </div>
      </details>

      <details v-if="providers.length" class="or-filter-section">
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="providers" />
            {{ t('Providers', 'Providers', 'ผู้ให้บริการ') }}
          </span>
        </summary>
        <div class="or-filter-body or-filter-body--indent">
          <FilterCheckList
            v-model="filterProviders"
            :items="providers"
            :limit="LIST_LIMIT"
          />
        </div>
      </details>

      <button v-if="hasActiveFilters" type="button" class="or-clear-filters" @click="clearFilters">
        {{ t('Clear filters', 'Xóa bộ lọc', 'ล้างตัวกรอง') }}
      </button>
    </aside>

    <div v-if="mobileFilters" class="or-sidebar-backdrop" @click="mobileFilters = false" />

    <div class="or-main">
      <header class="or-page-header">
        <h1 class="or-title">{{ t('Models', 'Models', 'โมเดล') }}</h1>
        <div class="or-page-header-links">
          <a :href="compareLink" class="or-docs-link">{{ t('Compare', 'So sánh', 'เปรียบเทียบ') }}</a>
          <a :href="guideLink" class="or-docs-link">{{ t('Docs', 'Docs', 'เอกสาร') }}</a>
        </div>
      </header>

      <div class="or-sticky-head">
        <div class="or-toolbar">
          <button
            type="button"
            class="or-filter-toggle"
            :aria-label="t('Filters', 'Bộ lọc', 'ตัวกรอง')"
            @click="mobileFilters = true"
          >
            ☰
          </button>
          <div class="or-search-wrap">
            <span class="or-search-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            </span>
            <input
              v-model="search"
              type="search"
              class="or-search"
              :placeholder="t('Search models…', 'Tìm model…', 'ค้นหาโมเดล…')"
            />
          </div>
          <select v-model="sort" class="or-select" :aria-label="t('Sort', 'Sắp xếp', 'เรียงลำดับ')">
            <option value="newest">{{ t('Newest', 'Mới nhất', 'ใหม่ล่าสุด') }}</option>
            <option value="oldest">{{ t('Oldest', 'Cũ nhất', 'เก่าสุด') }}</option>
            <option value="name-asc">{{ t('Name A→Z', 'Tên A→Z', 'ชื่อ A→Z') }}</option>
            <option value="name-desc">{{ t('Name Z→A', 'Tên Z→A', 'ชื่อ Z→A') }}</option>
            <option value="credits-asc">{{ t('Credits ↑', 'Credits ↑', 'เครดิต ↑') }}</option>
            <option value="credits-desc">{{ t('Credits ↓', 'Credits ↓', 'เครดิต ↓') }}</option>
          </select>
          <div class="or-view-toggle" role="group">
            <button
              type="button"
              :class="{ active: viewMode === 'list' }"
              :title="t('List', 'Danh sách', 'รายการ')"
              @click="viewMode = 'list'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="5" width="16" height="2" rx="1"/><rect x="4" y="11" width="16" height="2" rx="1"/><rect x="4" y="17" width="16" height="2" rx="1"/></svg>
            </button>
            <button
              type="button"
              :class="{ active: viewMode === 'table' }"
              :title="t('Table', 'Bảng', 'ตาราง')"
              @click="viewMode = 'table'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
            </button>
          </div>
        </div>

        <nav class="or-tabs" role="tablist">
          <button
            v-for="tab in CATALOG_TABS"
            :key="tab.id"
            type="button"
            role="tab"
            class="or-tab"
            :class="{ active: activeTab === tab.id }"
            :aria-selected="activeTab === tab.id"
            @click="setTab(tab.id)"
          >
            {{ tabLabel(tab.id) }}
            <span class="or-tab-count">{{ tabCounts[tab.id] ?? 0 }}</span>
          </button>
        </nav>
      </div>

      <p v-if="error" class="or-status or-status-err">{{ error }}</p>
      <p v-else-if="loading && !filtered.length" class="or-status">{{ t('Loading…', 'Đang tải…', 'กำลังโหลด…') }}</p>

      <div v-if="viewMode === 'list' && filtered.length" class="or-list">
        <article v-for="m in filtered" :key="m.slug" class="or-row">
          <div class="or-row-inner">
            <span class="or-provider-avatar" :title="m.provider || undefined">{{
              providerInitials(m.provider || m.slug)
            }}</span>
            <div class="or-row-body">
              <div class="or-row-head">
                <h2 class="or-row-title">{{ m.name }}</h2>
                <span v-if="relativeTime(m)" class="or-row-time">{{ relativeTime(m) }}</span>
              </div>
              <p v-if="displayDescription(m)" class="or-row-desc">{{ displayDescription(m) }}</p>
              <p v-else class="or-row-desc or-muted">
                {{ t('No description in catalog.', 'Không có mô tả trong catalog.', 'ไม่มีคำอธิบายในแคตตาล็อก') }}
              </p>
              <div class="or-row-tags">
                <span v-for="tag in modelTags(m, catalogLang)" :key="tag" class="or-tag">{{ tag }}</span>
              </div>
              <div class="or-row-meta">
                <span class="or-row-price">{{ m.creditsLabel }}</span>
                <span v-if="m.provider" class="or-row-provider">{{ m.provider }}</span>
                <code class="or-row-slug">{{ m.slug }}</code>
                <span class="or-row-actions">
                  <a
                    :href="playgroundUrl(m, localePrefix)"
                    target="_blank"
                    rel="noopener"
                    class="or-link"
                    @click.stop
                  >{{ t('Playground', 'Playground', 'สนามทดลอง') }}</a>
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="viewMode === 'table' && filtered.length" class="or-table-wrap">
        <table class="or-table">
          <thead>
            <tr>
              <th>{{ t('Model', 'Model', 'โมเดล') }}</th>
              <th>{{ t('Type', 'Loại', 'ประเภท') }}</th>
              <th>{{ t('Provider', 'Provider', 'ผู้ให้บริการ') }}</th>
              <th>{{ t('Credits', 'Credits', 'เครดิต') }}</th>
              <th>{{ t('Playground', 'Playground', 'สนามทดลอง') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.slug">
              <td>
                <div class="or-table-model">
                  <span class="or-provider-avatar or-provider-avatar--sm">{{
                    providerInitials(m.provider || m.slug)
                  }}</span>
                  <div>
                    <strong>{{ m.name }}</strong>
                    <code class="or-table-slug">{{ m.slug }}</code>
                  </div>
                </div>
              </td>
              <td><span class="or-tag">{{ catalogJobTypeLabel(m.jobType, catalogLang) }}</span></td>
              <td>{{ m.provider || '—' }}</td>
              <td>{{ m.creditsLabel }}</td>
              <td>
                <a
                  :href="playgroundUrl(m, localePrefix)"
                  target="_blank"
                  rel="noopener"
                  class="or-link"
                >{{ t('Open', 'Mở', 'เปิด') }}</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading && !filtered.length" class="or-empty">
        <p>{{ t('No models found.', 'Không có model.', 'ไม่พบโมเดล') }}</p>
        <p class="or-muted"><code>npm run dev</code> → gateway <code>:3001</code></p>
        <button v-if="hasActiveFilters" type="button" class="or-link" @click="clearFilters">
          {{ t('Clear filters', 'Xóa bộ lọc', 'ล้างตัวกรอง') }}
        </button>
      </div>
    </div>
  </div>
</template>
