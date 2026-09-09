const STORAGE_BASE = 'portal_base_url';
const STORAGE_TOKEN = 'portal_access_token';
const STORAGE_MODELS_PREFIX = 'portal_models_';
const STORAGE_MODELS_LEGACY = 'portal_last_models';
const STORAGE_DOMAIN = 'portal_login_domain';
const STORAGE_CHAT_SESSION = 'portal_chat_session';
const STORAGE_VOICES = 'portal_last_voices';
const STORAGE_DEVICE_ID = 'gw_device_id';
const STORAGE_LAST_MODEL = 'pg_last_model_';
const STORAGE_RESPONSE_TAB = 'portal_response_tab';
const PREFETCH_JOB_TYPES = { image: 'video', video: 'image' };
const RESPONSE_TABS = new Set(['request', 'result', 'endpoints', 'guide', 'skill']);
const DEFAULT_API = 'http://localhost:3001';

const $ = (id) => document.getElementById(id);

function pgT(key, fallback) {
  return globalThis.PortalI18n?.t(key, fallback) ?? fallback ?? key;
}

function pgLocale() {
  return globalThis.PortalI18n?.getLocale() || 'en';
}

function workerIconHtml(name) {
  if (typeof globalThis.workerIconSvg === 'function') return globalThis.workerIconSvg(name);
  return '';
}

const tokenEl = $('token');
const docsNav = $('docs-nav');
const openapiNav = $('openapi-nav');
const responseOutput = $('responseOutput');
const responseMeta = $('responseMeta');
const resultPreview = $('resultPreview');
const resultEmpty = $('resultEmpty');
const responsePaneResult = $('responsePaneResult');

function readSavedResponseTab() {
  try {
    const saved = sessionStorage.getItem(STORAGE_RESPONSE_TAB);
    if (saved && RESPONSE_TABS.has(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'result';
}

let activeResponseTab = readSavedResponseTab();
let playgroundBooting = true;
const resultLink = $('resultLink');
const resultImage = $('resultImage');
const resultVideo = $('resultVideo');
const resultAudio = $('resultAudio');
const tokenBadge = $('tokenBadge');

const docsUrl =
  localStorage.getItem('portal_docs_url') ||
  (location.hostname === 'localhost' ? 'http://localhost:5173' : '/');

docsNav.href = docsUrl;
openapiNav.href = `${docsUrl.replace(/\/$/, '')}/reference/openapi`;
const logoLink = $('logo-link');
if (logoLink) logoLink.href = docsUrl;

function defaultBaseUrl() {
  if (globalThis.PortalGatewayConfig?.resolveBaseUrl) {
    return globalThis.PortalGatewayConfig.resolveBaseUrl();
  }
  const saved = localStorage.getItem(STORAGE_BASE);
  if (saved) return saved.replace(/\/$/, '');
  const origin = window.location.origin.replace(/\/$/, '');
  const port = window.location.port;
  if (port === '5173' || port === '3001') return origin;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return DEFAULT_API;
  }
  return origin;
}

migrateLegacyModelsStorage();

tokenEl.value = sessionStorage.getItem(STORAGE_TOKEN) || '';
$('loginDomain').value = localStorage.getItem(STORAGE_DOMAIN) || '79ai.net';
if ($('chatSessionId')) {
  $('chatSessionId').value = sessionStorage.getItem(STORAGE_CHAT_SESSION) || '';
}

updateTokenBadge();

function saveToken(value) {
  const t = (value ?? tokenEl.value).trim();
  tokenEl.value = t;
  if (t) sessionStorage.setItem(STORAGE_TOKEN, t);
  else sessionStorage.removeItem(STORAGE_TOKEN);
  updateTokenBadge();
}

tokenEl.addEventListener('input', () => saveToken());

$('loginDomain').addEventListener('change', () => {
  localStorage.setItem(STORAGE_DOMAIN, $('loginDomain').value.trim());
});

function updateTokenBadge() {
  const t = tokenEl.value.trim();
  if (!tokenBadge) return;
  if (t) {
    const tail = t.length > 8 ? `…${t.slice(-6)}` : '••••';
    tokenBadge.textContent = `${pgT('token.saved')} (${tail})`;
    tokenBadge.className = 'pg-token-badge ok';
  } else {
    tokenBadge.textContent = pgT('token.none');
    tokenBadge.className = 'pg-token-badge';
  }
}

const urlParams = new URLSearchParams(window.location.search);
const inPlaygroundIframe = window.self !== window.top;
const forceDevPlayground = urlParams.get('dev') === '1';
const isEmbed =
  !forceDevPlayground &&
  (urlParams.get('embed') === '1' ||
    (inPlaygroundIframe && urlParams.get('embed') !== '0'));

const EMBED_PARENT_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

const embedParentParam = urlParams.get('parentOrigin')?.trim();
if (isEmbed && embedParentParam) {
  try {
    const u = new URL(embedParentParam);
    const ok =
      u.protocol === 'https:' ||
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1';
    if (ok) EMBED_PARENT_ORIGINS.add(u.origin);
  } catch {
    /* ignore */
  }
}

function isAllowedEmbedParent(origin) {
  if (!origin) return false;
  if (EMBED_PARENT_ORIGINS.has(origin)) return true;
  if (origin === window.location.origin) return true;
  try {
    const u = new URL(origin);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

let pendingDeepLink = null;

const EMBED_WORKER_SECTIONS = [
  {
    sectionKey: 'worker.section.create',
    items: [
      { id: 'create-image', icon: 'image', labelKey: 'worker.create.image', kind: 'media-job', jobType: 'image' },
      { id: 'create-video', icon: 'video', labelKey: 'worker.create.video', kind: 'media-job', jobType: 'video' },
      { id: 'create-tts', icon: 'mic', labelKey: 'worker.create.tts', kind: 'media-job', jobType: 'tts' },
      { id: 'create-music', icon: 'music', labelKey: 'worker.create.music', kind: 'media-job', jobType: 'music' },
      { id: 'create-avatar', icon: 'bot', labelKey: 'worker.create.avatar', kind: 'media-job', jobType: 'avatar-lipsync' },
    ],
  },
  {
    sectionKey: 'worker.section.tools',
    items: [
      { id: 'tool-image-upscale', icon: 'arrow-up', labelKey: 'worker.tool.image-upscale', kind: 'media-job', jobType: 'image-upscale' },
      { id: 'tool-remove-bg', icon: 'scissors', labelKey: 'worker.tool.remove-bg', kind: 'media-job', jobType: 'remove-bg' },
      { id: 'tool-video-upscale', icon: 'arrow-up', labelKey: 'worker.tool.video-upscale', kind: 'media-job', jobType: 'video-upscale' },
      { id: 'tool-video-vfx', icon: 'sparkles', labelKey: 'worker.tool.video-vfx', kind: 'media-job', jobType: 'video-vfx' },
      { id: 'tool-video-subtitle', icon: 'subtitles', labelKey: 'worker.tool.video-subtitle', kind: 'media-job', jobType: 'video-subtitle' },
      { id: 'tool-video-cut', icon: 'scissors', labelKey: 'worker.tool.video-cut', kind: 'media-job', jobType: 'video-cut' },
    ],
  },
  {
    sectionKey: 'worker.section.upload',
    items: [
      { id: 'upload-image', icon: 'upload', labelKey: 'worker.upload.image', kind: 'upload', uploadTab: 'image' },
      { id: 'upload-video', icon: 'upload', labelKey: 'worker.upload.video', kind: 'upload', uploadTab: 'video' },
    ],
  },
  {
    sectionKey: 'worker.section.status',
    items: [
      { id: 'info-image', icon: 'file-text', labelKey: 'worker.status.infoImage', kind: 'info', infoKind: 'image' },
      { id: 'info-video', icon: 'file-text', labelKey: 'worker.status.infoVideo', kind: 'info', infoKind: 'video' },
      { id: 'info-music', icon: 'file-text', labelKey: 'worker.status.infoMusic', kind: 'info', infoKind: 'music' },
    ],
  },
  {
    sectionKey: 'worker.section.library',
    items: [
      { id: 'library-images', icon: 'image', labelKey: 'worker.library.images', kind: 'library', libraryKind: 'images' },
      { id: 'library-videos', icon: 'video', labelKey: 'worker.library.videos', kind: 'library', libraryKind: 'videos' },
      { id: 'library-musics', icon: 'music', labelKey: 'worker.library.musics', kind: 'library', libraryKind: 'musics' },
      { id: 'library-audios', icon: 'mic', labelKey: 'worker.library.audios', kind: 'library', libraryKind: 'audios' },
      { id: 'library-album-videos', icon: 'folder', labelKey: 'worker.library.albumVideos', kind: 'library', libraryKind: 'album-videos' },
    ],
  },
  {
    sectionKey: 'worker.section.system',
    items: [
      { id: 'list-models', icon: 'server', labelKey: 'worker.system.models', kind: 'panel', panel: 'models' },
      { id: 'health', icon: 'zap', labelKey: 'worker.system.health', kind: 'panel', panel: 'health' },
    ],
  },
  {
    sectionKey: 'worker.section.platform',
    items: [
      { id: 'chat', icon: 'message', labelKey: 'worker.platform.chat', kind: 'panel', panel: 'chat' },
      { id: 'audio-tts', icon: 'volume', labelKey: 'worker.platform.audio', kind: 'panel', panel: 'audio' },
      { id: 'audio-lists', icon: 'list', labelKey: 'worker.platform.audioLists', kind: 'panel', panel: 'audio-lists' },
    ],
  },
];

const EMBED_WORKER_BY_ID = new Map();
for (const section of EMBED_WORKER_SECTIONS) {
  for (const item of section.items) EMBED_WORKER_BY_ID.set(item.id, item);
}

let activeEmbedWorkerId = 'create-image';
let embedMenuOpen = null;
let activeInfoKind = 'image';
let activeLibraryKind = 'images';
let workerMenuFilter = '';
let workerMenuFocusIndex = -1;
let modelMenuFilter = '';
/** @type {Map<string, string>} */
const mediaInputValues = new Map();
let activeCatalogModel = null;

const INFO_CONFIGS = {
  image: {
    titleKey: 'worker.status.infoImage',
    endpointTemplate: 'POST /ai/info/image/{id}',
    idLabelKey: 'proxy.info.idBase',
    idPlaceholderKey: 'proxy.info.idBase',
    formIdKey: 'id_base',
    media: 'image',
    showProject: false,
  },
  video: {
    titleKey: 'worker.status.infoVideo',
    endpointTemplate: 'POST /ai/info/video/{id}',
    idLabelKey: 'proxy.info.videoId',
    idPlaceholderKey: 'proxy.info.videoId',
    formIdKey: 'video_id',
    media: 'video',
    showProject: false,
  },
  music: {
    titleKey: 'worker.status.infoMusic',
    endpointTemplate: 'POST /ai/info/music/{id}',
    idLabelKey: 'proxy.info.idBase',
    idPlaceholderKey: 'proxy.info.idBase',
    formIdKey: 'id_base',
    media: 'music',
    showProject: true,
  },
};

const LIBRARY_CONFIGS = {
  images: {
    titleKey: 'worker.library.images',
    path: '/ai/library/images',
    showModel: true,
    showCategory: true,
    showSource: true,
    showProject: false,
  },
  videos: {
    titleKey: 'worker.library.videos',
    path: '/ai/library/videos',
    showModel: true,
    showCategory: false,
    showSource: false,
    showProject: false,
  },
  musics: {
    titleKey: 'worker.library.musics',
    path: '/ai/library/musics',
    showModel: false,
    showCategory: false,
    showSource: false,
    showProject: true,
  },
  audios: {
    titleKey: 'worker.library.audios',
    path: '/ai/library/audios',
    showModel: false,
    showCategory: false,
    showSource: false,
    showProject: false,
  },
  'album-videos': {
    titleKey: 'worker.library.albumVideos',
    path: '/ai/library/album-videos',
    showModel: true,
    showCategory: false,
    showSource: false,
    showProject: false,
  },
};

function workerItemLabel(item) {
  return pgT(item.labelKey, item.labelKey);
}

function workerUsesModelPicker(workerId) {
  const item = EMBED_WORKER_BY_ID.get(workerId);
  return item?.kind === 'media-job';
}

function listWorkerMenuItems() {
  const filter = workerMenuFilter.trim().toLowerCase();
  const out = [];
  for (const section of EMBED_WORKER_SECTIONS) {
    for (const item of section.items) {
      const label = workerItemLabel(item).toLowerCase();
      const hay = `${label} ${item.id} ${pgT(section.sectionKey, section.sectionKey)}`.toLowerCase();
      if (filter && !hay.includes(filter)) continue;
      out.push({ section, item });
    }
  }
  return out;
}

function renderEmbedWorkerMenu() {
  const menu = $('embedWorkerMenu');
  if (!menu) return;

  const filter = workerMenuFilter.trim();
  const searchPh = escapeHtml(pgT('worker.search', 'Search workers…'));
  const searchVal = escapeHtml(workerMenuFilter);
  const searchHtml = `<div class="pg-worker-menu-search-wrap">
    <input type="search" class="pg-worker-menu-search" id="embedWorkerSearch" placeholder="${searchPh}" value="${searchVal}" autocomplete="off" aria-label="${searchPh}" />
  </div>`;

  const visible = listWorkerMenuItems();
  if (!visible.length) {
    menu.innerHTML = `${searchHtml}<p class="pg-worker-menu-empty">${escapeHtml(pgT('worker.searchEmpty', 'No matching workers'))}</p>`;
    wireWorkerMenuSearch();
    return;
  }

  let lastSectionKey = '';
  const sectionsHtml = visible
    .map(({ section, item }) => {
      let heading = '';
      if (section.sectionKey !== lastSectionKey) {
        lastSectionKey = section.sectionKey;
        heading = `<p class="pg-worker-menu-heading">${escapeHtml(pgT(section.sectionKey, section.sectionKey))}</p>`;
      }
      const active = item.id === activeEmbedWorkerId;
      const label = escapeHtml(workerItemLabel(item));
      const btn = `<button type="button" class="pg-worker-menu-item${active ? ' active' : ''}" role="option" data-worker-id="${item.id}" aria-selected="${active}">
          <span class="pg-worker-menu-item-icon" aria-hidden="true">${workerIconHtml(item.icon)}</span>
          <span class="pg-worker-menu-item-text">${label}</span>
        </button>`;
      return `${heading}${btn}`;
    })
    .join('');

  menu.innerHTML = `${searchHtml}<div class="pg-worker-menu-section">${sectionsHtml}</div>`;
  wireWorkerMenuSearch();
  focusWorkerMenuItem(workerMenuFocusIndex);
}

function wireWorkerMenuSearch() {
  const input = $('embedWorkerSearch');
  if (!input || input.dataset.wired) return;
  input.dataset.wired = '1';
  input.addEventListener('input', () => {
    workerMenuFilter = input.value;
    workerMenuFocusIndex = 0;
    renderEmbedWorkerMenu();
    $('embedWorkerSearch')?.focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveWorkerMenuFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveWorkerMenuFocus(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activateFocusedWorkerMenuItem();
    } else if (e.key === 'Escape') {
      closeEmbedMenus();
    }
  });
}

function workerMenuButtons() {
  return [...($('embedWorkerMenu')?.querySelectorAll('.pg-worker-menu-item') || [])];
}

function moveWorkerMenuFocus(delta) {
  const buttons = workerMenuButtons();
  if (!buttons.length) return;
  if (workerMenuFocusIndex < 0) workerMenuFocusIndex = 0;
  else workerMenuFocusIndex = (workerMenuFocusIndex + delta + buttons.length) % buttons.length;
  focusWorkerMenuItem(workerMenuFocusIndex);
}

function focusWorkerMenuItem(index) {
  const buttons = workerMenuButtons();
  buttons.forEach((btn, i) => btn.classList.toggle('is-focused', i === index));
  const el = buttons[index];
  if (el) {
    workerMenuFocusIndex = index;
    el.focus();
  }
}

function activateFocusedWorkerMenuItem() {
  const buttons = workerMenuButtons();
  const btn = buttons[workerMenuFocusIndex] || buttons[0];
  if (!btn) return;
  void navigateEmbedWorker(btn.dataset.workerId);
}

function syncWorkerToUrl() {
  if (!isEmbed) return;
  const params = new URLSearchParams(window.location.search);
  params.set('embed', '1');
  params.delete('type');
  params.delete('panel');

  if (activeEmbedWorkerId) params.set('worker', activeEmbedWorkerId);
  else params.delete('worker');

  if (workerUsesModelPicker(activeEmbedWorkerId)) {
    const model = $('mediaModelSelect')?.value?.trim();
    if (model) params.set('model', model);
    else params.delete('model');
  } else {
    params.delete('model');
  }

  const parentOrigin = params.get('parentOrigin');
  const qs = params.toString();
  const next = `${window.location.pathname}?${qs}`;
  history.replaceState(null, '', next);

  const payload = {
    type: 'ai-gateway-playground-nav',
    worker: activeEmbedWorkerId,
    model: params.get('model') || undefined,
  };
  for (const origin of EMBED_PARENT_ORIGINS) {
    try {
      window.parent.postMessage(payload, origin);
    } catch {
      /* ignore */
    }
  }
  if (parentOrigin) {
    try {
      window.parent.postMessage(payload, parentOrigin);
    } catch {
      /* ignore */
    }
  }
}


function inferEmbedWorkerId() {
  if ($('panel-connection')?.classList.contains('active')) return null;

  const activePanel = document.querySelector('.pg-panel.active')?.dataset.panel;
  if (activePanel === 'media-job') {
    const jobType = $('jobType')?.value || 'image';
    if (jobType === 'avatar-lipsync') return 'create-avatar';
    if (['image', 'video', 'music', 'tts'].includes(jobType)) return `create-${jobType}`;
    const toolItem = EMBED_WORKER_BY_ID.get(`tool-${jobType}`);
    if (toolItem) return toolItem.id;
    return activeEmbedWorkerId;
  }
  if (activePanel === 'upload') {
    return $('upload-video')?.classList.contains('active') ? 'upload-video' : 'upload-image';
  }
  if (activePanel === 'info-job') {
    return `info-${activeInfoKind}`;
  }
  if (activePanel === 'library') {
    return `library-${activeLibraryKind}`;
  }
  const panelMap = {
    'poll-job': 'poll-job',
    models: 'list-models',
    health: 'health',
    chat: 'chat',
    audio: 'audio-tts',
    'audio-lists': 'audio-lists',
  };
  return panelMap[activePanel] || activeEmbedWorkerId;
}

function updateEmbedWorkerTrigger() {
  const onConnection = $('panel-connection')?.classList.contains('active');
  const labelEl = $('embedWorkerLabel');
  const iconEl = $('embedWorkerIcon');
  const inferred = inferEmbedWorkerId();
  if (inferred) activeEmbedWorkerId = inferred;

  const item = onConnection ? null : EMBED_WORKER_BY_ID.get(activeEmbedWorkerId);
  if (labelEl) {
    labelEl.textContent = onConnection
      ? pgT('embed.connection')
      : item
        ? workerItemLabel(item)
        : MEDIA_JOB_SHORT[$('jobType')?.value] || 'Image';
  }
  if (iconEl) iconEl.innerHTML = onConnection ? workerIconHtml('settings') : workerIconHtml(item?.icon || 'box');
}

function modelMenuPriceLabel(modelObj) {
  if (!modelObj?.raw && !modelObj?.creditsLabel) return '';
  if (globalThis.ModelPricing?.parseModelPrices && modelObj.raw) {
    const parsed = globalThis.ModelPricing.parseModelPrices(modelObj.raw);
    if (parsed.rows.length) {
      const price = globalThis.ModelPricing.resolvePrice(parsed.rows, readCatalogFieldValues());
      if (price != null) return globalThis.ModelPricing.formatCredits(price, pgLocale());
    }
    const fb = globalThis.ModelPricing.fallbackPrice(modelObj.raw);
    if (fb != null) return globalThis.ModelPricing.formatCredits(fb, pgLocale());
  }
  if (modelObj.creditsLabel && modelObj.creditsLabel !== '—') {
    return formatSendPriceLabel(modelObj.creditsLabel) || modelObj.creditsLabel;
  }
  return '';
}

function listEmbedModelOptions() {
  const type = $('jobType')?.value || 'image';
  const envelope = getStoredModelsEnvelope(type);
  let models = normalizeModels(envelope);
  const filter = modelMenuFilter.trim().toLowerCase();
  if (filter) {
    models = models.filter((m) => {
      const hay = `${m.name} ${m.slug} ${m.creditsLabel || ''}`.toLowerCase();
      return hay.includes(filter);
    });
  }
  models.sort((a, b) => {
    const ca = a.credits ?? Number.MAX_SAFE_INTEGER;
    const cb = b.credits ?? Number.MAX_SAFE_INTEGER;
    return ca - cb;
  });
  return models;
}

function renderEmbedModelMenu() {
  const menu = $('embedModelMenu');
  if (!menu) return;

  const searchPh = escapeHtml(pgT('embed.modelSearch', 'Search models…'));
  const searchVal = escapeHtml(modelMenuFilter);
  const searchHtml = `<div class="pg-worker-menu-search-wrap">
    <input type="search" class="pg-worker-menu-search" id="embedModelSearch" placeholder="${searchPh}" value="${searchVal}" autocomplete="off" aria-label="${searchPh}" />
  </div>`;

  const models = listEmbedModelOptions();
  const current = $('mediaModelSelect')?.value || '';

  if (!models.length) {
    menu.innerHTML = `${searchHtml}<p class="pg-worker-menu-empty">${escapeHtml(pgT('embed.modelSearchEmpty', 'No matching models'))}</p>`;
    wireModelMenuSearch();
    return;
  }

  menu.innerHTML =
    searchHtml +
    models
      .map((m) => {
        const active = m.slug === current;
        const price = escapeHtml(modelMenuPriceLabel(m));
        const priceHtml = price ? `<span class="pg-model-menu-price">${price}</span>` : '';
        return `<button type="button" class="pg-worker-menu-item pg-model-menu-item${active ? ' active' : ''}" role="option" data-model-slug="${escapeHtml(m.slug)}" aria-selected="${active}">
          <span class="pg-worker-menu-item-text">${escapeHtml(m.name)}</span>
          ${priceHtml}
        </button>`;
      })
      .join('');
  wireModelMenuSearch();
}

function wireModelMenuSearch() {
  const input = $('embedModelSearch');
  if (!input || input.dataset.wired) return;
  input.dataset.wired = '1';
  input.addEventListener('input', () => {
    modelMenuFilter = input.value;
    renderEmbedModelMenu();
    $('embedModelSearch')?.focus();
  });
}

function syncEmbedModelPicker(model) {
  const wrap = $('embedModelPicker');
  const menu = $('embedModelMenu');
  const labelEl = $('embedModelLabel');
  if (!wrap || !menu || !labelEl) return;

  const onMediaJob = $('panel-media-job')?.classList.contains('active');
  const onConnection = $('panel-connection')?.classList.contains('active');
  if (!onMediaJob || onConnection) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  if (embedMenuOpen === 'model') renderEmbedModelMenu();

  labelEl.textContent = model?.name || pgT('media.model', 'Model');
}

function syncEmbedTypeSegment() {
  if (!isEmbed) return;
  const seg = $('embedTypeSegment');
  if (!seg) return;

  const onConnection = $('panel-connection')?.classList.contains('active');
  const onMedia = $('panel-media-job')?.classList.contains('active');
  const jobType = $('jobType')?.value || '';
  const showSegment = !onConnection && onMedia && (jobType === 'image' || jobType === 'video');

  seg.hidden = !showSegment;

  seg.querySelectorAll('[data-worker-id]').forEach((btn) => {
    const active = btn.dataset.workerId === activeEmbedWorkerId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const picker = $('embedWorkerPicker');
  if (picker) picker.hidden = showSegment || onConnection;

  seg.querySelectorAll('.pg-type-segment-icon').forEach((el) => {
    const btn = el.closest('[data-worker-id]');
    const id = btn?.dataset.workerId;
    if (id === 'create-image') el.innerHTML = workerIconHtml('image');
    else if (id === 'create-video') el.innerHTML = workerIconHtml('video');
  });
}

function lastModelStorageKey(type) {
  const loc = pgLocale() === 'en' ? '_en' : '';
  return `${STORAGE_LAST_MODEL}${type}${loc}`;
}

function saveLastModel(type, slug) {
  if (!type || !slug) return;
  try {
    localStorage.setItem(lastModelStorageKey(type), slug);
  } catch {
    /* ignore */
  }
}

function getLastModel(type) {
  try {
    return localStorage.getItem(lastModelStorageKey(type))?.trim() || '';
  } catch {
    return '';
  }
}

function prefetchAdjacentCatalog(type) {
  if (!isEmbed) return;
  const other = PREFETCH_JOB_TYPES[type];
  if (!other) return;
  const cached = normalizeModels(getStoredModelsEnvelope(other));
  if (cached.length) return;
  void fetchModelsForType(other, { statusEl: null }).catch(() => {});
}

function closeEmbedMenus() {
  const workerMenu = $('embedWorkerMenu');
  const modelMenu = $('embedModelMenu');
  const workerTrigger = $('embedWorkerTrigger');
  const modelTrigger = $('embedModelTrigger');
  if (workerMenu) workerMenu.hidden = true;
  if (modelMenu) modelMenu.hidden = true;
  workerTrigger?.setAttribute('aria-expanded', 'false');
  modelTrigger?.setAttribute('aria-expanded', 'false');
  embedMenuOpen = null;
}

function toggleEmbedMenu(which) {
  const workerMenu = $('embedWorkerMenu');
  const modelMenu = $('embedModelMenu');
  const workerTrigger = $('embedWorkerTrigger');
  const modelTrigger = $('embedModelTrigger');
  if (!workerMenu || !modelMenu) return;

  if (embedMenuOpen === which) {
    closeEmbedMenus();
    return;
  }

  closeEmbedMenus();
  embedMenuOpen = which;
  if (which === 'worker') {
    renderEmbedWorkerMenu();
    workerMenuFocusIndex = 0;
    workerMenu.hidden = false;
    workerTrigger?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      $('embedWorkerSearch')?.focus();
      focusWorkerMenuItem(0);
    });
  } else if (which === 'model') {
    renderEmbedModelMenu();
    modelMenu.hidden = false;
    modelTrigger?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => $('embedModelSearch')?.focus());
  }
}

async function navigateEmbedWorker(workerId) {
  const item = EMBED_WORKER_BY_ID.get(workerId);
  if (!item) return;
  activeEmbedWorkerId = workerId;
  workerMenuFilter = '';
  modelMenuFilter = '';
  closeEmbedMenus();

  if (item.kind === 'media-job') {
    await openMediaJobPanel(item.jobType);
    syncWorkerToUrl();
    return;
  }
  if (item.kind === 'info') {
    openInfoPanel(item.infoKind);
    syncWorkerToUrl();
    return;
  }
  if (item.kind === 'library') {
    openLibraryPanel(item.libraryKind);
    syncWorkerToUrl();
    return;
  }
  if (item.kind === 'upload') {
    openPanelById('upload');
    document.querySelector(`.pg-tab[data-upload-tab="${item.uploadTab}"]`)?.click();
    syncEmbedChromeFromState();
    syncWorkerToUrl();
    return;
  }
  if (item.kind === 'panel') {
    if (item.panel === 'health') {
      openHealthPanel();
      syncWorkerToUrl();
      return;
    }
    openPanelById(item.panel);
    syncEmbedChromeFromState();
    syncWorkerToUrl();
  }
}

function syncEmbedChromeFromState(model) {
  if (!isEmbed) return;
  if ($('panel-info-job')?.classList.contains('active')) configureInfoPanelUi(activeInfoKind);
  if ($('panel-library')?.classList.contains('active')) configureLibraryPanelUi(activeLibraryKind);
  updateEmbedWorkerTrigger();
  syncEmbedTypeSegment();
  renderEmbedWorkerMenu();
  syncEmbedModelPicker(model);
  updateModelMetaWorkerTheme($('jobType')?.value || 'image');
  const connBtn = $('btnEmbedConnection');
  const onConnection = $('panel-connection')?.classList.contains('active');
  connBtn?.classList.toggle('active', onConnection);
}

function applyEmbedChrome() {
  if (!isEmbed) return;
  document.body.classList.add('pg-embed', 'pg-studio');
}

function updateEmbedStudio(type, model) {
  if (!isEmbed) return;
  syncEmbedChromeFromState(model);
}

function formatSendPriceLabel(creditsLabel) {
  if (!creditsLabel || creditsLabel === '—') return '';
  const num = creditsLabel.match(/^([\d,.]+)/);
  if (num) return `${num[1].replace(/,/g, '')} cr`;
  return creditsLabel.replace(/\s*credits?\s*$/i, ' cr').trim();
}

function updateSendPriceLabel(model) {
  const el = $('sendPriceLabel');
  if (!el) return;
  let text = '';
  if (model?.raw && globalThis.ModelPricing?.parseModelPrices) {
    const parsed = globalThis.ModelPricing.parseModelPrices(model.raw);
    if (parsed.rows.length) {
      const price = globalThis.ModelPricing.resolvePrice(parsed.rows, readCatalogFieldValues());
      if (price != null) text = formatSendPriceLabel(globalThis.ModelPricing.formatCredits(price, pgLocale()));
    }
  }
  if (!text && model?.creditsLabel && model.creditsLabel !== '—') {
    text = isEmbed ? formatSendPriceLabel(model.creditsLabel) : model.creditsLabel;
  }
  if (!text) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  const changed = el.textContent !== text;
  el.hidden = false;
  el.textContent = text;
  if (changed && isEmbed) {
    el.classList.remove('pg-send-price--pulse');
    void el.offsetWidth;
    el.classList.add('pg-send-price--pulse');
  }
}

function initMediaSendChrome() {
  const iconEl = $('mediaSendIcon');
  if (iconEl && !iconEl.querySelector('svg')) {
    iconEl.innerHTML = workerIconHtml('send');
  }
}

function wireEmbedStudio() {
  if (!isEmbed) return;
  $('btnEmbedConnection')?.addEventListener('click', () => {
    const onConnection = $('panel-connection')?.classList.contains('active');
    if (onConnection) {
      void navigateEmbedWorker(activeEmbedWorkerId || 'create-image');
      return;
    }
    openPanelById('connection');
    syncEmbedChromeFromState();
  });
  $('btnEmbedDev')?.addEventListener('click', () => {
    const open = document.body.classList.toggle('pg-sidebar-open');
    $('btnEmbedDev')?.classList.toggle('active', open);
  });

  $('embedWorkerTrigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmbedMenu('worker');
  });
  $('embedWorkerMore')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmbedMenu('worker');
  });
  $('embedTypeSegment')?.querySelectorAll('[data-worker-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void navigateEmbedWorker(btn.dataset.workerId);
    });
  });
  $('embedModelTrigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmbedMenu('model');
  });
  $('embedWorkerMenu')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-worker-id]');
    if (!btn) return;
    void navigateEmbedWorker(btn.dataset.workerId);
  });
  $('embedWorkerMenu')?.addEventListener('keydown', (e) => {
    if (e.target.id === 'embedWorkerSearch') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveWorkerMenuFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveWorkerMenuFocus(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activateFocusedWorkerMenuItem();
    }
  });
  $('embedModelMenu')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-model-slug]');
    if (!btn || !$('mediaModelSelect')) return;
    $('mediaModelSelect').value = btn.dataset.modelSlug;
    onMediaModelChange();
    closeEmbedMenus();
  });

  document.addEventListener('click', (e) => {
    if (!embedMenuOpen) return;
    if (
      e.target.closest('#embedWorkerPicker') ||
      e.target.closest('#embedModelPicker') ||
      e.target.closest('#embedTypeSegment')
    ) {
      return;
    }
    closeEmbedMenus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEmbedMenus();
  });
  window.addEventListener('portal-locale-change', () => {
    syncEmbedChromeFromState();
  });
}

