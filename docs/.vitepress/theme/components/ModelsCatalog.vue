<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useData } from 'vitepress';
import FilterCheckList from './FilterCheckList.vue';
import SidebarIcon from './SidebarIcon.vue';
import {
  CATALOG_TABS,
  INPUT_MODALITIES,
  catalogCreditRange,
  catalogProviders,
  catalogUniqueValues,
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

const { lang } = useData();
const isVi = computed(() => lang.value === 'vi-VN');
const localePrefix = computed((): '' | '/vi' => (isVi.value ? '/vi' : ''));

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
      const desc = modelDescription(m, isVi.value);
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

const guideLink = computed(() => (isVi.value ? '/vi/models/guide' : '/models/guide'));
const compareLink = computed(() => (isVi.value ? '/vi/models/compare/' : '/models/compare/'));
const catalogLang = computed((): CatalogLang | undefined => (isVi.value ? 'vi' : 'en'));

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
  return formatRelativeTime(m.sortDate, isVi.value);
}

function displayDescription(m: CatalogModel): string {
  return modelDescription(m, isVi.value);
}

function formatCredits(n: number): string {
  return n.toLocaleString();
}

onMounted(() => {
  void loadCatalog();
});

watch(isVi, () => {
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
      aria-label="Filters"
    >
      <div class="or-sidebar-head">
        <span>{{ isVi ? 'Bộ lọc' : 'Filters' }}</span>
        <button type="button" class="or-sidebar-close" @click="mobileFilters = false">×</button>
      </div>

      <details class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="modalities" />
            {{ isVi ? 'Input modalities' : 'Input modalities' }}
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
            <span>{{ mod.label }}</span>
          </label>
        </div>
      </details>

      <details class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="categories" />
            {{ isVi ? 'Categories' : 'Categories' }}
          </span>
        </summary>
        <div class="or-filter-body or-filter-body--indent">
          <label v-for="g in ['all', 'media', 'tools'] as const" :key="g" class="or-check or-check--plain">
            <input v-model="filterGroup" type="radio" name="or-group" :value="g" />
            <span>{{
              g === 'all' ? (isVi ? 'Tất cả' : 'All') : g === 'media' ? 'Media' : 'Tools'
            }}</span>
          </label>
        </div>
      </details>

      <details v-if="hasParamFacets" class="or-filter-section" open>
        <summary>
          <span class="or-section-label">
            <SidebarIcon name="params" />
            {{ isVi ? 'Supported parameters' : 'Supported parameters' }}
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
            {{ isVi ? 'Credits pricing' : 'Credits pricing' }}
          </span>
        </summary>
        <div class="or-filter-body or-credits-filter">
          <div class="or-credits-labels">
            <span>{{ isVi ? 'Free' : 'Free' }}</span>
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
            Providers
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
        {{ isVi ? 'Xóa bộ lọc' : 'Clear filters' }}
      </button>
    </aside>

    <div v-if="mobileFilters" class="or-sidebar-backdrop" @click="mobileFilters = false" />

    <div class="or-main">
      <header class="or-page-header">
        <h1 class="or-title">Models</h1>
        <div class="or-page-header-links">
          <a :href="compareLink" class="or-docs-link">{{ isVi ? 'So sánh' : 'Compare' }}</a>
          <a :href="guideLink" class="or-docs-link">Docs</a>
        </div>
      </header>

      <div class="or-sticky-head">
        <div class="or-toolbar">
          <button
            type="button"
            class="or-filter-toggle"
            aria-label="Filters"
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
              placeholder="Search models…"
            />
          </div>
          <select v-model="sort" class="or-select" aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="credits-asc">Credits ↑</option>
            <option value="credits-desc">Credits ↓</option>
          </select>
          <div class="or-view-toggle" role="group">
            <button
              type="button"
              :class="{ active: viewMode === 'list' }"
              title="List"
              @click="viewMode = 'list'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="5" width="16" height="2" rx="1"/><rect x="4" y="11" width="16" height="2" rx="1"/><rect x="4" y="17" width="16" height="2" rx="1"/></svg>
            </button>
            <button
              type="button"
              :class="{ active: viewMode === 'table' }"
              title="Table"
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
            {{ tab.label }}
            <span class="or-tab-count">{{ tabCounts[tab.id] ?? 0 }}</span>
          </button>
        </nav>
      </div>

      <p v-if="error" class="or-status or-status-err">{{ error }}</p>
      <p v-else-if="loading && !filtered.length" class="or-status">Loading…</p>

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
                {{ isVi ? 'Không có mô tả trong catalog.' : 'No description in catalog.' }}
              </p>
              <div class="or-row-tags">
                <span v-for="tag in modelTags(m)" :key="tag" class="or-tag">{{ tag }}</span>
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
                  >Playground</a>
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
              <th>Model</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Credits</th>
              <th>Playground</th>
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
              <td><span class="or-tag">{{ m.jobType }}</span></td>
              <td>{{ m.provider || '—' }}</td>
              <td>{{ m.creditsLabel }}</td>
              <td>
                <a
                  :href="playgroundUrl(m, localePrefix)"
                  target="_blank"
                  rel="noopener"
                  class="or-link"
                >Open</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading && !filtered.length" class="or-empty">
        <p>No models found.</p>
        <p class="or-muted"><code>npm run dev</code> → gateway <code>:3001</code></p>
        <button v-if="hasActiveFilters" type="button" class="or-link" @click="clearFilters">
          Clear filters
        </button>
      </div>
    </div>
  </div>
</template>
