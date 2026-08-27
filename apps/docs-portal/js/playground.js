const STORAGE_BASE = 'portal_base_url';
const STORAGE_TOKEN = 'portal_access_token';
const STORAGE_MODELS_PREFIX = 'portal_models_';
const STORAGE_MODELS_LEGACY = 'portal_last_models';
const STORAGE_DOMAIN = 'portal_login_domain';
const STORAGE_CHAT_SESSION = 'portal_chat_session';
const STORAGE_VOICES = 'portal_last_voices';
const DEFAULT_API = 'http://localhost:3001';

const $ = (id) => document.getElementById(id);

const baseUrlEl = $('baseUrl');
const tokenEl = $('token');
const docsNav = $('docs-nav');
const openapiNav = $('openapi-nav');
const responseOutput = $('responseOutput');
const responseMeta = $('responseMeta');
const resultPreview = $('resultPreview');
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

function defaultBaseUrl() {
  const saved = localStorage.getItem(STORAGE_BASE);
  if (saved) return saved.replace(/\/$/, '');
  const origin = window.location.origin.replace(/\/$/, '');
  const port = window.location.port;
  if (port === '3001') return origin;
  return DEFAULT_API;
}

migrateLegacyModelsStorage();

baseUrlEl.value = defaultBaseUrl();
tokenEl.value = sessionStorage.getItem(STORAGE_TOKEN) || '';
$('loginDomain').value = localStorage.getItem(STORAGE_DOMAIN) || '79ai.net';
if ($('chatSessionId')) {
  $('chatSessionId').value = sessionStorage.getItem(STORAGE_CHAT_SESSION) || '';
}

updateTokenBadge();

baseUrlEl.addEventListener('change', () => {
  localStorage.setItem(STORAGE_BASE, baseUrlEl.value.replace(/\/$/, ''));
});

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
    tokenBadge.textContent = `Token saved (${tail})`;
    tokenBadge.className = 'pg-token-badge ok';
  } else {
    tokenBadge.textContent = 'No token — login or paste Bearer token';
    tokenBadge.className = 'pg-token-badge';
  }
}

const urlParams = new URLSearchParams(window.location.search);
const isEmbed = urlParams.get('embed') === '1';

const EMBED_PARENT_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

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

function applyEmbedChrome() {
  if (!isEmbed) return;
  document.body.classList.add('pg-embed');
}

function handleEmbedTokenMessage(event) {
  if (!isEmbed || !isAllowedEmbedParent(event.origin)) return;
  const data = event.data;
  if (!data || data.type !== 'ai-gateway-token') return;
  const token = typeof data.token === 'string' ? data.token.trim() : '';
  if (!token) return;
  saveToken(token);
  if (data.domain && typeof data.domain === 'string') {
    const domain = data.domain.trim();
    if ($('loginDomain')) $('loginDomain').value = domain;
    localStorage.setItem(STORAGE_DOMAIN, domain);
  }
  runPendingDeepLink();
}

if (isEmbed) {
  applyEmbedChrome();
  window.addEventListener('message', handleEmbedTokenMessage);
}