async function initEmbedStudio() {
  if (!isEmbed) return;
  initMediaSendChrome();
  wireEmbedStudio();
  syncEmbedTypeSegment();
  renderEmbedWorkerMenu();
  captureDeepLinkFromUrl();
  if (pendingDeepLink) {
    await runPendingDeepLink();
  } else {
    await openMediaJobPanel('image');
  }
  if (tokenEl?.value?.trim()) {
    try {
      await fetchUserMe(null, { silent: true });
    } catch {
      /* credits optional */
    }
  }
  syncWorkerToUrl();
}

function handleEmbedTokenMessage(event) {
  if (!isEmbed || !isAllowedEmbedParent(event.origin)) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'ai-gateway-locale') {
    const locale = data.locale || data.lang;
    if (locale && globalThis.PortalI18n) {
      PortalI18n.setLocale(locale);
      updateTokenBadge();
      renderAiGuidePanel();
      syncEmbedChromeFromState();
    }
    return;
  }
  if (data.type !== 'ai-gateway-token') return;
  const token = typeof data.token === 'string' ? data.token.trim() : '';
  if (!token) return;
  saveToken(token);
  if (data.domain && typeof data.domain === 'string') {
    const domain = data.domain.trim();
    if ($('loginDomain')) $('loginDomain').value = domain;
    localStorage.setItem(STORAGE_DOMAIN, domain);
  }
  void afterEmbedAuth();
}

async function afterEmbedAuth() {
  if (!isEmbed) return;
  await runPendingDeepLink();
  const onMedia = $('panel-media-job')?.classList.contains('active');
  if (!onMedia) {
    await navigateEmbedWorker(activeEmbedWorkerId || 'create-image');
    return;
  }
  const type = $('jobType')?.value || 'image';
  await loadMediaJobForType(type, { autoFetch: true });
}

if (isEmbed) {
  document.documentElement.classList.add('pg-embed-root');
  applyEmbedChrome();
  document.body?.classList.add('pg-booting');
  window.addEventListener('message', handleEmbedTokenMessage);
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(STORAGE_DEVICE_ID)?.trim();
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(STORAGE_DEVICE_ID, id);
  return id;
}

function loginDevicePayload() {
  const device_id = getOrCreateDeviceId();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browserName = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : 'Browser';
  const device_name = `${browserName} 1`;
  const device_info = JSON.stringify({
    device_id,
    device_name,
    device_type: 'desktop',
    language: 'vi',
  });
  return { device_id, device_name, device_info };
}

function appendDeviceToForm(form) {
  const device = loginDevicePayload();
  form.set('device_id', device.device_id);
  form.set('device_name', device.device_name);
  form.set('device_info', device.device_info);
}

function pickHttpUrl(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c.trim())) return c.trim();
  }
  return null;
}

function pickUrlFromMediaInfo(info) {
  if (!info || typeof info !== 'object') return null;
  return pickHttpUrl(
    info.result_url,
    info.file_url,
    info.url,
    info.download_url,
    info.thumbnail_url,
    info.music_url,
    info.audio_url,
  );
}

function pickUrlFromRaw(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return pickUrlFromMediaInfo(
    raw.imageInfo ||
      raw.videoInfo ||
      raw.musicInfo ||
      raw.audioInfo ||
      raw.ttsInfo,
  );
}

function baseUrl() {
  const v = defaultBaseUrl();
  if (!v) throw new Error('Gateway base URL unavailable');
  return v;
}

function getToken() {
  const t = tokenEl.value.trim();
  if (!t) throw new Error('Login or paste access_token first (Connection panel)');
  return t;
}

function authHeaders(json = true) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function buildGommoFormBody(fields = {}, { forPreview = false } = {}) {
  const body = new URLSearchParams();
  const token = tokenEl?.value?.trim();
  if (!forPreview && !token) {
    throw new Error('Login or paste access_token first (Connection panel)');
  }
  body.set('access_token', forPreview ? token || '<ACCESS_TOKEN>' : token);
  body.set('domain', $('loginDomain')?.value?.trim() || '79ai.net');
  if (!forPreview) appendDeviceToForm(body);
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) body.set(key, text);
  }
  return body;
}

async function apiFormPost(path, fields, label) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildGommoFormBody(fields).toString(),
  }, label);
}

function activateProxyNav(panel, matchFn) {
  document.querySelectorAll('.pg-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panel && matchFn(b));
  });
}

function configureInfoPanelUi(kind) {
  const cfg = INFO_CONFIGS[kind];
  if (!cfg) return;
  const title = $('infoJobTitle');
  const endpoint = $('infoJobEndpoint');
  const idLabel = $('infoJobIdLabel');
  const idInput = $('infoJobId');
  const projectWrap = $('infoProjectWrap');
  if (title) title.textContent = pgT(cfg.titleKey);
  if (endpoint) endpoint.textContent = cfg.endpointTemplate;
  if (idLabel) idLabel.textContent = pgT(cfg.idLabelKey);
  if (idInput) idInput.placeholder = pgT(cfg.idPlaceholderKey);
  if (projectWrap) projectWrap.hidden = !cfg.showProject;
}

function openInfoPanel(kind) {
  activeInfoKind = kind;
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === 'info-job');
  });
  activateProxyNav('info-job', (b) => b.dataset.infoKind === kind);
  configureInfoPanelUi(kind);
  refreshProxyPanelPreview();
  syncEmbedChromeFromState();
}

function configureLibraryPanelUi(kind) {
  const cfg = LIBRARY_CONFIGS[kind];
  if (!cfg) return;
  const title = $('libraryTitle');
  const endpoint = $('libraryEndpoint');
  if (title) title.textContent = pgT(cfg.titleKey);
  if (endpoint) endpoint.textContent = `POST ${cfg.path}`;
  const modelWrap = $('libModelWrap');
  const categoryWrap = $('libCategoryWrap');
  const sourceWrap = $('libSourceWrap');
  const projectWrap = $('libProjectWrap');
  if (modelWrap) modelWrap.hidden = !cfg.showModel;
  if (categoryWrap) categoryWrap.hidden = !cfg.showCategory;
  if (sourceWrap) sourceWrap.hidden = !cfg.showSource;
  if (projectWrap) projectWrap.hidden = !cfg.showProject;
}

function openLibraryPanel(kind) {
  activeLibraryKind = kind;
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === 'library');
  });
  activateProxyNav('library', (b) => b.dataset.libraryKind === kind);
  configureLibraryPanelUi(kind);
  refreshProxyPanelPreview();
  syncEmbedChromeFromState();
}

function openHealthPanel() {
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === 'health');
  });
  activateProxyNav('health', () => true);
  refreshProxyPanelPreview();
  syncEmbedChromeFromState();
}

function readLibraryFormFields() {
  const fields = {};
  const limit = $('libLimit')?.value?.trim();
  const afterId = $('libAfterId')?.value?.trim();
  const model = $('libModel')?.value?.trim();
  const category = $('libCategory')?.value?.trim();
  const source = $('libSource')?.value?.trim();
  const projectId = $('libProjectId')?.value?.trim();
  if (limit) fields.limit = limit;
  if (afterId) fields.after_id = afterId;
  if (model) fields.model = model;
  if (category) fields.category = category;
  if (source) fields.source = source;
  if (projectId) fields.project_id = projectId;
  return fields;
}

function extractFirstListMediaUrl(data) {
  const direct = pickUrlFromRaw(data) || pickUrlFromRaw(data?.data);
  if (direct) return direct;
  const root = data?.data;
  const lists = [];
  if (Array.isArray(root)) lists.push(root);
  else if (root && typeof root === 'object') {
    for (const key of ['items', 'data', 'images', 'videos', 'musics', 'audios', 'album_videos']) {
      if (Array.isArray(root[key])) lists.push(root[key]);
    }
  }
  for (const list of lists) {
    for (const item of list) {
      const url = pickUrlFromMediaInfo(item);
      if (url) return url;
    }
  }
  return null;
}

function previewBaseUrl() {
  try {
    return baseUrl();
  } catch {
    return window.location.origin.replace(/\/$/, '');
  }
}

function applyRequestPreview({ method, path, headers, body, curl }) {
  const methodEl = $('requestMethod');
  const endpointEl = $('requestEndpoint');
  const fullUrlEl = $('requestFullUrl');
  const headersRows = $('requestHeadersRows');
  const bodyRows = $('requestBodyRows');
  const bodyRawEl = $('requestBodyRaw');
  const curlEl = $('requestCurl');
  const url = `${previewBaseUrl()}${path}`;

  if (methodEl) methodEl.textContent = method;
  if (endpointEl) endpointEl.textContent = path;
  if (fullUrlEl) fullUrlEl.textContent = url;
  renderKvTableRows(
    headersRows,
    Object.entries(headers).map(([k, v]) => [k, v]),
  );
  if (typeof body === 'string') {
    renderKvTableRows(bodyRows, [['body', body]]);
    if (bodyRawEl) bodyRawEl.textContent = body;
  } else {
    renderKvTableRows(bodyRows, flattenRequestBodyRows(body));
    if (bodyRawEl) GwJsonHighlight?.setJsonPre(bodyRawEl, body);
  }
  if (curlEl) curlEl.textContent = curl;
  renderAiGuidePanel();
}

function buildInfoRequestPreview() {
  const cfg = INFO_CONFIGS[activeInfoKind];
  const id = $('infoJobId')?.value?.trim() || '{id}';
  const path = `/ai/info/${activeInfoKind}/${encodeURIComponent(id)}`;
  const fields = { [cfg.formIdKey]: id === '{id}' ? '' : id };
  if (cfg.showProject) {
    const projectId = $('infoProjectId')?.value?.trim();
    if (projectId) fields.project_id = projectId;
  }
  const body = buildGommoFormBody(fields, { forPreview: true });
  const token = tokenEl?.value?.trim();
  const tokenMask = token ? `${token.slice(0, 12)}…` : '<ACCESS_TOKEN>';
  return {
    method: 'POST',
    path,
    headers: {
      Authorization: `Bearer ${tokenMask}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    curl: `curl -X POST '${previewBaseUrl()}${path}' \\\n  -H 'Authorization: Bearer ${token || '<ACCESS_TOKEN>'}' \\\n  -H 'Content-Type: application/x-www-form-urlencoded' \\\n  -d '${body.toString()}'`,
  };
}

function buildLibraryRequestPreview() {
  const cfg = LIBRARY_CONFIGS[activeLibraryKind];
  const path = cfg.path;
  const fields = readLibraryFormFields();
  if (!fields.limit) fields.limit = $('libLimit')?.value?.trim() || '30';
  const body = buildGommoFormBody(fields, { forPreview: true });
  const token = tokenEl?.value?.trim();
  const tokenMask = token ? `${token.slice(0, 12)}…` : '<ACCESS_TOKEN>';
  return {
    method: 'POST',
    path,
    headers: {
      Authorization: `Bearer ${tokenMask}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    curl: `curl -X POST '${previewBaseUrl()}${path}' \\\n  -H 'Authorization: Bearer ${token || '<ACCESS_TOKEN>'}' \\\n  -H 'Content-Type: application/x-www-form-urlencoded' \\\n  -d '${body.toString()}'`,
  };
}

function buildHealthRequestPreview() {
  const path = '/health';
  return {
    method: 'GET',
    path,
    headers: { Accept: 'application/json' },
    body: {},
    curl: `curl '${previewBaseUrl()}${path}'`,
  };
}

function refreshProxyPanelPreview() {
  const panel = document.querySelector('.pg-panel.active')?.dataset.panel;
  if (panel === 'info-job') {
    applyRequestPreview(buildInfoRequestPreview());
    return;
  }
  if (panel === 'library') {
    applyRequestPreview(buildLibraryRequestPreview());
    return;
  }
  if (panel === 'health') {
    applyRequestPreview(buildHealthRequestPreview());
  }
}

async function runInfoJob() {
  const status = $('infoJobStatus');
  const cfg = INFO_CONFIGS[activeInfoKind];
  const id = $('infoJobId')?.value?.trim();
  if (!id) {
    setStatus(status, pgT('proxy.info.idBase') + ' required', false);
    return;
  }
  setStatus(status, 'Sending…', 'running');
  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }
  const fields = { [cfg.formIdKey]: id };
  if (cfg.showProject) {
    const projectId = $('infoProjectId')?.value?.trim();
    if (projectId) fields.project_id = projectId;
  }
  const path = `/ai/info/${activeInfoKind}/${encodeURIComponent(id)}`;
  try {
    const data = await apiFormPost(path, fields, cfg.endpointTemplate.replace('{id}', id));
    const resultUrl =
      extractPollResultUrl(data, cfg.media) ||
      pickUrlFromRaw(data) ||
      pickUrlFromRaw(data?.data);
    if (resultUrl) showResultUrl(resultUrl, cfg.media === 'music' ? 'music' : cfg.media);
    setStatus(status, resultUrl ? '' : 'OK — see RESPONSE', resultUrl ? 'preview' : 'ok');
  } catch (err) {
    setStatus(status, err.message, false);
  }
}