function baseUrl() {
  const v = baseUrlEl.value.trim().replace(/\/$/, '');
  if (!v) throw new Error('Set Gateway base URL (e.g. http://localhost:3001)');
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

function setStatus(el, text, ok) {
  if (!el) return;
  el.textContent = text;
  el.className = 'status-line' + (ok === true ? ' ok' : ok === false ? ' err' : '');
}

function prettyJson(data) {
  return JSON.stringify(data, null, 2);
}

function showResponse(body, meta = {}) {
  const text = typeof body === 'string' ? body : prettyJson(body);
  responseOutput.textContent = text;
  const parts = [];
  if (meta.status) parts.push(String(meta.status));
  if (meta.ms != null) parts.push(`${meta.ms}ms`);
  if (meta.label) parts.unshift(meta.label);
  responseMeta.textContent = parts.length ? parts.join(' · ') : '—';
  hidePreviewMedia();
}

function hidePreviewMedia() {
  resultPreview.hidden = true;
  resultImage.hidden = true;
  if (resultVideo) resultVideo.hidden = true;
  if (resultAudio) resultAudio.hidden = true;
}

function showResultUrl(url) {
  if (!url) return;
  resultPreview.hidden = false;
  resultLink.href = url;
  resultLink.textContent = url;
  resultImage.hidden = true;
  if (resultVideo) resultVideo.hidden = true;
  if (resultAudio) resultAudio.hidden = true;

  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) {
    resultImage.src = url;
    resultImage.hidden = false;
  } else if (resultVideo && /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    resultVideo.src = url;
    resultVideo.hidden = false;
  } else if (resultAudio && (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url) || /\/audio/i.test(url))) {
    resultAudio.src = url;
    resultAudio.hidden = false;
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
      item.ratio ??
      item.mode ??
      item.resolution ??
      item.duration ??
      item.id ??
      item.name;
    if (v != null && String(v).trim()) return String(v).trim();
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
  { field: 'ratio', label: 'ratio', keys: ['ratios', 'ratio'] },
  { field: 'mode', label: 'mode', keys: ['modes', 'mode'] },
  { field: 'resolution', label: 'resolution', keys: ['resolutions', 'resolution'] },
  { field: 'duration', label: 'duration', keys: ['durations', 'duration'] },
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

function modelsStorageKey(type) {
  return `${STORAGE_MODELS_PREFIX}${type}`;
}

function getStoredModelsEnvelope(type) {
  const raw = sessionStorage.getItem(modelsStorageKey(type));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredModels(type, envelope) {
  sessionStorage.setItem(modelsStorageKey(type), JSON.stringify(envelope));
}

function migrateLegacyModelsStorage() {
  const legacy = sessionStorage.getItem(STORAGE_MODELS_LEGACY);
  if (legacy && !sessionStorage.getItem(modelsStorageKey('image'))) {
    sessionStorage.setItem(modelsStorageKey('image'), legacy);
  }
}

function normalizeModels(envelope) {
  return parseModelsList(envelope)
    .map((m) => {
      const slug = modelSlug(m);
      return {
        slug,
        name: m.name || slug,
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
  showResponse('(streaming…)\n', { status: res.status, label });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    showResponse(accumulated, {
      status: res.status,
      label,
      ms: Math.round(performance.now() - start),
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

function populateMediaModelSelect(models) {
  const sel = $('mediaModelSelect');
  if (!sel) return;
  sel.innerHTML = '';
  if (!models.length) {
    sel.innerHTML = '<option value="">— No models — fetch List models first —</option>';
    renderCatalogFields(null);
    return;
  }
  sel.appendChild(new Option('— Select model —', ''));
  for (const m of models) {
    sel.appendChild(new Option(m.name !== m.slug ? `${m.name} (${m.slug})` : m.slug, m.slug));
  }
}

function renderCatalogFields(model) {
  const container = $('catalogFields');
  if (!container) return;
  container.innerHTML = '';
  if (!model) return;

  for (const def of CATALOG_FIELD_DEFS) {
    const options = def.keys.flatMap((k) => model[k === 'ratios' ? 'ratios' : k === 'modes' ? 'modes' : k === 'resolutions' ? 'resolutions' : 'durations'] || []);
    // Use the normalized arrays on model object
    const list =
      def.field === 'ratio'
        ? model.ratios
        : def.field === 'mode'
          ? model.modes
          : def.field === 'resolution'
            ? model.resolutions
            : model.durations;
    if (!list?.length) continue;

    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.setAttribute('for', `cat_${def.field}`);
    label.textContent = def.label;
    const sel = document.createElement('select');
    sel.id = `cat_${def.field}`;
    sel.dataset.catalogField = def.field;
    for (const opt of list) {
      sel.appendChild(new Option(opt, opt));
    }
    wrap.appendChild(label);
    wrap.appendChild(sel);
    container.appendChild(wrap);
  }
}

function onMediaModelChange() {
  const type = $('jobType')?.value || 'image';
  const slug = $('mediaModelSelect')?.value;
  const envelope = getStoredModelsEnvelope(type);
  if (!envelope || !slug) {
    renderCatalogFields(null);
    return;
  }
  const model = normalizeModels(envelope).find((m) => m.slug === slug);
  renderCatalogFields(model || null);
}

function updateMediaJobChrome(type) {
  const title = $('mediaJobTitle');
  const endpoint = $('mediaJobEndpoint');
  if (title) title.textContent = MEDIA_JOB_LABELS[type] || 'Media job';
  if (endpoint) endpoint.textContent = `POST /gateway/jobs/${type}`;
}

function activateNavForPanel(panel, jobType) {
  document.querySelectorAll('.pg-nav-item').forEach((b) => {
    const matchPanel = b.dataset.panel === panel;
    const matchType = jobType ? b.dataset.jobType === jobType : !b.dataset.jobType;
    b.classList.toggle('active', matchPanel && matchType);
  });
}

function openMediaJobPanel(type) {
  if ($('jobType')) $('jobType').value = type;
  if ($('modelType')) $('modelType').value = type;
  loadMediaJobForType(type);
  updateMediaJobChrome(type);
  const promptEl = $('mediaPrompt');
  if (promptEl && DEFAULT_PROMPTS[type] && !promptEl.dataset.userEdited) {
    promptEl.value = DEFAULT_PROMPTS[type];
  }
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === 'media-job');
  });
  activateNavForPanel('media-job', type);
}

function loadMediaJobForType(type) {
  if ($('jobType')) $('jobType').value = type;
  const models = normalizeModels(getStoredModelsEnvelope(type));
  populateMediaModelSelect(models);
  if (models.length) {
    $('mediaModelSelect').value = models[0].slug;
    onMediaModelChange();
  }
  updateMediaJobChrome(type);
}

function readCatalogFieldValues() {
  const out = {};
  document.querySelectorAll('[data-catalog-field]').forEach((sel) => {
    const key = sel.dataset.catalogField;
    const val = sel.value?.trim();
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
      const val = $(`cat_${def.field}`)?.value?.trim();
      if (!val) return `Select ${def.label} from catalog — never guess`;
    }
  }
  return null;
}

function extractJobResultUrl(data, jobType) {
  const d = data?.data;
  if (d?.resultUrl) return d.resultUrl;
  if (d?.pollResult?.resultUrl) return d.pollResult.resultUrl;
  const raw = data?.raw ?? d?.raw ?? d?.pollResult?.raw;
  if (raw && typeof raw === 'object') {
    const info =
      raw.imageInfo || raw.videoInfo || raw.musicInfo || raw.audioInfo || raw.ttsInfo;
    if (info && typeof info === 'object') {
      return info.result_url || info.file_url || info.url || null;
    }
  }
  if (jobType === 'music' && d?.pollResult?.coverUrl) return d.pollResult.coverUrl;
  return null;
}

function extractPollResultUrl(data) {
  const d = data?.data ?? data;
  if (typeof d === 'object' && d) {
    if (d.resultUrl) return d.resultUrl;
    if (d.result_url) return d.result_url;
    if (d.file_url) return d.file_url;
    const raw = d.raw ?? data?.raw;
    if (raw && typeof raw === 'object') {
      for (const key of ['imageInfo', 'videoInfo', 'musicInfo', 'audioInfo']) {
        const info = raw[key];
        if (info && typeof info === 'object') {
          const url = info.result_url || info.file_url || info.url;
          if (url) return url;
        }
      }
    }
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
  setStatus(status, 'Polling…');
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
    if (resultUrl) showResultUrl(resultUrl);
    setStatus(status, resultUrl ? 'Done — see preview →' : 'Polled — check RESPONSE status', !!resultUrl);
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
    setStatus(status, `Polling… ${attempt}/${POLL_MAX_ATTEMPTS}`);
    try {
      const data = await requestPoll(jobId, media, label, attempt);
      const resultUrl = extractPollResultUrl(data);
      if (resultUrl) showResultUrl(resultUrl);
      if (isPollSuccess(data)) {
        setStatus(status, resultUrl ? `Done #${attempt} — preview →` : `Done #${attempt}`, true);
        break;
      }
      if (isPollFailed(data)) {
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
    data?.data?.jobId,
    data?.data?.id_base,
    data?.data?.idBase,
    data?.data?.pollResult?.idBase,
    data?.raw?.imageInfo?.id_base,
    data?.raw?.videoInfo?.id_base,
    data?.raw?.musicInfo?.id_base,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
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
  if (!el) return;
  if (credits == null) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = `credits_ai: ${credits.toLocaleString()}`;
}

async function fetchUserMe(statusEl) {
  const domain = $('loginDomain').value.trim() || '79ai.net';
  const body = new URLSearchParams({ access_token: getToken(), domain });
  const data = await apiFetch(
    '/api/apps/go-mmo/ai/me',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    'POST /ai/me',
  );
  const credits = extractCredits(data);
  showCredits(credits);
  if (statusEl) {
    setStatus(statusEl, credits != null ? `OK — ${credits.toLocaleString()} credits` : 'OK — see RESPONSE', credits != null);
  }
  return data;
}

async function apiFetch(path, init = {}, label = '') {
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
  showResponse(body, { status: res.status, ms, label });

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

$('jobType')?.addEventListener('change', () => {
  const type = $('jobType').value;
  if ($('modelType')) $('modelType').value = type;
  loadMediaJobForType(type);
  activateNavForPanel('media-job', type);
});

$('mediaPrompt')?.addEventListener('input', () => {
  $('mediaPrompt').dataset.userEdited = '1';
});

$('sidebarSearch')?.addEventListener('input', (e) => {
  filterSidebar(e.target.value);
});

document.querySelectorAll('.pg-nav-item:not([disabled])').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = btn.dataset.panel;
    const jobType = btn.dataset.jobType;
    if (panel === 'media-job' && jobType) {
      openMediaJobPanel(jobType);
      return;
    }
    document.querySelectorAll('.pg-nav-item').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.pg-panel').forEach((p) => {
      p.classList.toggle('active', p.dataset.panel === panel);
    });
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
  });
});

$('btnCopyResponse').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(responseOutput.textContent);
    responseMeta.textContent = 'Copied';
    setTimeout(() => {
      if (responseMeta.textContent === 'Copied') responseMeta.textContent = '—';
    }, 1500);
  } catch {
    /* ignore */
  }
});