async function runLibraryList() {
  const status = $('libraryStatus');
  const cfg = LIBRARY_CONFIGS[activeLibraryKind];
  setStatus(status, 'Fetching…', 'running');
  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }
  const fields = readLibraryFormFields();
  if (!fields.limit) fields.limit = $('libLimit')?.value?.trim() || '30';
  try {
    const data = await apiFormPost(cfg.path, fields, `POST ${cfg.path}`);
    const resultUrl = extractFirstListMediaUrl(data);
    const media =
      activeLibraryKind === 'videos' || activeLibraryKind === 'album-videos'
        ? 'video'
        : activeLibraryKind === 'musics' || activeLibraryKind === 'audios'
          ? 'audio'
          : 'image';
    if (resultUrl) showResultUrl(resultUrl, media);
    setStatus(status, 'OK — see RESPONSE', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
}

async function runHealthCheck() {
  const status = $('healthStatus');
  setStatus(status, 'Checking…', 'running');
  try {
    await apiFetch('/health', { headers: { Accept: 'application/json' } }, 'GET /health');
    setStatus(status, 'OK — gateway is up', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
}

/** @param {HTMLElement | null} el
 *  @param {string} text
 *  @param {'neutral' | 'running' | 'ok' | 'err' | 'preview' | boolean} state */
function setStatus(el, text, state = 'neutral') {
  if (!el) return;
  if (typeof state === 'boolean') {
    state = state === true ? 'ok' : state === false ? 'err' : 'neutral';
  }
  if (!text && state === 'neutral') {
    el.className = 'pg-status-slot';
    el.replaceChildren();
    return;
  }

  const labels = {
    preview: '// COMPLETE',
    running: '// RUNNING',
    ok: '// OK',
    err: '// FAILED',
    neutral: '// INFO',
  };

  el.className = 'pg-status-slot';
  el.replaceChildren();

  const wrap = document.createElement('div');
  wrap.className = `pg-status pg-status--${state}`;

  const dot = document.createElement('span');
  dot.className = 'pg-status-dot';
  dot.setAttribute('aria-hidden', 'true');
  wrap.appendChild(dot);

  const label = document.createElement('span');
  label.className = 'pg-status-label';
  label.textContent = labels[state] || labels.neutral;
  wrap.appendChild(label);

  if (state === 'preview') {
    if (text) {
      const detail = document.createElement('span');
      detail.className = 'pg-status-detail';
      detail.textContent = text;
      wrap.appendChild(detail);
    }
  } else if (text) {
    const msg = document.createElement('span');
    msg.className = 'pg-status-text';
    msg.textContent = text;
    wrap.appendChild(msg);
  }

  el.appendChild(wrap);
}

function prettyJson(data) {
  return JSON.stringify(data, null, 2);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function flattenRequestBodyRows(body) {
  const rows = [];
  if (!body || typeof body !== 'object') return rows;
  if (body.modelSlug != null && body.modelSlug !== '') rows.push(['modelSlug', body.modelSlug]);
  if (body.wait != null) rows.push(['wait', String(body.wait)]);
  const fields = body.fields;
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    for (const [key, val] of Object.entries(fields)) {
      if (val == null || val === '') continue;
      rows.push([key, typeof val === 'object' ? JSON.stringify(val) : String(val)]);
    }
  }
  return rows;
}

function renderKvTableRows(tbody, entries) {
  if (!tbody) return;
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="2" class="pg-kv-empty">—</td></tr>';
    return;
  }
  tbody.innerHTML = entries
    .map(
      ([key, val]) =>
        `<tr><td class="pg-kv-key"><code>${escapeHtml(key)}</code></td><td class="pg-kv-val">${escapeHtml(val)}</td></tr>`,
    )
    .join('');
}

let requestBodyRawView = false;

function setRequestBodyView(raw) {
  requestBodyRawView = raw;
  const tableWrap = $('requestBodyTableWrap');
  const rawEl = $('requestBodyRaw');
  const toggle = $('btnRequestBodyView');
  if (tableWrap) tableWrap.hidden = raw;
  if (rawEl) rawEl.hidden = !raw;
  if (toggle) {
    toggle.textContent = raw ? pgT('request.keyValue') : pgT('request.rawJson');
    toggle.setAttribute('aria-pressed', raw ? 'true' : 'false');
  }
}

$('btnRequestBodyView')?.addEventListener('click', () => {
  setRequestBodyView(!requestBodyRawView);
});

function setResponseTab(tab) {
  if (!RESPONSE_TABS.has(tab)) return;
  activeResponseTab = tab;
  document.querySelectorAll('.pg-response-tab').forEach((btn) => {
    const active = btn.dataset.responseTab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-response-pane]').forEach((pane) => {
    const match = pane.dataset.responsePane === tab;
    pane.classList.toggle('active', match);
    pane.hidden = !match;
  });
  try {
    sessionStorage.setItem(STORAGE_RESPONSE_TAB, tab);
  } catch {
    /* ignore */
  }
  if (tab === 'endpoints') globalThis.GatewayEndpointDetail?.refreshEndpointsTable?.();
}

function restoreResponseTab() {
  try {
    const saved = sessionStorage.getItem(STORAGE_RESPONSE_TAB);
    if (saved && RESPONSE_TABS.has(saved)) setResponseTab(saved);
  } catch {
    /* ignore */
  }
}

restoreResponseTab();

function getGuideContext() {
  const jobType = $('jobType')?.value || 'image';
  const modelSlug = $('mediaModelSelect')?.value || '';
  const prompt = $('mediaPrompt')?.value?.trim() || '';
  const domain = $('loginDomain')?.value?.trim() || GatewayAiGuide?.DEFAULT_DOMAIN || '79ai.net';
  let base = '';
  try {
    base = baseUrl();
  } catch {
    base = window.location.origin.replace(/\/$/, '');
  }
  const fields = readJobFields(prompt);
  let modelName = modelSlug;
  const envelope = modelSlug ? getStoredModelsEnvelope(jobType) : null;
  if (envelope && modelSlug) {
    const m = normalizeModels(envelope).find((x) => x.slug === modelSlug);
    if (m?.name) modelName = m.name;
  }
  return { baseUrl: base, jobType, modelSlug, modelName, domain, prompt, fields };
}

function renderAiGuidePanel() {
  if (!globalThis.GatewayAiGuide) return;
  const ctx = getGuideContext();
  const guide = GatewayAiGuide;
  const locale = pgLocale();

  const baseEl = $('guideMetaBase');
  if (baseEl) baseEl.textContent = ctx.baseUrl;

  const guideText = guide.buildSystemPrompt(ctx);
  const guideEl = $('aiGuideText');
  if (guideEl) guideEl.textContent = guideText;

  const tsEl = $('guideTsCode');
  if (tsEl) tsEl.textContent = guide.buildTsSample(ctx);

  const pyEl = $('guidePyCode');
  if (pyEl) pyEl.textContent = guide.buildPySample(ctx);

  const skillEl = $('aiSkillText');
  if (skillEl) skillEl.textContent = guide.buildSkillPrompt(ctx, locale);

  const playbook = guide.getSkillPlaybook ? guide.getSkillPlaybook(locale) : guide.SKILL_PLAYBOOK || [];
  const playbookEl = $('skillPlaybookList');
  if (playbookEl) {
    playbookEl.innerHTML = playbook.map((step) => `<li>${step}</li>`).join('');
  }

  const examples = guide.getSkillExamples ? guide.getSkillExamples(locale) : guide.SKILL_EXAMPLES || [];
  const examplesEl = $('skillExamplesList');
  if (examplesEl) {
    examplesEl.innerHTML = examples.map((ex) => `<li>${ex}</li>`).join('');
  }

  const fieldsByType = guide.getSkillFieldsByType
    ? guide.getSkillFieldsByType(locale)
    : guide.SKILL_FIELDS_BY_TYPE || [];
  const fieldsEl = $('skillFieldsList');
  if (fieldsEl) {
    fieldsEl.innerHTML = fieldsByType
      .map((row) => `<li><strong>${row.type}</strong> · ${row.fields}</li>`)
      .join('');
  }

  const skillCtxDl = $('skillContextDl');
  if (skillCtxDl) {
    const pollMedia = guide.mediaForPoll(ctx.jobType);
    skillCtxDl.innerHTML = `
      <dt>${pgT('skill.ctx.type')}</dt><dd><code>${ctx.jobType}</code></dd>
      <dt>${pgT('skill.ctx.model')}</dt><dd><code>${ctx.modelSlug || '—'}</code></dd>
      <dt>${pgT('skill.ctx.domain')}</dt><dd><code>${ctx.domain}</code> <span class="pg-guide-context-note">${pgT('skill.ctx.domainNote')}</span></dd>
      <dt>${pgT('skill.ctx.projectId')}</dt><dd><code>default</code></dd>
      <dt>${pgT('skill.ctx.pollMedia')}</dt><dd><code>${pollMedia}</code></dd>
    `;
  }

  const endpointsEl = $('guideEndpointsList');
  if (endpointsEl && !endpointsEl.dataset.built) {
    endpointsEl.dataset.built = '1';
    endpointsEl.innerHTML = guide.GUIDE_ENDPOINTS
      .map(
        (ep) =>
          `<li class="pg-guide-endpoint"><span class="pg-method ${ep.method.toLowerCase()}">${ep.method}</span><code>${ep.path}</code><span class="pg-guide-endpoint-name">${ep.name}</span></li>`,
      )
      .join('');
  }

  const tipsEl = $('guideTipsList');
  if (tipsEl && !tipsEl.dataset.built) {
    tipsEl.dataset.built = '1';
    tipsEl.innerHTML = guide.INTEGRATION_TIPS.map((t) => `<li>${t}</li>`).join('');
  }

  const ctxDl = $('guideContextDl');
  if (ctxDl) {
    const pollMedia = guide.mediaForPoll(ctx.jobType);
    ctxDl.innerHTML = `
      <dt>${pgT('guide.ctx.type')}</dt><dd><code>${ctx.jobType}</code></dd>
      <dt>${pgT('guide.ctx.modelSlug')}</dt><dd><code>${ctx.modelSlug || '—'}</code></dd>
      <dt>${pgT('guide.ctx.model')}</dt><dd>${ctx.modelName || '—'}</dd>
      <dt>${pgT('guide.ctx.domain')}</dt><dd><code>${ctx.domain}</code> <span class="pg-guide-context-note">${pgT('guide.ctx.domainNote')}</span></dd>
      <dt>${pgT('guide.ctx.pollMedia')}</dt><dd><code>${pollMedia}</code></dd>
    `;
  }
}

function buildAiGuideText() {
  if (globalThis.GatewayAiGuide) return GatewayAiGuide.buildSystemPrompt(getGuideContext());
  return '';
}

function buildAiSkillText() {
  if (globalThis.GatewayAiGuide) {
    return GatewayAiGuide.buildSkillPrompt(getGuideContext(), pgLocale());
  }
  return `You are a content-creation agent using AI Gateway REST.`;
}

function initPortalI18n() {
  if (!globalThis.PortalI18n) return;
  PortalI18n.applyDom();
  window.addEventListener('portal-locale-change', async () => {
    PortalI18n.applyDom();
    applyMediaPromptDefaults($('jobType')?.value || 'image');
    setRequestBodyView(requestBodyRawView);
    updateTokenBadge();
    renderAiGuidePanel();
    if ($('panel-info-job')?.classList.contains('active')) configureInfoPanelUi(activeInfoKind);
    if ($('panel-library')?.classList.contains('active')) configureLibraryPanelUi(activeLibraryKind);
    renderEmbedWorkerMenu();
    syncEmbedChromeFromState();
    if ($('panel-media-job')?.classList.contains('active')) {
      const type = $('jobType')?.value || 'image';
      await fetchModelsForType(type);
      onMediaModelChange();
    }
  });
}

function buildMediaJobRequestPreview() {
  const jobType = $('jobType')?.value || 'image';
  const modelSlug = $('mediaModelSelect')?.value || '';
  const prompt = $('mediaPrompt')?.value?.trim() || '';
  const wait = $('mediaWait')?.checked ?? false;
  const fields = readJobFields(prompt);
  const body = {
    modelSlug: modelSlug || '<modelSlug>',
    wait,
    fields,
  };
  const path = `/gateway/jobs/${jobType}`;
  let base = '';
  try {
    base = baseUrl();
  } catch {
    base = window.location.origin.replace(/\/$/, '');
  }
  const url = `${base}${path}`;
  const token = tokenEl?.value?.trim();
  const tokenMask = token ? `${token.slice(0, 12)}…` : '<ACCESS_TOKEN>';
  const headers = {
    Authorization: `Bearer ${tokenMask}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const curlToken = token || '<ACCESS_TOKEN>';
  const curl = `curl -X POST '${url}' \\\n  -H 'Authorization: Bearer ${curlToken}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(body)}'`;
  return { path, url, headers, body, curl };
}

function refreshRequestPreview() {
  const panel = document.querySelector('.pg-panel.active')?.dataset.panel;
  if (panel === 'info-job' || panel === 'library' || panel === 'health') {
    refreshProxyPanelPreview();
    return;
  }
  const preview = buildMediaJobRequestPreview();
  const methodEl = $('requestMethod');
  const endpointEl = $('requestEndpoint');
  const fullUrlEl = $('requestFullUrl');
  const headersRows = $('requestHeadersRows');
  const bodyRows = $('requestBodyRows');
  const bodyRawEl = $('requestBodyRaw');
  const curlEl = $('requestCurl');

  if (methodEl) methodEl.textContent = 'POST';
  if (endpointEl) endpointEl.textContent = preview.path;
  if (fullUrlEl) fullUrlEl.textContent = preview.url;

  renderKvTableRows(
    headersRows,
    Object.entries(preview.headers).map(([k, v]) => [k, v]),
  );
  renderKvTableRows(bodyRows, flattenRequestBodyRows(preview.body));
  if (bodyRawEl) GwJsonHighlight?.setJsonPre(bodyRawEl, preview.body);
  if (curlEl) curlEl.textContent = preview.curl;
  renderAiGuidePanel();
  globalThis.GatewayEndpointDetail?.refreshEndpointsTable?.();
}

function initGuidePanels() {
  initPortalI18n();
  renderAiGuidePanel();
}

function getActiveCopyText() {
  if (activeResponseTab === 'request') return $('requestCurl')?.textContent || '';
  if (activeResponseTab === 'guide') return $('aiGuideText')?.textContent || '';
  if (activeResponseTab === 'skill') return $('aiSkillText')?.textContent || '';
  if (activeResponseTab === 'result' && $('resultMain') && !$('resultMain').hidden) {
    const create = GwJsonHighlight?.getRawText($('resultCreateJson')) || '';
    const poll = GwJsonHighlight?.getRawText($('resultPollJson')) || '';
    if (create || poll) return `--- CREATE ---\n${create}\n\n--- POLL ---\n${poll}`;
  }
  return GwJsonHighlight?.getRawText(responseOutput) || responseOutput?.textContent || '';
}

document.querySelectorAll('.pg-response-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.responseTab;
    if (tab) setResponseTab(tab);
  });
});

function showResponse(body, meta = {}, opts = {}) {
  if (!opts.silent) {
    if ($('resultMain')) $('resultMain').hidden = true;
    if ($('resultLegacyJsonWrap')) $('resultLegacyJsonWrap').hidden = false;
  }
  if (responseOutput && !opts.silent) {
    GwJsonHighlight?.displayInPre(responseOutput, body);
  }
  const parts = [];
  if (meta.status) parts.push(String(meta.status));
  if (meta.ms != null) parts.push(`${meta.ms}ms`);
  if (meta.label) parts.unshift(meta.label);
  if (!opts.silent) responseMeta.textContent = parts.length ? parts.join(' · ') : '—';
  if (!meta.keepTab && !opts.silent && !playgroundBooting) setResponseTab('result');
}

function displayJsonPre(el, body, opts = {}) {
  if (!el) return;
  if (opts.skeleton) el.classList.add('pg-result-json-pre--skeleton');
  else el.classList.remove('pg-result-json-pre--skeleton');
  if (body == null) {
    el.textContent = '—';
    el.classList.remove('pg-json-highlight');
    return;
  }
  GwJsonHighlight?.displayInPre(el, body);
  if (opts.skeleton) el.classList.add('pg-result-json-pre--skeleton');
}

let resultElapsedTimer = null;
let resultJobStartMs = null;
let activeResultJobId = null;

function setResultPhase(phase) {
  const main = $('resultMain');
  if (main) main.dataset.phase = phase || 'idle';
}

function setResultStatusPill(status, label) {
  const pill = $('resultStatusPill');
  if (!pill) return;
  if (!status) {
    pill.hidden = true;
    return;
  }
  pill.hidden = false;
  pill.dataset.status = status;
  const labels = {
    running: pgT('result.status.running', 'Running'),
    success: pgT('result.status.success', 'Success'),
    failed: pgT('result.status.failed', 'Failed'),
    cancelled: pgT('result.status.cancelled', 'Stopped'),
  };
  pill.textContent = label || labels[status] || status;
}

function updateResultStepper(activeStep, opts = {}) {
  const steps = document.querySelectorAll('#resultStepper .pg-result-step');
  const order = ['send', 'create', 'poll', 'done'];
  const activeIdx = order.indexOf(activeStep);
  steps.forEach((el) => {
    const step = el.dataset.step;
    const idx = order.indexOf(step);
    el.classList.remove('is-active', 'is-complete', 'is-error');
    if (opts.errorStep === step) el.classList.add('is-error');
    else if (idx < activeIdx) el.classList.add('is-complete');
    else if (step === activeStep) el.classList.add('is-active');
  });
}

function showResultStatusBar(visible, label, opts = {}) {
  const bar = $('resultStatusBar');
  const lbl = $('resultStatusLabel');
  const cancelBtn = $('btnCancelPoll');
  if (bar) bar.hidden = !visible;
  if (lbl && label != null) lbl.textContent = label;
  if (cancelBtn) cancelBtn.hidden = !opts.showCancel;
}

function startResultElapsedTimer() {
  stopResultElapsedTimer();
  resultJobStartMs = performance.now();
  const elapsedEl = $('resultHdrElapsed');
  if (!elapsedEl) return;
  resultElapsedTimer = window.setInterval(() => {
    if (resultJobStartMs == null) return;
    elapsedEl.textContent = formatElapsed(performance.now() - resultJobStartMs);
  }, 200);
}

function stopResultElapsedTimer() {
  if (resultElapsedTimer != null) {
    clearInterval(resultElapsedTimer);
    resultElapsedTimer = null;
  }
}

function formatResultPrice(model) {
  const price = globalThis.ModelPriceUi?.getActivePrice?.();
  if (price != null && globalThis.ModelPricing) {
    const locale = globalThis.PortalI18n?.getLocale() || 'en';
    return globalThis.ModelPricing.formatCredits(price, locale);
  }
  if (model?.creditsLabel && model.creditsLabel !== '—') return model.creditsLabel;
  return null;
}

function buildJobRequestEcho(jobType, modelSlug, fields, wait) {
  return {
    _echo: pgT('result.requestEcho', 'Outgoing request'),
    method: 'POST',
    path: `/gateway/jobs/${jobType}`,
    body: { modelSlug, wait: Boolean(wait), fields },
  };
}

function buildPollPendingEcho(message) {
  return {
    status: 'pending',
    message: message || pgT('result.awaitingCreate', 'Waiting for create response…'),
  };
}

function showJobResultLayout() {
  if (resultEmpty) resultEmpty.hidden = true;
  const main = $('resultMain');
  if (main) main.hidden = false;
  const legacy = $('resultLegacyJsonWrap');
  if (legacy) legacy.hidden = true;
  if (!playgroundBooting) setResponseTab('result');
}

function displayCreateJson(body, opts = {}) {
  displayJsonPre($('resultCreateJson'), body, opts);
}

function displayPollJson(body, opts = {}) {
  displayJsonPre($('resultPollJson'), body, opts);
}

function displayPollSkeleton(message) {
  displayPollJson(buildPollPendingEcho(message), { skeleton: true });
}

function showJobProgress(visible, label, pct) {
  const wrap = $('resultProgress');
  const bar = $('resultProgressBar');
  const lbl = $('resultProgressLabel');
  if (wrap) wrap.hidden = !visible;
  if (lbl && label != null) lbl.textContent = label;
  if (bar && pct != null) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function formatElapsed(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function updateResultHeader({ model, domain, type, elapsedMs, jobId, modelObj, status }) {
  const modelEl = $('resultHdrModel');
  const domainEl = $('resultHdrDomain');
  const typeEl = $('resultHdrType');
  const elapsedEl = $('resultHdrElapsed');
  const priceEl = $('resultHdrPrice');
  const priceChip = $('resultChipPrice');
  const jobChip = $('resultChipJobId');
  const jobEl = $('resultHdrJobId');

  if (modelEl) modelEl.textContent = model || '—';
  if (domainEl) domainEl.textContent = domain || '—';
  if (typeEl) typeEl.textContent = type || '—';
  if (elapsedEl && elapsedMs != null) elapsedEl.textContent = formatElapsed(elapsedMs);

  const priceLabel = formatResultPrice(modelObj);
  if (priceChip && priceEl) {
    if (priceLabel) {
      priceEl.textContent = priceLabel;
      priceChip.hidden = false;
    } else {
      priceChip.hidden = true;
    }
  }

  if (jobId) activeResultJobId = jobId;
  if (jobChip && jobEl) {
    if (jobId) {
      jobEl.textContent = jobId;
      jobChip.hidden = false;
    } else if (!activeResultJobId) {
      jobChip.hidden = true;
      jobEl.textContent = '—';
    }
  }

  if (status) setResultStatusPill(status);
}

function resetResultPanelState() {
  stopResultElapsedTimer();
  resultJobStartMs = null;
  activeResultJobId = null;
  setResultPhase('idle');
  setResultStatusPill(null);
  updateResultStepper('send');
  showResultStatusBar(false);
  showJobProgress(false);
  const cancelBtn = $('btnCancelPoll');
  if (cancelBtn) cancelBtn.hidden = true;
}

function cancelActivePoll() {
  abortActiveJobRequest();
  jobPollGeneration += 1;
  stopResultElapsedTimer();
  const elapsed =
    resultJobStartMs != null ? performance.now() - resultJobStartMs : null;
  if (elapsed != null) updateResultHeader({ elapsedMs: elapsed });
  setResultPhase('cancelled');
  setResultStatusPill('cancelled');
  const errStep = activeResultJobId ? 'poll' : 'create';
  updateResultStepper(errStep, { errorStep: errStep });
  showJobProgress(false);
  showResultStatusBar(
    true,
    `${pgT('result.cancelled', 'Stopped tracking')}. ${pgT('result.cancelHint', 'Job may still run on the server. Credits are not refunded.')}`,
    { showCancel: false },
  );
  const cancelBtn = $('btnCancelPoll');
  if (cancelBtn) cancelBtn.hidden = true;
}

function finishResultJob(opts = {}) {
  stopResultElapsedTimer();
  const elapsed =
    opts.elapsedMs ??
    (resultJobStartMs != null ? performance.now() - resultJobStartMs : null);
  if (elapsed != null) updateResultHeader({ elapsedMs: elapsed });
  showJobProgress(false);
  showResultStatusBar(false);
  const cancelBtn = $('btnCancelPoll');
  if (cancelBtn) cancelBtn.hidden = true;
  if (opts.failed) {
    setResultPhase('failed');
    setResultStatusPill('failed');
    const errStep = opts.errorStep || 'done';
    updateResultStepper(errStep, { errorStep: errStep });
  } else if (opts.cancelled) {
    setResultPhase('cancelled');
    setResultStatusPill('cancelled');
  } else {
    setResultPhase('done');
    setResultStatusPill('success');
    updateResultStepper('done');
  }
}

function jobTypeNeedsRefUrl(jobType) {
  return /upscale|remove-bg|avatar-lipsync|edit/i.test(jobType || '');
}

function modelNeedsRefInput(jobType, model) {
  if (jobTypeNeedsRefUrl(jobType)) return true;
  const hay = `${model?.slug || ''} ${model?.name || ''}`.toLowerCase();
  if (/upscale|remove-?bg|removebg|img2img|i2i|enhance|edit/.test(hay)) return true;
  const raw = model?.raw;
  if (raw && (raw.need_image || raw.requires_image || raw.image_required || raw.need_images)) {
    return true;
  }
  return false;
}

function promptRequired(jobType, model) {
  return !modelNeedsRefInput(jobType, model);
}

function jobTypeNeedsPrompt(jobType, model) {
  return promptRequired(jobType, model);
}

function updateRefPreview() {
  const url = $('mediaRefUrl')?.value?.trim();
  const preview = $('mediaRefPreview');
  const img = $('mediaRefPreviewImg');
  if (!preview || !img) return;
  if (url) {
    img.src = url;
    preview.hidden = false;
  } else {
    img.removeAttribute('src');
    preview.hidden = true;
  }
}

function catalogModeHaystack(model) {
  const sel = readCatalogFieldValues();
  return `${sel.mode || ''} ${model?.slug || ''} ${model?.name || ''}`.toLowerCase();
}

function getMediaInputSpec(jobType, model) {
  const spec = { show: false, fields: [] };
  if (!model && !modelNeedsRefInput(jobType, null)) return spec;

  const hay = catalogModeHaystack(model);
  const raw = model?.raw;

  if (jobType === 'video') {
    if (/motion|animate|dance|transfer|vfx/.test(hay) || raw?.need_video || raw?.requires_video) {
      spec.show = true;
      spec.fields = [
        {
          id: 'video_url',
          type: 'video',
          labelKey: 'media.videoRef',
          payloadKey: 'video_url',
          required: true,
        },
      ];
      return spec;
    }
    if (/extend|continue|continuation/.test(hay)) {
      spec.show = true;
      spec.fields = [
        {
          id: 'video_url',
          type: 'video',
          labelKey: 'media.sourceVideo',
          payloadKey: 'video_url',
          required: true,
        },
      ];
      return spec;
    }
    if (
      /img2vid|i2v|image.?to.?video|start.?frame|first.?frame/.test(hay) ||
      raw?.need_image ||
      raw?.requires_image ||
      raw?.image_required
    ) {
      spec.show = true;
      spec.fields = [
        {
          id: 'start_frame',
          type: 'image',
          labelKey: 'media.startFrame',
          payloadKey: 'images',
          index: 0,
          required: true,
        },
        {
          id: 'end_frame',
          type: 'image',
          labelKey: 'media.endFrame',
          payloadKey: 'images',
          index: 1,
          optional: true,
        },
      ];
      return spec;
    }
    if (modelNeedsRefInput(jobType, model)) {
      spec.show = true;
      spec.fields = [
        {
          id: 'start_frame',
          type: 'image',
          labelKey: 'media.startFrame',
          payloadKey: 'images',
          index: 0,
          required: true,
        },
      ];
    }
    return spec;
  }

  if (modelNeedsRefInput(jobType, model)) {
    spec.show = true;
    spec.fields = [
      {
        id: 'ref_image',
        type: 'image',
        labelKey: 'media.subject',
        payloadKey: 'images',
        index: 0,
        required: true,
      },
    ];
  }
  return spec;
}

function getMediaSlotValue(slotId) {
  return mediaInputValues.get(slotId)?.trim() || '';
}

function setMediaSlotValue(slotId, url) {
  if (url) mediaInputValues.set(slotId, url);
  else mediaInputValues.delete(slotId);
  const slot = $(`mediaInputSlots`)?.querySelector(`[data-slot-id="${slotId}"]`);
  if (!slot) return;
  const input = slot.querySelector('.pg-media-slot-url');
  if (input) input.value = url || '';
  updateMediaSlotPreview(slot, url);
}

function updateMediaSlotPreview(slotEl, url) {
  const preview = slotEl?.querySelector('.pg-media-slot-preview');
  if (!preview) return;
  preview.innerHTML = '';
  if (!url) {
    preview.hidden = true;
    return;
  }
  preview.hidden = false;
  const type = slotEl.dataset.slotType || 'image';
  if (type === 'video') {
    const vid = document.createElement('video');
    vid.src = url;
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'metadata';
    preview.appendChild(vid);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    preview.appendChild(img);
  }
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'pg-media-slot-clear';
  clear.textContent = pgT('media.refClear', 'Remove');
  clear.addEventListener('click', () => {
    setMediaSlotValue(slotEl.dataset.slotId, '');
    refreshRequestPreview();
  });
  preview.appendChild(clear);
}

async function uploadMediaFile(file, kind) {
  getToken();
  const form = new FormData();
  form.append('file', file);
  const path = kind === 'video' ? '/gateway/upload/video' : '/gateway/upload/image';
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: authHeaders(false),
    body: form,
  });
  const body = await res.json();
  const url =
    body?.data?.url ||
    body?.data?.file_url ||
    body?.url ||
    body?.data?.imageInfo?.url ||
    body?.data?.videoInfo?.url;
  if (!url) throw new Error('No URL in upload response');
  return url;
}

function wireMediaSlot(slotEl, field) {
  const input = slotEl.querySelector('.pg-media-slot-url');
  const drop = slotEl.querySelector('.pg-media-dropzone');
  const fileInput = slotEl.querySelector('.pg-media-slot-file');

  input?.addEventListener('input', () => {
    setMediaSlotValue(field.id, input.value.trim());
    refreshRequestPreview();
  });

  drop?.addEventListener('click', () => fileInput?.click());

  drop?.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('is-dragover');
  });
  drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragover'));
  drop?.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) void handleMediaSlotFile(field, file);
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) void handleMediaSlotFile(field, file);
    e.target.value = '';
  });
}

async function handleMediaSlotFile(field, file) {
  const status = $('mediaJobStatus');
  setStatus(status, pgT('media.uploading', 'Uploading…'), 'running');
  try {
    const url = await uploadMediaFile(file, field.type);
    setMediaSlotValue(field.id, url);
    refreshRequestPreview();
    setStatus(status, pgT('media.uploadDone', 'Upload complete'), 'ok');
  } catch (err) {
    setStatus(status, err.message, false);
  }
}

function renderMediaInputSlots(jobType, model) {
  const card = $('mediaInputsCard');
  const slotsEl = $('mediaInputSlots');
  const hintEl = $('mediaInputsHint');
  const legacyWrap = $('mediaRefUrlWrap');
  if (!card || !slotsEl) return;

  if (!isEmbed) {
    card.hidden = true;
    if (legacyWrap) legacyWrap.hidden = !modelNeedsRefInput(jobType, model);
    updateRefPreview();
    return;
  }

  if (legacyWrap) legacyWrap.hidden = true;

  const spec = getMediaInputSpec(jobType, model);
  if (!spec.show || !spec.fields.length) {
    card.hidden = true;
    slotsEl.innerHTML = '';
    return;
  }

  card.hidden = false;
  const prev = new Map(mediaInputValues);
  mediaInputValues.clear();
  slotsEl.innerHTML = '';

  for (const field of spec.fields) {
    if (prev.has(field.id)) mediaInputValues.set(field.id, prev.get(field.id));

    const slot = document.createElement('div');
    slot.className = 'pg-media-slot';
    slot.dataset.slotId = field.id;
    slot.dataset.slotType = field.type;

    const accept = field.type === 'video' ? 'video/*' : 'image/*';
    slot.innerHTML = `
      <label class="pg-media-slot-label">${escapeHtml(pgT(field.labelKey, field.labelKey))}${field.optional ? ` <span class="pg-optional">${pgT('media.optional', 'optional')}</span>` : ''}</label>
      <div class="pg-media-dropzone" tabindex="0" role="button">
        <span class="pg-media-dropzone-icon">${field.type === 'video' ? '▶' : '🖼'}</span>
        <span class="pg-media-dropzone-text">${escapeHtml(pgT('media.dropHint', 'Drop file or paste URL'))}</span>
      </div>
      <input type="url" class="pg-media-slot-url" placeholder="https://…" autocomplete="off" spellcheck="false" />
      <div class="pg-media-slot-preview" hidden></div>
      <input type="file" class="pg-media-slot-file" accept="${accept}" hidden />
    `;
    slotsEl.appendChild(slot);
    wireMediaSlot(slot, field);
    const existing = mediaInputValues.get(field.id);
    if (existing) setMediaSlotValue(field.id, existing);
  }

  if (hintEl) {
    hintEl.textContent = pgT('media.refHint', 'Upload or paste URL.');
    hintEl.hidden = false;
  }
}

function readMediaInputFields() {
  const jobType = $('jobType')?.value || 'image';
  const slug = $('mediaModelSelect')?.value;
  const envelope = slug ? getStoredModelsEnvelope(jobType) : null;
  const model =
    envelope && slug ? normalizeModels(envelope).find((m) => m.slug === slug) : activeCatalogModel;
  const spec = getMediaInputSpec(jobType, model);
  const out = {};

  if (isEmbed && spec.show) {
    const images = [];
    for (const field of spec.fields) {
      const val = getMediaSlotValue(field.id);
      if (!val) continue;
      if (field.payloadKey === 'video_url') out.video_url = val;
      else if (field.payloadKey === 'images') {
        const idx = field.index ?? 0;
        images[idx] = { url: val };
      }
    }
    const compact = images.filter(Boolean);
    if (compact.length) out.images = compact;
    return out;
  }

  const ref = $('mediaRefUrl')?.value?.trim();
  if (ref) return { images: [{ url: ref }] };
  return {};
}

function validateMediaInputs(jobType, model) {
  if (!isEmbed) {
    const ref = $('mediaRefUrl')?.value?.trim();
    if (modelNeedsRefInput(jobType, model) && !ref) {
      return pgT('media.refRequired', 'Reference media required');
    }
    return null;
  }
  const spec = getMediaInputSpec(jobType, model);
  if (!spec.show) return null;
  for (const field of spec.fields) {
    if (field.optional) continue;
    if (!getMediaSlotValue(field.id)) {
      return pgT('media.refRequired', 'Reference media required');
    }
  }
  return null;
}

function updateStudioFieldVisibility(jobType, model) {
  activeCatalogModel = model || null;
  renderMediaInputSlots(jobType, model);
  if (!isEmbed) {
    const refWrap = $('mediaRefUrlWrap');
    if (refWrap) refWrap.hidden = !modelNeedsRefInput(jobType, model);
    updateRefPreview();
  }
}

function updateRefUrlFieldVisibility(jobType) {
  const type = jobType || $('jobType')?.value || 'image';
  const slug = $('mediaModelSelect')?.value;
  const envelope = slug ? getStoredModelsEnvelope(type) : null;
  const model =
    envelope && slug ? normalizeModels(envelope).find((m) => m.slug === slug) : null;
  updateStudioFieldVisibility(type, model);
}

function applyMediaPromptDefaults(type) {
  const promptEl = $('mediaPrompt');
  if (!promptEl || promptEl.dataset.userEdited) return;
  if (isEmbed) {
    promptEl.value = '';
    if (type === 'video') {
      promptEl.placeholder = pgT('media.promptPlaceholderVideo', 'Describe the video…');
    } else if (type === 'image') {
      promptEl.placeholder = pgT('media.promptPlaceholderImage', 'Describe the image…');
    } else {
      promptEl.placeholder = pgT('media.promptPlaceholder', 'Enter your prompt…');
    }
  } else if (DEFAULT_PROMPTS[type]) {
    promptEl.value = DEFAULT_PROMPTS[type];
  }
  autoGrowPrompt();
  updatePromptCount();
}

function autoGrowPrompt() {
  const el = $('mediaPrompt');
  if (!el || !isEmbed) return;
  el.style.height = 'auto';
  const min = 120;
  const max = Math.min(window.innerHeight * 0.35, 320);
  el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`;
}

function updatePromptCount() {
  const el = $('mediaPromptCount');
  const prompt = $('mediaPrompt');
  if (!el || !prompt) return;
  const n = prompt.value.length;
  el.textContent = n > 0 ? String(n) : '';
}

function setSendButtonLoading(loading) {
  const btn = $('btnMediaJob');
  const spinner = $('mediaSendSpinner');
  const icon = $('mediaSendIcon');
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('is-loading', loading);
  if (spinner) spinner.hidden = !loading;
  if (icon) icon.hidden = loading;
}

function updateModelMetaWorkerTheme(jobType) {
  const bar = $('mediaModelMeta');
  if (!bar) return;
  bar.dataset.worker = jobType === 'video' ? 'video' : 'image';
}

function readJobFields(prompt) {
  const fields = { ...readCatalogFieldValues(), ...readMediaInputFields() };
  if (prompt) fields.prompt = prompt;
  const projectId = $('mediaProjectId')?.value?.trim();
  if (projectId) fields.project_id = projectId;
  return fields;
}

function clearPreviewPlayers() {
  if (resultImage) {
    resultImage.removeAttribute('src');
    resultImage.hidden = true;
  }
  if (resultVideo) {
    resultVideo.pause?.();
    resultVideo.removeAttribute('src');
    resultVideo.hidden = true;
  }
  if (resultAudio) {
    resultAudio.pause?.();
    resultAudio.removeAttribute('src');
    resultAudio.hidden = true;
  }
}

function hidePreviewMedia() {
  resultPreview.hidden = true;
  clearPreviewPlayers();
  if (resultEmpty) resultEmpty.hidden = false;
  resetResultPanelState();
}

function showResultUrl(url, mediaHint = '') {
  if (!url) return;
  showJobResultLayout();
  if (resultEmpty) resultEmpty.hidden = true;
  const preview = $('resultPreview');
  if (preview) preview.hidden = false;
  setResponseTab('result');
  resultLink.href = url;
  resultLink.title = url;
  resultLink.textContent = pgT('result.openTab', 'Open in new tab ↗');
  clearPreviewPlayers();

  const hint = String(mediaHint || '').toLowerCase();
  const looksImage = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
  const looksVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
  const looksAudio =
    /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url) || /\/audio/i.test(url);

  if (hint === 'image' || looksImage) {
    resultImage.src = url;
    resultImage.hidden = false;
    return;
  }
  if ((hint === 'video' || looksVideo) && resultVideo) {
    resultVideo.src = url;
    resultVideo.hidden = false;
    return;
  }
  if ((hint === 'music' || hint === 'audio' || looksAudio) && resultAudio) {
    resultAudio.src = url;
    resultAudio.hidden = false;
    return;
  }
  if (hint === 'image' || !looksVideo && !looksAudio) {
    resultImage.src = url;
    resultImage.hidden = false;
  }
}

/** Match server parseModelsList — data array, data.models, data.items */
function parseModelsList(envelopeOrData) {
  if (Array.isArray(envelopeOrData)) return envelopeOrData;
  const root = envelopeOrData ?? {};
  const d = root?.envelope?.data ?? root?.data ?? root;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.models)) return d.models;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}

function modelSlug(m) {
  return m?.model || m?.slug || m?.model_id || m?.id || m?.id_base || '';
}

function pickCatalogValue(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item && typeof item === 'object') {
    const v =
      item.value ??
      item.type ??
      item.ratio ??
      item.mode ??
      item.resolution ??
      item.duration ??
      item.id;
    if (v != null && String(v).trim()) return String(v).trim();
    const name = item.name ?? item.label;
    if (name != null && String(name).trim()) return String(name).trim();
  }
  return '';
}

function pickCatalogList(model, ...keys) {
  for (const key of keys) {
    const val = model?.[key];
    if (Array.isArray(val) && val.length) {
      return val.map(pickCatalogValue).filter(Boolean);
    }
  }
  return [];
}

const CATALOG_FIELD_DEFS = [
  { field: 'ratio', label: 'Aspect ratio', i18n: 'media.ratio', keys: ['ratios', 'ratio'] },
  { field: 'mode', label: 'Mode', i18n: 'media.mode', keys: ['modes', 'mode'] },
  { field: 'resolution', label: 'Resolution', i18n: 'media.resolution', keys: ['resolutions', 'resolution'] },
  { field: 'duration', label: 'Duration', i18n: 'media.duration', keys: ['durations', 'duration'] },
];

const MEDIA_JOB_LABELS = {
  image: 'Image job',
  video: 'Video job',
  music: 'Music job',
  tts: 'TTS job',
  'image-upscale': 'Upscale image',
  'remove-bg': 'Remove background',
  'video-upscale': 'Upscale video',
  'video-vfx': 'Video VFX',
  'video-subtitle': 'Video subtitle',
  'video-cut': 'Video cut',
  'avatar-lipsync': 'Avatar lipsync',
};

const MEDIA_JOB_SHORT = {
  image: 'Image',
  video: 'Video',
  music: 'Music',
  tts: 'TTS',
  'image-upscale': 'Upscale',
  'remove-bg': 'Remove BG',
  'video-upscale': 'Vid upscale',
  'video-vfx': 'VFX',
  'video-subtitle': 'Subtitles',
  'video-cut': 'Cut',
  'avatar-lipsync': 'Lipsync',
  connection: 'Connection',
};

const DEFAULT_PROMPTS = {
  image: 'A cute cat, studio photo',
  video: 'A cat walking in a sunny garden, cinematic',
  music: 'Upbeat electronic loop, energetic and catchy',
  tts: 'Xin chào, đây là thử nghiệm TTS qua gateway.',
  'image-upscale': 'Enhance detail and sharpness',
  'remove-bg': 'Product on white background',
  'video-upscale': 'Upscale to higher resolution',
  'video-vfx': 'Cinematic color grade',
  'video-subtitle': 'Auto subtitles for speech',
  'video-cut': 'Trim highlight clip',
  'avatar-lipsync': 'Talking head lip sync',
};

const POLL_INTERVAL_MS = 3500;
const POLL_MAX_ATTEMPTS = 80;
let pollLoopGeneration = 0;
let jobPollGeneration = 0;
let activeJobAbortController = null;

function abortActiveJobRequest() {
  if (!activeJobAbortController) return;
  try {
    activeJobAbortController.abort();
  } catch {
    /* ignore */
  }
  activeJobAbortController = null;
}