$('btnSaveToken').addEventListener('click', () => {
  saveToken();
  setStatus($('authStatus'), tokenEl.value.trim() ? 'Token saved' : 'Token cleared', !!tokenEl.value.trim());
});

$('btnLogin').addEventListener('click', async () => {
  const status = $('authStatus');
  setStatus(status, 'Logging in…');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const domain = $('loginDomain').value.trim() || '79ai.net';
  if (!email || !password) {
    setStatus(status, 'Email and password required', false);
    return;
  }
  try {
    const body = new URLSearchParams({ email, password, domain });
    const data = await apiFetch(
      '/api/apps/go-mmo/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
      'POST /auth/login',
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
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnFetchMe')?.addEventListener('click', async () => {
  const status = $('authStatus');
  setStatus(status, 'Fetching /ai/me…');
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
  const status = $('modelsStatus');
  setStatus(status, 'Fetching…');
  try {
    const type = $('modelType').value;
    const data = await apiFetch(
      `/gateway/models?type=${encodeURIComponent(type)}`,
      { headers: authHeaders() },
      `GET /gateway/models?type=${type}`,
    );
    const models = normalizeModels(data);
    setStoredModels(type, data);
    openMediaJobPanel(type);
    setStatus(
      status,
      models.length ? `OK — ${models.length} models (${type})` : 'OK but 0 models parsed — check RESPONSE shape',
      models.length > 0,
    );
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnMediaJob')?.addEventListener('click', async () => {
  const status = $('mediaJobStatus');
  setStatus(status, 'Running… (wait may take 1–5 min)');

  const jobType = $('jobType').value;
  const modelSlugVal = $('mediaModelSelect').value;
  const prompt = $('mediaPrompt').value.trim();
  const wait = $('mediaWait').checked;

  if (!modelSlugVal) {
    setStatus(status, 'Select modelSlug from catalog', false);
    return;
  }
  if (!prompt) {
    setStatus(status, 'prompt required', false);
    return;
  }

  const envelope = getStoredModelsEnvelope(jobType);
  const model = normalizeModels(envelope).find((m) => m.slug === modelSlugVal);
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

  const fields = { prompt, ...readCatalogFieldValues() };

  try {
    const payload = { modelSlug: modelSlugVal, wait, fields };
    const data = await apiFetch(
      `/gateway/jobs/${encodeURIComponent(jobType)}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      },
      `POST /gateway/jobs/${jobType}`,
    );
    const url = extractJobResultUrl(data, jobType);
    showResultUrl(url);

    const jobId = extractJobId(data);
    if (jobId && !wait) {
      $('pollJobId').value = jobId;
      const pollMedia = pollMediaForJobType(jobType);
      if ($('pollMedia')) $('pollMedia').value = pollMedia;
    }

    let msg = url ? 'Done — see preview →' : 'OK';
    if (jobId && !wait) msg += ` — job id copied to Poll (${jobId.slice(0, 8)}…)`;
    setStatus(status, msg, true);
  } catch (err) {
    setStatus(status, err.message, false);
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

$('btnAudioLists')?.addEventListener('click', async () => {
  const status = $('audioListsStatus');
  setStatus(status, 'Fetching…');
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
    if (firstUrl) showResultUrl(firstUrl);
    setStatus(status, 'OK — see RESPONSE', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnChat')?.addEventListener('click', async () => {
  const status = $('chatStatus');
  setStatus(status, 'Running…');

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
  setStatus(status, 'Uploading…');

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
    showResultUrl(url);
    setStatus(status, url ? 'Done — see preview →' : 'OK', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

$('btnVoices')?.addEventListener('click', async () => {
  const status = $('audioStatus');
  setStatus(status, 'Fetching voices…');

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
  setStatus(status, 'Running TTS…');

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
    showResultUrl(url);
    setStatus(status, url ? 'Done — see preview →' : 'OK', true);
  } catch (err) {
    setStatus(status, err.message, false);
  }
});

if (sessionStorage.getItem(STORAGE_MODELS_LEGACY) || sessionStorage.getItem(modelsStorageKey('image'))) {
  migrateLegacyModelsStorage();
  const initialType = $('jobType')?.value || 'image';
  loadMediaJobForType(initialType);
  updateMediaJobChrome(initialType);
}

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
    return;
  }
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === panelId);
  });
  document.querySelectorAll('.pg-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panelId && !b.dataset.jobType);
  });
}

function runPendingDeepLink() {
  if (!pendingDeepLink) return;
  const { type, model, panel } = pendingDeepLink;
  pendingDeepLink = null;

  if (panel && panel !== 'media-job') {
    openPanelById(panel);
    return;
  }

  if (!type) return;

  openMediaJobPanel(type);
  if (model && $('mediaModelSelect')) {
    const sel = $('mediaModelSelect');
    const has = [...sel.options].some((o) => o.value === model);
    if (!has) {
      sel.appendChild(new Option(model, model));
    }
    sel.value = model;
    onMediaModelChange();
  }
}

function captureDeepLinkFromUrl() {
  if (!isEmbed) return;
  const type = urlParams.get('type');
  const model = urlParams.get('model');
  const panel = urlParams.get('panel');
  if (!type && !model && !panel) return;
  pendingDeepLink = { type, model, panel };
  if (tokenEl.value.trim()) runPendingDeepLink();
}

captureDeepLinkFromUrl();