function pollMediaForJobType(jobType) {
  if (jobType === 'music') return 'music';
  if (
    jobType === 'video' ||
    jobType === 'avatar-lipsync' ||
    jobType === 'video-upscale' ||
    jobType === 'video-vfx' ||
    jobType === 'video-subtitle' ||
    jobType === 'video-cut'
  ) {
    return 'video';
  }
  return 'image';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelsStorageKey(type, locale) {
  const loc = locale ?? pgLocale();
  return loc === 'en' ? `${STORAGE_MODELS_PREFIX}${type}_en` : `${STORAGE_MODELS_PREFIX}${type}`;
}

function modelsCatalogLang() {
  return pgLocale() === 'en' ? 'en' : '';
}

function getStoredModelsEnvelope(type, locale) {
  const raw = sessionStorage.getItem(modelsStorageKey(type, locale));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredModels(type, envelope, locale) {
  sessionStorage.setItem(modelsStorageKey(type, locale), JSON.stringify(envelope));
}

function migrateLegacyModelsStorage() {
  const legacy = sessionStorage.getItem(STORAGE_MODELS_LEGACY);
  if (legacy && !sessionStorage.getItem(modelsStorageKey('image'))) {
    sessionStorage.setItem(modelsStorageKey('image'), legacy);
  }
}

function parseModelCredits(m) {
  const raw = m.credits ?? m.credit ?? m.price ?? m.cost;
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    return { credits: raw, creditsLabel: `${raw.toLocaleString()} credits` };
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    if (!Number.isNaN(n)) return { credits: n, creditsLabel: `${n.toLocaleString()} credits` };
    return { credits: null, creditsLabel: raw.trim() };
  }
  return { credits: null, creditsLabel: '—' };
}

function normalizeModels(envelope) {
  return parseModelsList(envelope)
    .map((m) => {
      const slug = modelSlug(m);
      const { credits, creditsLabel } = parseModelCredits(m);
      return {
        slug,
        name: m.name || slug,
        descriptionEn: m.description_en || '',
        descriptionVi: m.description || '',
        description: m.description_en || m.description || '',
        raw: m,
        credits,
        creditsLabel,
        ratios: pickCatalogList(m, 'ratios', 'ratio'),
        modes: pickCatalogList(m, 'modes', 'mode'),
        resolutions: pickCatalogList(m, 'resolutions', 'resolution'),
        durations: pickCatalogList(m, 'durations', 'duration'),
      };
    })
    .filter((m) => m.slug);
}

/** Gommo login envelopes vary — extract token from common shapes */
function extractAccessToken(data) {
  if (!data || typeof data !== 'object') return null;
  const candidates = [
    data.access_token,
    data.accessToken,
    data.token,
    data.data?.access_token,
    data.data?.accessToken,
    data.data?.token,
    data.user?.access_token,
    data.result?.access_token,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

function apiErrorMessage(body, status) {
  if (body && typeof body === 'object') {
    if (body.message) return String(body.message);
    if (body.error) return String(body.error);
    if (body.data?.message) return String(body.data.message);
  }
  return `HTTP ${status}`;
}

async function apiStreamFetch(path, init = {}, label = '') {
  const start = performance.now();
  const url = `${baseUrl()}${path}`;
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const hint =
      err.message === 'Failed to fetch'
        ? `${err.message} — is npm run dev running at ${baseUrl()}?`
        : err.message;
    showResponse({ success: false, message: hint, code: 'NETWORK_ERROR' }, { label });
    throw new Error(hint);
  }

  if (!res.ok) {
    const text = await res.text();
    showResponse({ _raw: text }, { status: res.status, label, ms: Math.round(performance.now() - start) });
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    showResponse(text, { status: res.status, label, ms: Math.round(performance.now() - start) });
    return text;
  }

  const decoder = new TextDecoder();
  let accumulated = '';
  showResponse('(streaming…)\n', { status: res.status, label, keepTab: true });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    showResponse(accumulated, {
      status: res.status,
      label,
      ms: Math.round(performance.now() - start),
      keepTab: true,
    });
  }
  return accumulated;
}

function extractChatSessionId(data) {
  if (!data || typeof data !== 'object') return null;
  const candidates = [
    data.sessionId,
    data.session_id,
    data.data?.sessionId,
    data.data?.session_id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

function extractUploadUrl(data) {
  return data?.data?.url || data?.url || data?.data?.file_url || null;
}

function extractTtsUrl(data) {
  return (
    data?.data?.fileUrl ||
    data?.data?.audioInfo?.file_url ||
    data?.data?.audioInfo?.result_url ||
    data?.data?.audioInfo?.url ||
    null
  );
}

function populateVoiceSelect(voices) {
  const sel = $('audioVoiceSelect');
  if (!sel) return;
  sel.innerHTML = '';
  if (!voices.length) {
    sel.innerHTML = '<option value="">— No voices in response —</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.appendChild(new Option('— Select voice —', ''));
  for (const v of voices) {
    const id = v.voice_id || v.id_base || '';
    const name = v.name || id;
    sel.appendChild(new Option(name !== id ? `${name} (${id})` : id, id));
  }
}

function parseVoicesList(data) {
  const root = data?.data ?? data;
  if (Array.isArray(root?.voices)) return root.voices;
  if (Array.isArray(root?.items)) return root.items;
  return [];
}

const modelsFetchInflight = new Map();

function setMediaModelSelectLoading(loading) {
  const sel = $('mediaModelSelect');
  if (!sel) return;
  if (loading) {
    sel.innerHTML = `<option value="">${pgT('media.modelsLoading', 'Loading models…')}</option>`;
    sel.disabled = true;
    renderCatalogFields(null);
    return;
  }
  sel.disabled = false;
}

function populateMediaModelSelect(models) {
  const sel = $('mediaModelSelect');
  if (!sel) return;
  sel.disabled = false;
  sel.innerHTML = '';
  if (!models.length) {
    sel.innerHTML = '<option value="">— No models — login or List models —</option>';
    renderCatalogFields(null);
    return;
  }
  sel.appendChild(new Option('— Select model —', ''));
  for (const m of models) {
    sel.appendChild(new Option(m.name !== m.slug ? `${m.name} (${m.slug})` : m.slug, m.slug));
  }
}

/** @returns {Promise<{ data: unknown, models: ReturnType<typeof normalizeModels> } | null>} */
async function fetchModelsForType(type, { statusEl, force = false } = {}) {
  if (!type) return null;

  if (!force) {
    const cached = normalizeModels(getStoredModelsEnvelope(type));
    if (cached.length) {
      return { data: getStoredModelsEnvelope(type), models: cached };
    }
  }

  if (modelsFetchInflight.has(type)) {
    return modelsFetchInflight.get(type);
  }

  const task = (async () => {
    try {
      getToken();
    } catch (err) {
      if (statusEl) setStatus(statusEl, err.message, 'err');
      return null;
    }

    if (statusEl) setStatus(statusEl, 'Fetching catalog…', 'running');

    try {
      const params = new URLSearchParams({ type });
      if (modelsCatalogLang() === 'en') params.set('lang', 'en');
      const data = await apiFetch(
        `/gateway/models?${params}`,
        { headers: authHeaders() },
        `GET /gateway/models?${params}`,
      );
      const models = normalizeModels(data);
      setStoredModels(type, data);
      if (statusEl) {
        setStatus(
          statusEl,
          models.length
            ? `${models.length} model${models.length === 1 ? '' : 's'} loaded`
            : '0 models parsed — check RESPONSE',
          models.length > 0 ? 'ok' : 'err',
        );
      }
      return { data, models };
    } catch (err) {
      if (statusEl) setStatus(statusEl, err.message, 'err');
      return null;
    } finally {
      modelsFetchInflight.delete(type);
    }
  })();

  modelsFetchInflight.set(type, task);
  return task;
}

function ratioChipInner(ratio) {
  const r = String(ratio).trim();
  let w = 1;
  let h = 1;
  const m = r.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    w = Number(m[1]);
    h = Number(m[2]);
  } else if (/square|1x1/i.test(r)) {
    w = h = 1;
  } else if (/portrait|9.?16|vertical/i.test(r)) {
    w = 9;
    h = 16;
  } else if (/landscape|16.?9|horizontal/i.test(r)) {
    w = 16;
    h = 9;
  }
  const max = 14;
  const scale = max / Math.max(w, h);
  const bw = Math.max(4, Math.round(w * scale));
  const bh = Math.max(4, Math.round(h * scale));
  return `<span class="pg-ratio-icon" style="width:${bw}px;height:${bh}px" aria-hidden="true"></span><span class="pg-param-chip-text">${escapeHtml(r)}</span>`;
}

function appendCatalogChipGroup(container, def, list, model) {
  const jobType = $('jobType')?.value || 'image';
  const wrap = document.createElement('div');
  wrap.className = 'field pg-studio-param pg-param-chips';
  const label = document.createElement('span');
  label.className = 'pg-param-chip-label';
  label.textContent = pgT(def.i18n, def.label);

  const group = document.createElement('div');
  group.className = 'pg-param-chip-group';
  group.dataset.catalogField = def.field;
  group.setAttribute('role', 'listbox');
  group.setAttribute('aria-label', pgT(def.i18n, def.label));

  list.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pg-param-chip${i === 0 ? ' active' : ''}`;
    btn.dataset.value = opt;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    if (def.field === 'ratio') btn.innerHTML = ratioChipInner(opt);
    else btn.textContent = opt;
    btn.addEventListener('click', () => {
      group.querySelectorAll('.pg-param-chip').forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      refreshRequestPreview();
      if (model) globalThis.ModelPriceUi?.sync(model);
      if (def.field === 'mode') updateStudioFieldVisibility(jobType, model);
      if (embedMenuOpen === 'model') renderEmbedModelMenu();
    });
    group.appendChild(btn);
  });

  wrap.appendChild(label);
  wrap.appendChild(group);
  container.appendChild(wrap);
}

function renderCatalogFields(model) {
  const container = $('catalogFields');
  if (!container) return;
  container.innerHTML = '';
  container.className = 'pg-catalog-fields';
  activeCatalogModel = model || null;
  if (!model) return;

  const defs = [];
  for (const def of CATALOG_FIELD_DEFS) {
    const list =
      def.field === 'ratio'
        ? model.ratios
        : def.field === 'mode'
          ? model.modes
          : def.field === 'resolution'
            ? model.resolutions
            : model.durations;
    if (!list?.length) continue;
    defs.push({ def, list });
  }
  if (!defs.length) return;

  const useChips = isEmbed;
  container.className = useChips
    ? `pg-catalog-fields pg-studio-params pg-catalog-fields--chips${defs.length >= 4 ? ' pg-catalog-fields--dense' : ''}`
    : 'pg-catalog-fields gw-job-params';

  if (!useChips) {
    const head = document.createElement('p');
    head.className = 'gw-job-params-head';
    head.textContent = 'Catalog parameters';
    container.appendChild(head);
  }

  for (const { def, list } of defs) {
    if (useChips) {
      appendCatalogChipGroup(container, def, list, model);
      continue;
    }
    const wrap = document.createElement('div');
    wrap.className = 'field pg-studio-param';
    const label = document.createElement('label');
    label.setAttribute('for', `cat_${def.field}`);
    label.textContent = def.label;
    const sel = document.createElement('select');
    sel.id = `cat_${def.field}`;
    sel.dataset.catalogField = def.field;
    sel.addEventListener('change', () => {
      refreshRequestPreview();
      if (model) globalThis.ModelPriceUi?.sync(model);
      if (def.field === 'mode') updateStudioFieldVisibility($('jobType')?.value || 'image', model);
    });
    for (const opt of list) {
      sel.appendChild(new Option(opt, opt));
    }
    wrap.appendChild(label);
    wrap.appendChild(sel);
    container.appendChild(wrap);
  }
  refreshRequestPreview();
  updateStudioFieldVisibility($('jobType')?.value || 'image', model);
}

function onMediaModelChange() {
  const type = $('jobType')?.value || 'image';
  const slug = $('mediaModelSelect')?.value;
  const envelope = getStoredModelsEnvelope(type);
  if (!envelope || !slug) {
    renderCatalogFields(null);
    updateModelMetaBar(null);
    updateMediaJobChrome(type, null);
    updateStudioFieldVisibility(type, null);
    globalThis.ModelPriceUi?.sync(null);
    globalThis.GatewayEndpointDetail?.refreshEndpointsTable?.();
    return;
  }
  const model = normalizeModels(envelope).find((m) => m.slug === slug);
  saveLastModel(type, slug);
  renderCatalogFields(model || null);
  updateModelMetaBar(model || null);
  updateMediaJobChrome(type, model || null);
  updateStudioFieldVisibility(type, model || null);
  globalThis.GatewayEndpointDetail?.refresh();
  globalThis.GatewayEndpointDetail?.refreshEndpointsTable?.();
  globalThis.ModelPriceUi?.sync(model || null);
  if (isEmbed) {
    syncWorkerToUrl();
    renderEmbedModelMenu();
  }
}

function updateModelMetaBar(model) {
  const bar = $('mediaModelMeta');
  if (!bar) return;
  if (!model) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  updateModelMetaWorkerTheme($('jobType')?.value || 'image');
  const nameEl = $('mediaModelMetaName');
  const slugEl = $('mediaModelMetaSlug');
  if (nameEl) nameEl.textContent = model.name;
  if (slugEl) slugEl.textContent = model.slug;
  const descEl = $('mediaModelMetaDesc');
  const desc =
    pgLocale() === 'vi'
      ? model.descriptionVi || model.descriptionEn || model.description
      : model.descriptionEn || model.descriptionVi || model.description || '';
  if (descEl) {
    if (desc) {
      descEl.textContent = desc;
      descEl.hidden = false;
    } else {
      descEl.textContent = '';
      descEl.hidden = true;
    }
  }
  refreshRequestPreview();
}

function updateMediaJobChrome(type, model) {
  const title = $('mediaJobTitle');
  const endpoint = $('mediaJobEndpoint');
  if (title) title.textContent = model?.name || MEDIA_JOB_LABELS[type] || 'Media job';
  if (endpoint) endpoint.textContent = `POST /gateway/jobs/${type}`;
  updateEmbedStudio(type, model);
  updateSendPriceLabel(model);
}

function activateNavForPanel(panel, jobType) {
  document.querySelectorAll('.pg-nav-item').forEach((b) => {
    const matchPanel = b.dataset.panel === panel;
    const matchType = jobType ? b.dataset.jobType === jobType : !b.dataset.jobType;
    b.classList.toggle('active', matchPanel && matchType);
  });
}

async function openMediaJobPanel(type, { autoFetch = true } = {}) {
  if ($('jobType')) $('jobType').value = type;
  if ($('modelType')) $('modelType').value = type;
  updateRefUrlFieldVisibility(type);
  applyMediaPromptDefaults(type);
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === 'media-job');
  });
  activateNavForPanel('media-job', type);
  await loadMediaJobForType(type, { autoFetch });
}

async function loadMediaJobForType(type, { autoFetch = false } = {}) {
  if ($('jobType')) $('jobType').value = type;
  if ($('modelType')) $('modelType').value = type;
  updateMediaJobChrome(type, null);
  prefetchAdjacentCatalog(type);

  let models = normalizeModels(getStoredModelsEnvelope(type));

  if (!models.length && autoFetch) {
    setMediaModelSelectLoading(true);
    const result = await fetchModelsForType(type, { statusEl: $('mediaJobStatus') });
    models = result?.models ?? normalizeModels(getStoredModelsEnvelope(type));
    setMediaModelSelectLoading(false);
  }

  populateMediaModelSelect(models);
  if (models.length) {
    const last = getLastModel(type);
    const pick = models.some((m) => m.slug === last) ? last : models[0].slug;
    $('mediaModelSelect').value = pick;
    onMediaModelChange();
  } else {
    renderCatalogFields(null);
    updateModelMetaBar(null);
    updateStudioFieldVisibility(type, null);
  }
}

function readCatalogFieldValue(field) {
  const sel = document.querySelector(`select[data-catalog-field="${field}"]`);
  if (sel?.value?.trim()) return sel.value.trim();
  const chip = document.querySelector(
    `.pg-param-chip-group[data-catalog-field="${field}"] .pg-param-chip.active`,
  );
  return chip?.dataset.value?.trim() || '';
}

function readCatalogFieldValues() {
  const out = {};
  document.querySelectorAll('select[data-catalog-field]').forEach((sel) => {
    const key = sel.dataset.catalogField;
    const val = sel.value?.trim();
    if (key && val) out[key] = val;
  });
  document.querySelectorAll('.pg-param-chip-group[data-catalog-field]').forEach((group) => {
    const key = group.dataset.catalogField;
    const active = group.querySelector('.pg-param-chip.active');
    const val = active?.dataset.value?.trim();
    if (key && val) out[key] = val;
  });
  return out;
}

function validateCatalogFields(model) {
  if (!model) return null;
  for (const def of CATALOG_FIELD_DEFS) {
    const list =
      def.field === 'ratio'
        ? model.ratios
        : def.field === 'mode'
          ? model.modes
          : def.field === 'resolution'
            ? model.resolutions
            : model.durations;
    if (list?.length) {
      const val = readCatalogFieldValue(def.field);
      if (!val) return `Select ${def.label} from catalog — never guess`;
    }
  }
  return null;
}

function extractJobResultUrl(data, jobType) {
  const d = data?.data;
  const top = pickHttpUrl(
    d?.resultUrl,
    d?.pollResult?.resultUrl,
    d?.result_url,
    d?.file_url,
    d?.coverUrl,
    d?.pollResult?.coverUrl,
  );
  if (top) return top;

  const rawSources = [
    data?.raw,
    d?.raw,
    d?.pollResult?.raw,
    d?.createEnvelope?.raw,
    d?.createEnvelope?.data?.raw,
    d?.pollResult?.envelope?.raw,
  ];
  for (const raw of rawSources) {
    const url = pickUrlFromRaw(raw);
    if (url) return url;
  }

  if (jobType === 'music' && d?.pollResult?.coverUrl) return d.pollResult.coverUrl;
  return null;
}

function extractPollResultUrl(data) {
  const d = data?.data ?? data;
  if (typeof d !== 'object' || !d) return null;

  const top = pickHttpUrl(d.resultUrl, d.result_url, d.file_url, d.coverUrl);
  if (top) return top;

  const rawSources = [d.raw, data?.raw, d.envelope?.raw];
  for (const raw of rawSources) {
    const url = pickUrlFromRaw(raw);
    if (url) return url;
  }
  return null;
}

function extractPollStatus(data) {
  const d = data?.data ?? data?.raw ?? data;
  if (!d || typeof d !== 'object') return '';
  const nested = d.imageInfo || d.videoInfo || d.musicInfo || d.raw?.imageInfo;
  const status = d.status || nested?.status || d.message;
  return typeof status === 'string' ? status : '';
}

function isPollSuccess(data) {
  if (extractPollResultUrl(data)) return true;
  return /success|completed|done|finished/i.test(extractPollStatus(data));
}

function isPollFailed(data) {
  if (data && typeof data === 'object' && data.success === false) return true;
  return /fail|error|cancel|reject|nsfw|blocked|denied/i.test(extractPollStatus(data));
}

const STORAGE_USAGE = 'gw_usage_history';
const MAX_USAGE_RECORDS = 500;

function appendUsageLocal(record) {
  try {
    const raw = localStorage.getItem(STORAGE_USAGE);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    const full = {
      id: record.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: record.createdAt || new Date().toISOString(),
      jobType: record.jobType || 'other',
      model: record.model || '—',
      prompt: (record.prompt || '').slice(0, 500),
      status: record.status || 'success',
      credits: record.credits ?? null,
      jobId: record.jobId,
      resultUrl: record.resultUrl,
      source: record.source || 'playground',
    };
    if (full.jobId) {
      const idx = list.findIndex((r) => r && r.jobId === full.jobId);
      if (idx >= 0) list[idx] = { ...list[idx], ...full };
      else list.unshift(full);
    } else {
      list.unshift(full);
    }
    localStorage.setItem(STORAGE_USAGE, JSON.stringify(list.slice(0, MAX_USAGE_RECORDS)));
  } catch {
    /* ignore */
  }
}

function notifyUsageParent(record) {
  if (!isEmbed || window.parent === window) return;
  try {
    const target = document.referrer ? new URL(document.referrer).origin : '*';
    window.parent.postMessage({ type: 'ai-gateway-usage', record }, target);
  } catch {
    try {
      window.parent.postMessage({ type: 'ai-gateway-usage', record }, '*');
    } catch {
      /* ignore */
    }
  }
}

function logUsageEvent(partial) {
  const record = {
    jobType: partial.jobType || 'other',
    model: partial.model || '—',
    prompt: (partial.prompt || '').slice(0, 500),
    status: partial.status || 'success',
    credits: partial.credits ?? null,
    jobId: partial.jobId,
    resultUrl: partial.resultUrl,
    source: 'playground',
  };
  appendUsageLocal(record);
  notifyUsageParent(record);
}

function jobTypeFromPollMedia(media) {
  if (media === 'video') return 'video';
  if (media === 'music') return 'music';
  return 'image';
}

function logPollUsage(jobId, media, data, resultUrl) {
  const jobType = jobTypeFromPollMedia(media);
  const model = $('mediaModelSelect')?.value || '—';
  const prompt = $('mediaPrompt')?.value?.trim() || '';
  const status = isPollFailed(data) ? 'failed' : 'success';
  logUsageEvent({ jobType, model, prompt, status, jobId, resultUrl });
}

async function requestPoll(jobId, media, label, attempt) {
  const start = performance.now();
  const url = `${baseUrl()}/gateway/jobs/${encodeURIComponent(jobId)}?media=${encodeURIComponent(media)}`;
  const res = await fetch(url, { headers: authHeaders(false) });
  const ms = Math.round(performance.now() - start);
  const ct = res.headers.get('content-type') || '';
  let body;
  if (ct.includes('application/json')) body = await res.json();
  else body = { _raw: await res.text() };
  const attemptLabel = attempt != null ? `${label} #${attempt}` : label;
  showResponse(body, { status: res.status, ms, label: attemptLabel });
  if (!res.ok) throw new Error(apiErrorMessage(body, res.status));
  return body;
}

function finishPollLoopUi() {
  pollLoopGeneration += 1;
  const stopBtn = $('btnPollStop');
  const loopBtn = $('btnPollLoop');
  if (stopBtn) stopBtn.hidden = true;
  if (loopBtn) loopBtn.disabled = false;
}

function stopPollLoop() {
  pollLoopGeneration += 1;
  setStatus($('pollStatus'), 'Stopped', false);
  finishPollLoopUi();
}

async function runPollOnce() {
  const status = $('pollStatus');
  setStatus(status, 'Polling…', 'running');
  const jobId = $('pollJobId').value.trim();
  const media = $('pollMedia').value;
  if (!jobId) {
    setStatus(status, 'job id required', false);
    return;
  }
  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }
  try {
    const label = `GET /gateway/jobs/${jobId}?media=${media}`;
    const data = await requestPoll(jobId, media, label);
    const resultUrl = extractPollResultUrl(data);
    if (resultUrl) showResultUrl(resultUrl, media);
    if (isPollSuccess(data)) {
      logPollUsage(jobId, media, data, resultUrl);
    } else if (isPollFailed(data)) {
      logPollUsage(jobId, media, data, resultUrl);
    }
    if (resultUrl) setStatus(status, '', 'preview');
    else setStatus(status, 'Polled — check RESPONSE status', 'ok');
  } catch (err) {
    setStatus(status, err.message, false);
  }
}

async function runPollLoop() {
  const status = $('pollStatus');
  const gen = pollLoopGeneration + 1;
  pollLoopGeneration = gen;
  const stopBtn = $('btnPollStop');
  const loopBtn = $('btnPollLoop');
  if (stopBtn) stopBtn.hidden = false;
  if (loopBtn) loopBtn.disabled = true;

  const jobId = $('pollJobId').value.trim();
  const media = $('pollMedia').value;
  if (!jobId) {
    setStatus(status, 'job id required', false);
    finishPollLoopUi();
    return;
  }

  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    finishPollLoopUi();
    return;
  }

  const label = `GET /gateway/jobs/${jobId}?media=${media}`;

  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    if (pollLoopGeneration !== gen) break;
    setStatus(status, `Polling… ${attempt}/${POLL_MAX_ATTEMPTS}`, 'running');
    try {
      const data = await requestPoll(jobId, media, label, attempt);
      const resultUrl = extractPollResultUrl(data);
      if (resultUrl) showResultUrl(resultUrl, media);
      if (isPollSuccess(data)) {
        logPollUsage(jobId, media, data, resultUrl);
        if (resultUrl) setStatus(status, `Attempt ${attempt}`, 'preview');
        else setStatus(status, `Done #${attempt}`, 'ok');
        break;
      }
      if (isPollFailed(data)) {
        logPollUsage(jobId, media, data, resultUrl);
        setStatus(status, `Failed #${attempt} — see RESPONSE`, false);
        break;
      }
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setStatus(status, 'Timeout — max 80 attempts', false);
        break;
      }
      if (pollLoopGeneration === gen) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      setStatus(status, err.message, false);
      break;
    }
  }
  if (pollLoopGeneration === gen) finishPollLoopUi();
}

function filterSidebar(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('.pg-nav-item').forEach((btn) => {
    const hay = `${btn.dataset.search || ''} ${btn.textContent}`.toLowerCase();
    btn.hidden = Boolean(q && !hay.includes(q));
  });
  document.querySelectorAll('.pg-sidebar-label').forEach((label) => {
    const nav = label.nextElementSibling;
    if (!nav?.classList?.contains('pg-nav')) return;
    const anyVisible = [...nav.querySelectorAll('.pg-nav-item')].some((b) => !b.hidden);
    label.hidden = Boolean(q && !anyVisible);
  });
  const searchWrap = document.querySelector('.pg-sidebar-search');
  if (searchWrap) searchWrap.hidden = false;
}

function extractJobId(data) {
  const candidates = [
    data?.data?.providerJobId,
    data?.data?.jobId,
    data?.data?.id_base,
    data?.data?.idBase,
    data?.data?.pollResult?.idBase,
    data?.data?.createEnvelope?.raw?.imageInfo?.id_base,
    data?.data?.createEnvelope?.data?.imageInfo?.id_base,
    data?.data?.imageInfo?.id_base,
    data?.raw?.imageInfo?.id_base,
    data?.raw?.videoInfo?.id_base,
    data?.raw?.musicInfo?.id_base,
    data?.imageInfo?.id_base,
    data?.videoInfo?.id_base,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

function buildWaitPollView(data) {
  const d = data?.data;
  if (!d) return data;
  return {
    success: data.success,
    message: data.message,
    data: {
      resultUrl: d.resultUrl ?? d.pollResult?.resultUrl ?? null,
      status: d.pollResult?.status ?? (d.resultUrl ? 'SUCCESS' : 'PROCESSING'),
      coverUrl: d.coverUrl ?? d.pollResult?.coverUrl ?? null,
      idBase: d.providerJobId ?? d.pollResult?.idBase ?? null,
      pollResult: d.pollResult,
    },
  };
}

async function fetchPollQuiet(jobId, media) {
  const url = `${baseUrl()}/gateway/jobs/${encodeURIComponent(jobId)}?media=${encodeURIComponent(media)}`;
  const res = await fetch(url, { headers: authHeaders(false) });
  const ct = res.headers.get('content-type') || '';
  let body;
  if (ct.includes('application/json')) body = await res.json();
  else body = { _raw: await res.text() };
  if (!res.ok) throw new Error(apiErrorMessage(body, res.status));
  return body;
}

async function runMediaJobPollLoop(jobId, media, jobMeta, gen) {
  const start = performance.now();
  const labelBase = pgT('result.polling', 'Polling…');

  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    if (jobPollGeneration !== gen) return { cancelled: true };

    const pct = Math.min(92, 8 + (attempt / POLL_MAX_ATTEMPTS) * 84);
    showJobProgress(true, `${labelBase} ${attempt}/${POLL_MAX_ATTEMPTS}`, pct);
    showResultStatusBar(true, `${labelBase} ${attempt}/${POLL_MAX_ATTEMPTS}`, { showCancel: true });
    responseMeta.textContent = `GET poll · ${attempt}/${POLL_MAX_ATTEMPTS}`;

    try {
      const data = await fetchPollQuiet(jobId, media);
      displayPollJson(data);
      const resultUrl = extractPollResultUrl(data);
      if (resultUrl) showResultUrl(resultUrl, media);

      if (isPollSuccess(data)) {
        const elapsed = performance.now() - start;
        updateResultHeader({ ...jobMeta, elapsedMs: elapsed, jobId, status: 'success' });
        responseMeta.textContent = `${pgT('result.done', 'Completed')} · ${formatElapsed(elapsed)}`;
        logPollUsage(jobId, media, data, resultUrl);
        logUsageEvent({
          jobType: jobMeta.type,
          model: jobMeta.model,
          prompt: jobMeta.prompt,
          status: 'success',
          jobId,
          resultUrl: resultUrl || undefined,
        });
        return { success: true, data, resultUrl, elapsedMs: elapsed };
      }
      if (isPollFailed(data)) {
        const elapsed = performance.now() - start;
        updateResultHeader({ ...jobMeta, elapsedMs: elapsed, jobId, status: 'failed' });
        logPollUsage(jobId, media, data, resultUrl);
        return { success: false, data, elapsedMs: elapsed };
      }
      if (attempt >= POLL_MAX_ATTEMPTS) {
        return { success: false, timeout: true, elapsedMs: performance.now() - start };
      }
      if (jobPollGeneration === gen) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      return { success: false, error: err, elapsedMs: performance.now() - start };
    }
  }
  return { success: false, timeout: true, elapsedMs: performance.now() - start };
}

function extractCredits(data) {
  if (!data || typeof data !== 'object') return null;
  const c =
    data.balancesInfo?.credits_ai ??
    data.data?.balancesInfo?.credits_ai ??
    data.userInfo?.credits_ai;
  return typeof c === 'number' ? c : null;
}

function showCredits(credits) {
  const el = $('creditsBadge');
  if (el) {
    if (credits == null) {
      el.hidden = true;
    } else {
      el.hidden = false;
      el.textContent = `credits_ai: ${credits.toLocaleString()}`;
    }
  }
  const embed = $('embedCreditsBadge');
  if (embed) {
    if (credits == null) {
      embed.hidden = true;
    } else {
      embed.hidden = false;
      embed.textContent = `${credits.toLocaleString()} credits`;
    }
  }
}

async function fetchUserMe(statusEl, fetchOpts = {}) {
  const domain = $('loginDomain').value.trim() || '79ai.net';
  const body = new URLSearchParams({ access_token: getToken(), domain });
  appendDeviceToForm(body);
  const data = await apiFetch(
    '/ai/me',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    'POST /ai/me',
    fetchOpts,
  );
  const credits = extractCredits(data);
  showCredits(credits);
  if (statusEl) {
    setStatus(statusEl, credits != null ? `OK — ${credits.toLocaleString()} credits` : 'OK — see RESPONSE', credits != null);
  }
  return data;
}

async function sandboxApiFetch(path, init = {}) {
  const start = performance.now();
  const url = `${baseUrl()}${path}`;
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const hint =
      err.message === 'Failed to fetch'
        ? `${err.message} — is npm run dev running at ${baseUrl()}?`
        : err.message;
    return {
      ok: false,
      status: 0,
      body: { success: false, message: hint, code: 'NETWORK_ERROR' },
      ms: Math.round(performance.now() - start),
    };
  }
  const ms = Math.round(performance.now() - start);
  const ct = res.headers.get('content-type') || '';
  let body;
  if (ct.includes('application/json')) {
    body = await res.json();
  } else {
    body = { _raw: await res.text() };
  }
  const logicalFail = body && typeof body === 'object' && body.success === false;
  return { ok: res.ok && !logicalFail, status: res.status, body, ms };
}

function sandboxAuthHeaders(json = true, required = true) {
  const t = tokenEl.value.trim();
  if (!t && required) {
    throw new Error(pgT('ep.sandbox.needToken', 'Login or paste a Bearer token in Connection first.'));
  }
  const headers = {};
  if (t) headers.Authorization = `Bearer ${t}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function apiFetch(path, init = {}, label = '', opts = {}) {
  const start = performance.now();
  const url = `${baseUrl()}${path}`;
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (err?.name === 'AbortError') {
      const abortErr = new Error('Request aborted');
      abortErr.aborted = true;
      throw abortErr;
    }
    const hint =
      err.message === 'Failed to fetch'
        ? `${err.message} — is npm run dev running at ${baseUrl()}?`
        : err.message;
    showResponse({ success: false, message: hint, code: 'NETWORK_ERROR' }, {
      label,
      ms: Math.round(performance.now() - start),
    });
    throw new Error(hint);
  }
  const ms = Math.round(performance.now() - start);
  let body;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json();
  } else {
    body = { _raw: await res.text() };
  }
  showResponse(body, { status: res.status, ms, label }, opts);

  const logicalFail = body && typeof body === 'object' && body.success === false;
  if (!res.ok || logicalFail) {
    const err = new Error(apiErrorMessage(body, res.status));
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

$('mediaModelSelect')?.addEventListener('change', onMediaModelChange);

$('jobType')?.addEventListener('change', async () => {
  const type = $('jobType').value;
  updateRefUrlFieldVisibility(type);
  activateNavForPanel('media-job', type);
  await loadMediaJobForType(type, { autoFetch: true });
});

$('mediaPrompt')?.addEventListener('input', () => {
  $('mediaPrompt').dataset.userEdited = '1';
  autoGrowPrompt();
  updatePromptCount();
  refreshRequestPreview();
});

$('mediaPrompt')?.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    $('btnMediaJob')?.click();
  }
});

$('mediaWait')?.addEventListener('change', refreshRequestPreview);

$('sidebarSearch')?.addEventListener('input', (e) => {
  filterSidebar(e.target.value);
});

document.querySelectorAll('.pg-nav-item:not([disabled])').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = btn.dataset.panel;
    const jobType = btn.dataset.jobType;
    const infoKind = btn.dataset.infoKind;
    const libraryKind = btn.dataset.libraryKind;
    if (panel === 'media-job' && jobType) {
      void openMediaJobPanel(jobType);
      return;
    }
    if (panel === 'info-job' && infoKind) {
      openInfoPanel(infoKind);
      return;
    }
    if (panel === 'library' && libraryKind) {
      openLibraryPanel(libraryKind);
      return;
    }
    if (panel === 'health') {
      openHealthPanel();
      return;
    }
    document.querySelectorAll('.pg-nav-item').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.pg-panel').forEach((p) => {
      p.classList.toggle('active', p.dataset.panel === panel);
    });
    if (isEmbed) syncEmbedChromeFromState();
    refreshRequestPreview();
  });
});

document.querySelectorAll('.pg-tab[data-auth-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const id = tab.dataset.authTab;
    document.querySelectorAll('.pg-tab[data-auth-tab]').forEach((t) => t.classList.toggle('active', t === tab));
    $('auth-login').classList.toggle('active', id === 'login');
    $('auth-token').classList.toggle('active', id === 'token');
  });
});

document.querySelectorAll('.pg-tab[data-upload-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const id = tab.dataset.uploadTab;
    tab.closest('.pg-panel')?.querySelectorAll('.pg-tab[data-upload-tab]').forEach((t) => {
      t.classList.toggle('active', t === tab);
    });
    $('upload-image').classList.toggle('active', id === 'image');
    $('upload-video').classList.toggle('active', id === 'video');
    if (isEmbed) syncEmbedChromeFromState();
  });
});

$('btnCopyResponse').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getActiveCopyText());
    responseMeta.textContent = 'Copied';
    setTimeout(() => {
      if (responseMeta.textContent === 'Copied') responseMeta.textContent = '—';
    }, 1500);
  } catch {
    /* ignore */
  }
});

$('btnCancelPoll')?.addEventListener('click', () => {
  cancelActivePoll();
  const status = $('mediaJobStatus');
  setStatus(status, pgT('result.cancelled', 'Stopped tracking'), false);
});

$('btnCopyJobId')?.addEventListener('click', async () => {
  const id = activeResultJobId || $('resultHdrJobId')?.textContent?.trim();
  if (!id || id === '—') return;
  try {
    await navigator.clipboard.writeText(id);
    const btn = $('btnCopyJobId');
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1200);
    }
  } catch {
    /* ignore */
  }
});

function openResultJsonDialog(preId, title) {
  const src = $(preId);
  const dialog = $('resultJsonDialog');
  const pre = $('resultJsonDialogPre');
  const titleEl = $('resultJsonDialogTitle');
  if (!src || !dialog || !pre) return;
  const raw = GwJsonHighlight?.getRawText(src) || src.textContent || '';
  pre.textContent = raw;
  if (titleEl) titleEl.textContent = title || preId;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.hidden = false;
}

document.querySelectorAll('[data-json-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.jsonCopy;
    const el = id ? $(id) : null;
    if (!el) return;
    try {
      const raw = GwJsonHighlight?.getRawText(el) || el.textContent || '';
      await navigator.clipboard.writeText(raw);
      const prev = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1200);
    } catch {
      /* ignore */
    }
  });
});

document.querySelectorAll('[data-json-full]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.jsonFull;
    const col = btn.closest('.pg-result-json-col');
    const title = col?.querySelector('.pg-result-json-title')?.textContent?.trim();
    openResultJsonDialog(id, title);
  });
});

$('btnCloseJsonDialog')?.addEventListener('click', () => {
  const dialog = $('resultJsonDialog');
  if (dialog?.open) dialog.close();
  else if (dialog) dialog.hidden = true;
});

$('resultJsonDialog')?.addEventListener('click', (e) => {
  if (e.target === $('resultJsonDialog')) $('resultJsonDialog')?.close?.();
});

$('btnCopyGuide')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('aiGuideText')?.textContent || buildAiGuideText());
    const meta = $('responseMeta');
    if (meta) {
      meta.textContent = 'Copied guide';
      setTimeout(() => {
        if (meta.textContent === 'Copied guide') meta.textContent = '—';
      }, 1500);
    }
  } catch {
    /* ignore */
  }
});

document.querySelectorAll('.pg-copy-code').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.copyTarget;
    const el = id ? $(id) : null;
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.textContent || '');
      btn.textContent = 'Copied';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 1500);
    } catch {
      /* ignore */
    }
  });
});

$('btnCopySkill')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('aiSkillText')?.textContent || '');
  } catch {
    /* ignore */
  }
});

$('btnSaveToken').addEventListener('click', async () => {
  saveToken();
  const ok = Boolean(tokenEl.value.trim());
  setStatus($('authStatus'), ok ? 'Token saved' : 'Token cleared', ok);
  if (isEmbed && ok) {
    await afterEmbedAuth();
  }
});

$('btnLogin').addEventListener('click', async () => {
  const status = $('authStatus');
  setStatus(status, 'Logging in…', 'running');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const domain = $('loginDomain').value.trim() || '79ai.net';
  if (!email || !password) {
    setStatus(status, 'Email and password required', false);
    return;
  }
  try {
    const data = await apiFetch(
      '/gateway/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          password,
          domain,
          ...loginDevicePayload(),
        }),
      },
      'POST /gateway/auth/login',
    );
    const token = extractAccessToken(data);
    if (!token) {
      setStatus(status, 'No access_token in response — see RESPONSE panel', false);
      return;
    }
    saveToken(token);
    localStorage.setItem(STORAGE_DOMAIN, domain);
    setStatus(status, 'Login OK — token saved. Next: List models', true);
    try {
      await fetchUserMe(null);
    } catch {
      /* credits optional */
    }
    if (isEmbed) {
      await navigateEmbedWorker(activeEmbedWorkerId || 'create-image');
    }
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnFetchMe')?.addEventListener('click', async () => {
  const status = $('authStatus');
  setStatus(status, 'Fetching /ai/me…', 'running');
  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }
  try {
    await fetchUserMe(status);
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnModels').addEventListener('click', async () => {
  const type = $('modelType').value;
  const status = $('modelsStatus');
  const result = await fetchModelsForType(type, { statusEl: status, force: true });
  if (result) {
    await openMediaJobPanel(type, { autoFetch: false });
  }
});

$('btnMediaJob')?.addEventListener('click', async () => {
  const status = $('mediaJobStatus');
  abortActiveJobRequest();
  jobPollGeneration += 1;
  const pollGen = jobPollGeneration;

  const jobType = $('jobType').value;
  const modelSlugVal = $('mediaModelSelect').value;
  const prompt = $('mediaPrompt').value.trim();
  const wait = $('mediaWait').checked;
  const domain = $('loginDomain')?.value?.trim() || '79ai.net';
  const media = pollMediaForJobType(jobType);

  if (!modelSlugVal) {
    setStatus(status, 'Select modelSlug from catalog', false);
    return;
  }
  const envelope = getStoredModelsEnvelope(jobType);
  const model = normalizeModels(envelope).find((m) => m.slug === modelSlugVal);
  if (promptRequired(jobType, model) && !prompt) {
    setStatus(status, 'prompt required', false);
    return;
  }
  const mediaErr = validateMediaInputs(jobType, model);
  if (mediaErr) {
    setStatus(status, mediaErr, false);
    return;
  }

  const catalogErr = validateCatalogFields(model);
  if (catalogErr) {
    setStatus(status, catalogErr, false);
    return;
  }

  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }

  const jobAbort = new AbortController();
  activeJobAbortController = jobAbort;

  const fields = readJobFields(prompt);
  const jobMeta = {
    model: modelSlugVal,
    domain,
    type: jobType,
    prompt,
    modelObj: model,
  };

  const jobStart = performance.now();
  resetResultPanelState();
  showJobResultLayout();
  setResultPhase('sending');
  setResultStatusPill('running');
  updateResultStepper('create');
  updateResultHeader({
    ...jobMeta,
    elapsedMs: null,
    jobId: null,
    status: 'running',
  });
  displayCreateJson(buildJobRequestEcho(jobType, modelSlugVal, fields, wait));
  displayPollSkeleton(pgT('result.awaitingCreate', 'Waiting for create response…'));
  startResultElapsedTimer();
  showResultStatusBar(true, pgT('result.creating', 'Creating job…'), { showCancel: true });
  showJobProgress(true, pgT('result.creating', 'Creating job…'), 6);
  setStatus(status, pgT('result.creating', 'Creating job…'), 'running');
  responseMeta.textContent = `POST /gateway/jobs/${jobType}`;
  setSendButtonLoading(true);

  try {
    const payload = { modelSlug: modelSlugVal, wait, fields };
    const data = await apiFetch(
      `/gateway/jobs/${encodeURIComponent(jobType)}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
        signal: jobAbort.signal,
      },
      `POST /gateway/jobs/${jobType}`,
      { silent: true },
    );

    activeJobAbortController = null;
    setSendButtonLoading(false);

    if (pollGen !== jobPollGeneration) return;

    if (!wait) updateResultStepper('poll');

    if (wait) {
      const createBody = data?.data?.createEnvelope ?? data;
      displayCreateJson(createBody);
      displayPollJson(buildWaitPollView(data));
      const url = extractJobResultUrl(data, jobType);
      const jobId = extractJobId(data);
      const elapsed = performance.now() - jobStart;
      finishResultJob({ elapsedMs: elapsed });
      updateResultHeader({ ...jobMeta, elapsedMs: elapsed, jobId, status: 'success' });
      if (url) showResultUrl(url, media);
      responseMeta.textContent = `${pgT('result.done', 'Completed')} · ${formatElapsed(elapsed)}`;
      logUsageEvent({
        jobType,
        model: modelSlugVal,
        prompt,
        status: 'success',
        jobId: jobId || undefined,
        resultUrl: url || undefined,
      });
      setStatus(status, url ? '' : pgT('result.done', 'Completed'), url ? 'preview' : 'ok');
      return;
    }

    displayCreateJson(data);
    const jobId = extractJobId(data);
    updateResultHeader({ ...jobMeta, jobId, status: 'running' });
    setResultPhase('polling');
    displayPollJson({ message: pgT('result.polling', 'Polling…'), status: 'pending' });

    if ($('pollJobId') && jobId) $('pollJobId').value = jobId;
    if ($('pollMedia')) $('pollMedia').value = media;

    if (!jobId) {
      finishResultJob({ failed: true, errorStep: 'create', elapsedMs: performance.now() - jobStart });
      setStatus(status, 'No job id in create response', false);
      return;
    }

    showResultStatusBar(true, pgT('result.polling', 'Polling…'), { showCancel: true });

    if (pollGen !== jobPollGeneration) return;

    const pollOutcome = await runMediaJobPollLoop(jobId, media, jobMeta, pollGen);
    if (pollOutcome?.cancelled) return;

    if (pollOutcome?.success) {
      finishResultJob({ elapsedMs: pollOutcome.elapsedMs });
      updateResultHeader({ ...jobMeta, elapsedMs: pollOutcome.elapsedMs, jobId, status: 'success' });
      setStatus(status, '', 'preview');
    } else if (pollOutcome?.timeout) {
      finishResultJob({ failed: true, errorStep: 'poll', elapsedMs: pollOutcome.elapsedMs });
      updateResultHeader({ ...jobMeta, elapsedMs: pollOutcome.elapsedMs, jobId, status: 'failed' });
      setStatus(status, 'Poll timeout — max 80 attempts', false);
    } else {
      finishResultJob({ failed: true, errorStep: 'poll', elapsedMs: pollOutcome?.elapsedMs });
      updateResultHeader({ ...jobMeta, elapsedMs: pollOutcome?.elapsedMs, jobId, status: 'failed' });
      setStatus(status, 'Job failed — see Poll JSON', false);
    }
  } catch (err) {
    activeJobAbortController = null;
    setSendButtonLoading(false);
    if (err.aborted || err.name === 'AbortError' || pollGen !== jobPollGeneration) return;
    finishResultJob({ failed: true, errorStep: 'create', elapsedMs: performance.now() - jobStart });
    setStatus(status, err.message, false);
    if (err.body) displayCreateJson(err.body);
  }
});

$('btnMediaRefUpload')?.addEventListener('click', () => {
  $('mediaRefFile')?.click();
});

$('btnMediaRefClear')?.addEventListener('click', () => {
  const refEl = $('mediaRefUrl');
  if (refEl) refEl.value = '';
  updateRefPreview();
  refreshRequestPreview();
});

$('mediaRefUrl')?.addEventListener('input', () => {
  updateRefPreview();
  refreshRequestPreview();
});

$('mediaRefFile')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const status = $('mediaJobStatus');
  setStatus(status, 'Uploading reference…', 'running');
  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`${baseUrl()}/gateway/upload/image`, {
      method: 'POST',
      headers: authHeaders(false),
      body: form,
    });
    const body = await res.json();
    const url =
      body?.data?.url ||
      body?.data?.file_url ||
      body?.url ||
      body?.data?.imageInfo?.url;
    if (!url) throw new Error('No URL in upload response');
    const refEl = $('mediaRefUrl');
    if (refEl) refEl.value = url;
    updateRefPreview();
    setStatus(status, 'Reference uploaded', 'ok');
  } catch (err) {
    setStatus(status, err.message, false);
  } finally {
    e.target.value = '';
  }
});

$('btnPoll')?.addEventListener('click', () => {
  void runPollOnce();
});

$('btnPollLoop')?.addEventListener('click', () => {
  void runPollLoop();
});

$('btnPollStop')?.addEventListener('click', () => {
  stopPollLoop();
});

$('btnInfoJob')?.addEventListener('click', () => {
  void runInfoJob();
});

$('btnLibrary')?.addEventListener('click', () => {
  void runLibraryList();
});

$('btnHealth')?.addEventListener('click', () => {
  void runHealthCheck();
});

['infoJobId', 'infoProjectId', 'libLimit', 'libAfterId', 'libModel', 'libCategory', 'libSource', 'libProjectId'].forEach(
  (id) => {
    $(id)?.addEventListener('input', refreshProxyPanelPreview);
  },
);

$('btnAudioLists')?.addEventListener('click', async () => {
  const status = $('audioListsStatus');
  setStatus(status, 'Fetching…', 'running');
  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }
  const projectId = $('audioListsProjectId')?.value.trim();
  const path = projectId
    ? `/gateway/audio/lists?projectId=${encodeURIComponent(projectId)}`
    : '/gateway/audio/lists';
  try {
    const data = await apiFetch(path, { headers: authHeaders(false) }, 'GET /gateway/audio/lists');
    const items = data?.data;
    let firstUrl = null;
    if (Array.isArray(items)) {
      firstUrl = items.find((i) => i?.file_url)?.file_url;
    } else if (items && Array.isArray(items.items)) {
      firstUrl = items.items.find((i) => i?.file_url)?.file_url;
    }
    if (firstUrl) showResultUrl(firstUrl, 'audio');
    setStatus(status, 'OK — see RESPONSE', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnChat')?.addEventListener('click', async () => {
  const status = $('chatStatus');
  setStatus(status, 'Running…', 'running');

  const action = $('chatAction').value;
  const query = $('chatQuery').value.trim();
  const sessionId = $('chatSessionId').value.trim();

  if (!query) {
    setStatus(status, 'query required', false);
    return;
  }

  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }

  const payload = {
    action,
    query,
    messages: [{ role: 'user', text: query }],
  };
  if (sessionId) payload.sessionId = sessionId;

  try {
    if (action === 'stream') {
      await apiStreamFetch(
        '/gateway/chat',
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
        'POST /gateway/chat (stream)',
      );
      setStatus(status, 'Stream complete — see RESPONSE', true);
      return;
    }

    const start = performance.now();
    const res = await fetch(`${baseUrl()}/gateway/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const ms = Math.round(performance.now() - start);
    const ct = res.headers.get('content-type') || '';
    let body;
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      body = { _raw: await res.text() };
    }
    showResponse(body, { status: res.status, ms, label: 'POST /gateway/chat' });

    if (!res.ok || (body && typeof body === 'object' && body.success === false)) {
      throw new Error(apiErrorMessage(body, res.status));
    }

    const sid = extractChatSessionId(body);
    if (sid) {
      $('chatSessionId').value = sid;
      sessionStorage.setItem(STORAGE_CHAT_SESSION, sid);
    }
    setStatus(status, sid ? 'OK — sessionId saved' : 'OK', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnUpload')?.addEventListener('click', async () => {
  const status = $('uploadStatus');
  setStatus(status, 'Uploading…', 'running');

  const isVideo = $('upload-video').classList.contains('active');
  const fileInput = isVideo ? $('uploadVideoFile') : $('uploadImageFile');
  const file = fileInput?.files?.[0];

  if (!file) {
    setStatus(status, isVideo ? 'Select a video file' : 'Select an image file', false);
    return;
  }

  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }

  const form = new FormData();
  if (isVideo) {
    form.append('video_file', file);
  } else {
    form.append('file', file);
  }
  const fileName = $('uploadFileName').value.trim();
  if (fileName) form.append('fileName', fileName);

  const path = isVideo ? '/gateway/upload/video' : '/gateway/upload/image';
  const label = isVideo ? 'POST /gateway/upload/video' : 'POST /gateway/upload/image';

  try {
    const start = performance.now();
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    const ms = Math.round(performance.now() - start);
    let body;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      body = { _raw: await res.text() };
    }
    showResponse(body, { status: res.status, ms, label });

    if (!res.ok || (body && typeof body === 'object' && body.success === false)) {
      throw new Error(apiErrorMessage(body, res.status));
    }

    const url = extractUploadUrl(body);
    showResultUrl(url, isVideo ? 'video' : 'image');
    setStatus(status, url ? '' : 'Upload finished — check RESPONSE', url ? 'preview' : 'ok');
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnVoices')?.addEventListener('click', async () => {
  const status = $('audioStatus');
  setStatus(status, 'Fetching voices…', 'running');

  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }

  const server = $('audioServer').value;
  const query = $('audioVoiceQuery').value.trim();
  const payload = { server, page: 0 };
  if (query) payload.query = query;

  try {
    const data = await apiFetch(
      '/gateway/audio/voices',
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      },
      'POST /gateway/audio/voices',
    );
    sessionStorage.setItem(STORAGE_VOICES, JSON.stringify(data));
    const voices = parseVoicesList(data);
    populateVoiceSelect(voices);
    if (voices.length) $('audioVoiceSelect').value = voices[0].voice_id || voices[0].id_base || '';
    setStatus(
      status,
      voices.length ? `OK — ${voices.length} voices` : 'OK but 0 voices — check RESPONSE',
      voices.length > 0,
    );
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnTts')?.addEventListener('click', async () => {
  const status = $('audioStatus');
  setStatus(status, 'Running TTS…', 'running');

  const voice_id = $('audioVoiceSelect').value;
  const server = $('audioServer').value;
  const model = $('audioModel').value.trim();
  const text = $('audioText').value.trim();

  if (!voice_id) {
    setStatus(status, 'Select voice_id — fetch voices first', false);
    return;
  }
  if (!model) {
    setStatus(status, 'model required', false);
    return;
  }
  if (!text) {
    setStatus(status, 'text required', false);
    return;
  }

  try {
    getToken();
  } catch (err) {
    setStatus(status, err.message, false);
    return;
  }

  try {
    const data = await apiFetch(
      '/gateway/audio/tts',
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text, voice_id, server, model }),
      },
      'POST /gateway/audio/tts',
    );
    const url = extractTtsUrl(data);
    showResultUrl(url, 'audio');
    logUsageEvent({
      jobType: 'audio',
      model: model || 'TTS',
      prompt: text,
      status: url ? 'success' : 'success',
      resultUrl: url || undefined,
    });
    setStatus(status, url ? '' : 'TTS finished — check RESPONSE', url ? 'preview' : 'ok');
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

void (async () => {
  if (sessionStorage.getItem(STORAGE_MODELS_LEGACY) || sessionStorage.getItem(modelsStorageKey('image'))) {
    migrateLegacyModelsStorage();
  }
  if (isEmbed) {
    await initEmbedStudio();
  } else {
    const initialType = $('jobType')?.value || 'image';
    const hasToken = Boolean(tokenEl?.value?.trim());
    await loadMediaJobForType(initialType, { autoFetch: hasToken });
  }
  initGuidePanels();
  initMediaSendChrome();
  globalThis.ModelPriceUi?.init();
  refreshRequestPreview();
  updateRefUrlFieldVisibility($('jobType')?.value || 'image');
  globalThis.GatewayEndpointDetail?.init();
  playgroundBooting = false;
  restoreResponseTab();
  document.body?.classList.remove('pg-booting');
})();

if (sessionStorage.getItem(STORAGE_VOICES)) {
  try {
    populateVoiceSelect(parseVoicesList(JSON.parse(sessionStorage.getItem(STORAGE_VOICES))));
  } catch {
    /* ignore */
  }
}

function openPanelById(panelId) {
  const btn = document.querySelector(`.pg-nav-item[data-panel="${panelId}"]:not([disabled])`);
  if (btn) {
    btn.click();
    if (isEmbed) syncEmbedChromeFromState();
    return;
  }
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === panelId);
  });
  document.querySelectorAll('.pg-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panelId && !b.dataset.jobType);
  });
  if (isEmbed) syncEmbedChromeFromState();
}

async function runPendingDeepLink() {
  if (!pendingDeepLink) return;
  const { type, model, panel, worker } = pendingDeepLink;
  pendingDeepLink = null;

  if (worker && EMBED_WORKER_BY_ID.has(worker)) {
    await navigateEmbedWorker(worker);
    if (model && $('mediaModelSelect')) {
      const sel = $('mediaModelSelect');
      for (let i = 0; i < 50; i++) {
        if ([...sel.options].some((o) => o.value === model)) break;
        await sleep(100);
      }
      if ([...sel.options].some((o) => o.value === model)) {
        sel.value = model;
        onMediaModelChange();
      } else {
        sel.appendChild(new Option(model, model));
        sel.value = model;
        onMediaModelChange();
      }
    }
    return;
  }

  if (panel && panel !== 'media-job') {
    openPanelById(panel);
    return;
  }

  if (!type) return;

  await openMediaJobPanel(type);
  if (model && $('mediaModelSelect')) {
    const sel = $('mediaModelSelect');
    const has = [...sel.options].some((o) => o.value === model);
    if (!has) {
      sel.appendChild(new Option(model, model));
    }
    sel.value = model;
    onMediaModelChange();
  }
  syncWorkerToUrl();
}

function captureDeepLinkFromUrl() {
  const worker = urlParams.get('worker');
  const model = urlParams.get('model');
  if (worker && EMBED_WORKER_BY_ID.has(worker)) {
    pendingDeepLink = { worker, model: model || undefined };
    if (isEmbed && (worker === 'health' || tokenEl.value.trim())) void runPendingDeepLink();
    return;
  }

  if (!isEmbed) return;
  const type = urlParams.get('type');
  const panel = urlParams.get('panel');
  if (!type && !model && !panel) return;
  pendingDeepLink = { type, model, panel };
  if (tokenEl.value.trim()) void runPendingDeepLink();
}

captureDeepLinkFromUrl();

globalThis.baseUrl = baseUrl;
globalThis.normalizeModels = normalizeModels;
globalThis.getStoredModelsEnvelope = getStoredModelsEnvelope;
globalThis.parseModelsList = parseModelsList;
globalThis.modelSlug = modelSlug;
globalThis.CATALOG_FIELD_DEFS = CATALOG_FIELD_DEFS;
globalThis.setResponseTab = setResponseTab;
globalThis.refreshRequestPreview = refreshRequestPreview;
globalThis.openMediaJobPanel = openMediaJobPanel;
globalThis.openPanelById = openPanelById;
globalThis.openInfoPanel = openInfoPanel;
globalThis.openLibraryPanel = openLibraryPanel;
globalThis.openHealthPanel = openHealthPanel;
globalThis.sandboxApiFetch = sandboxApiFetch;
globalThis.sandboxAuthHeaders = sandboxAuthHeaders;
