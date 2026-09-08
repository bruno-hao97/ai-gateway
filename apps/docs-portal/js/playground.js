const STORAGE_BASE = 'portal_base_url';
const STORAGE_TOKEN = 'portal_access_token';
const STORAGE_MODELS_PREFIX = 'portal_models_';
const STORAGE_MODELS_LEGACY = 'portal_last_models';
const STORAGE_DOMAIN = 'portal_login_domain';
const STORAGE_CHAT_SESSION = 'portal_chat_session';
const STORAGE_VOICES = 'portal_last_voices';
const STORAGE_DEVICE_ID = 'gw_device_id';
const STORAGE_RESPONSE_TAB = 'portal_response_tab';
const RESPONSE_TABS = new Set(['request', 'result', 'endpoints', 'guide', 'skill']);
const DEFAULT_API = 'http://localhost:3001';

const $ = (id) => document.getElementById(id);

function pgT(key, fallback) {
  return globalThis.PortalI18n?.t(key, fallback) ?? fallback ?? key;
}

function pgLocale() {
  return globalThis.PortalI18n?.getLocale() || 'en';
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
  const saved = localStorage.getItem(STORAGE_BASE);
  if (saved) return saved.replace(/\/$/, '');
  const origin = window.location.origin.replace(/\/$/, '');
  const port = window.location.port;
  if (port === '3001' || port === '5173') return origin;
  return DEFAULT_API;
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
const isEmbed = urlParams.get('embed') === '1';

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

function applyEmbedChrome() {
  if (!isEmbed) return;
  document.body.classList.add('pg-embed', 'pg-studio');
}

function updateEmbedStudio(type, model) {
  if (!isEmbed) return;
  const typeEl = $('embedCrumbType');
  const modelEl = $('embedCrumbModel');
  const modelSep = $('embedCrumbModelSep');
  const connBtn = $('btnEmbedConnection');
  const onConnection = $('panel-connection')?.classList.contains('active');

  if (typeEl) {
    typeEl.textContent = onConnection
      ? pgT('embed.connection')
      : MEDIA_JOB_SHORT[type] || MEDIA_JOB_LABELS[type] || type || 'Image';
  }
  if (model && !onConnection) {
    if (modelEl) {
      modelEl.textContent = model.name || model.slug;
      modelEl.hidden = false;
    }
    if (modelSep) modelSep.hidden = false;
  } else {
    if (modelEl) modelEl.hidden = true;
    if (modelSep) modelSep.hidden = true;
  }
  if (connBtn) connBtn.classList.toggle('active', onConnection);
  document.querySelectorAll('#embedJobChips [data-job-type]').forEach((btn) => {
    const active = !onConnection && btn.dataset.jobType === type;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function updateSendPriceLabel(model) {
  const el = $('sendPriceLabel');
  if (!el) return;
  const label = model?.creditsLabel;
  if (!label || label === '—') {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = label;
}

function wireEmbedStudio() {
  if (!isEmbed) return;
  $('btnEmbedConnection')?.addEventListener('click', () => {
    const onConnection = $('panel-connection')?.classList.contains('active');
    if (onConnection) {
      void openMediaJobPanel($('jobType')?.value || 'image');
      return;
    }
    openPanelById('connection');
    updateEmbedStudio('connection', null);
  });
  $('btnEmbedDev')?.addEventListener('click', () => {
    const open = document.body.classList.toggle('pg-sidebar-open');
    $('btnEmbedDev')?.classList.toggle('active', open);
  });
  document.querySelectorAll('#embedJobChips [data-job-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void openMediaJobPanel(btn.dataset.jobType);
    });
  });
}

async function initEmbedStudio() {
  if (!isEmbed) return;
  wireEmbedStudio();
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
  void runPendingDeepLink();
}

if (isEmbed) {
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
  window.addEventListener('portal-locale-change', () => {
    PortalI18n.applyDom();
    setRequestBodyView(requestBodyRawView);
    updateTokenBadge();
    renderAiGuidePanel();
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

function displayJsonPre(el, body) {
  if (!el) return;
  if (body == null) {
    el.textContent = '—';
    return;
  }
  GwJsonHighlight?.displayInPre(el, body);
}

function showJobResultLayout() {
  if (resultEmpty) resultEmpty.hidden = true;
  const main = $('resultMain');
  if (main) main.hidden = false;
  const legacy = $('resultLegacyJsonWrap');
  if (legacy) legacy.hidden = true;
  if (!playgroundBooting) setResponseTab('result');
}

function displayCreateJson(body) {
  displayJsonPre($('resultCreateJson'), body);
}

function displayPollJson(body) {
  displayJsonPre($('resultPollJson'), body);
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

function updateResultHeader({ model, domain, type, elapsedMs }) {
  const modelEl = $('resultHdrModel');
  const domainEl = $('resultHdrDomain');
  const typeEl = $('resultHdrType');
  const elapsedEl = $('resultHdrElapsed');
  if (modelEl) modelEl.textContent = model || '—';
  if (domainEl) domainEl.textContent = domain || '—';
  if (typeEl) typeEl.textContent = type || '—';
  if (elapsedEl) elapsedEl.textContent = formatElapsed(elapsedMs);
}

function jobTypeNeedsRefUrl(jobType) {
  return /upscale|remove-bg|avatar-lipsync|edit/i.test(jobType || '');
}

function jobTypeNeedsPrompt(jobType) {
  return !jobTypeNeedsRefUrl(jobType);
}

function updateRefUrlFieldVisibility(jobType) {
  const wrap = $('mediaRefUrlWrap');
  if (!wrap) return;
  wrap.hidden = !jobTypeNeedsRefUrl(jobType);
}

function readJobFields(prompt) {
  const fields = { ...readCatalogFieldValues() };
  if (prompt) fields.prompt = prompt;
  const ref = $('mediaRefUrl')?.value?.trim();
  if (ref) fields.images = [{ url: ref }];
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
  resultLink.textContent = 'Open in new tab ↗';
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
  { field: 'ratio', label: 'Aspect ratio', keys: ['ratios', 'ratio'] },
  { field: 'mode', label: 'Mode', keys: ['modes', 'mode'] },
  { field: 'resolution', label: 'Resolution', keys: ['resolutions', 'resolution'] },
  { field: 'duration', label: 'Duration', keys: ['durations', 'duration'] },
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
    sel.innerHTML = '<option value="">Loading models…</option>';
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
      const data = await apiFetch(
        `/gateway/models?type=${encodeURIComponent(type)}`,
        { headers: authHeaders() },
        `GET /gateway/models?type=${type}`,
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

function renderCatalogFields(model) {
  const container = $('catalogFields');
  if (!container) return;
  container.innerHTML = '';
  container.className = 'pg-catalog-fields';
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

  container.className = 'pg-catalog-fields gw-job-params';
  const head = document.createElement('p');
  head.className = 'gw-job-params-head';
  head.textContent = 'Catalog parameters';
  container.appendChild(head);

  for (const { def, list } of defs) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.setAttribute('for', `cat_${def.field}`);
    label.textContent = def.label;
    const sel = document.createElement('select');
    sel.id = `cat_${def.field}`;
    sel.dataset.catalogField = def.field;
    sel.addEventListener('change', refreshRequestPreview);
    for (const opt of list) {
      sel.appendChild(new Option(opt, opt));
    }
    wrap.appendChild(label);
    wrap.appendChild(sel);
    container.appendChild(wrap);
  }
  refreshRequestPreview();
}

function onMediaModelChange() {
  const type = $('jobType')?.value || 'image';
  const slug = $('mediaModelSelect')?.value;
  const envelope = getStoredModelsEnvelope(type);
  if (!envelope || !slug) {
    renderCatalogFields(null);
    updateModelMetaBar(null);
    updateMediaJobChrome(type, null);
    return;
  }
  const model = normalizeModels(envelope).find((m) => m.slug === slug);
  renderCatalogFields(model || null);
  updateModelMetaBar(model || null);
  updateMediaJobChrome(type, model || null);
  globalThis.GatewayEndpointDetail?.refresh();
}

function updateModelMetaBar(model) {
  const bar = $('mediaModelMeta');
  if (!bar) return;
  if (!model) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const nameEl = $('mediaModelMetaName');
  const slugEl = $('mediaModelMetaSlug');
  const creditsEl = $('mediaModelMetaCredits');
  if (nameEl) nameEl.textContent = model.name;
  if (slugEl) slugEl.textContent = model.slug;
  if (creditsEl) creditsEl.textContent = model.creditsLabel || '—';
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
  const promptEl = $('mediaPrompt');
  if (promptEl && DEFAULT_PROMPTS[type] && !promptEl.dataset.userEdited) {
    promptEl.value = DEFAULT_PROMPTS[type];
  }
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

  let models = normalizeModels(getStoredModelsEnvelope(type));

  if (!models.length && autoFetch) {
    setMediaModelSelectLoading(true);
    const result = await fetchModelsForType(type, { statusEl: $('mediaJobStatus') });
    models = result?.models ?? normalizeModels(getStoredModelsEnvelope(type));
    setMediaModelSelectLoading(false);
  }

  populateMediaModelSelect(models);
  if (models.length) {
    $('mediaModelSelect').value = models[0].slug;
    onMediaModelChange();
  } else {
    renderCatalogFields(null);
    updateModelMetaBar(null);
  }
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
    responseMeta.textContent = `GET poll · ${attempt}/${POLL_MAX_ATTEMPTS}`;

    try {
      const data = await fetchPollQuiet(jobId, media);
      displayPollJson(data);
      const resultUrl = extractPollResultUrl(data);
      if (resultUrl) showResultUrl(resultUrl, media);

      if (isPollSuccess(data)) {
        const elapsed = performance.now() - start;
        showJobProgress(false);
        updateResultHeader({ ...jobMeta, elapsedMs: elapsed });
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
        return { success: true, data, resultUrl };
      }
      if (isPollFailed(data)) {
        showJobProgress(false);
        updateResultHeader({ ...jobMeta, elapsedMs: performance.now() - start });
        logPollUsage(jobId, media, data, resultUrl);
        return { success: false, data };
      }
      if (attempt >= POLL_MAX_ATTEMPTS) {
        showJobProgress(false);
        return { success: false, timeout: true };
      }
      if (jobPollGeneration === gen) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      showJobProgress(false);
      throw err;
    }
  }
  showJobProgress(false);
  return { success: false, timeout: true };
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
  refreshRequestPreview();
});

$('mediaWait')?.addEventListener('change', refreshRequestPreview);

$('sidebarSearch')?.addEventListener('input', (e) => {
  filterSidebar(e.target.value);
});

document.querySelectorAll('.pg-nav-item:not([disabled])').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = btn.dataset.panel;
    const jobType = btn.dataset.jobType;
    if (panel === 'media-job' && jobType) {
      void openMediaJobPanel(jobType);
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
    await navigator.clipboard.writeText(getActiveCopyText());
    responseMeta.textContent = 'Copied';
    setTimeout(() => {
      if (responseMeta.textContent === 'Copied') responseMeta.textContent = '—';
    }, 1500);
  } catch {
    /* ignore */
  }
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

$('btnSaveToken').addEventListener('click', () => {
  saveToken();
  setStatus($('authStatus'), tokenEl.value.trim() ? 'Token saved' : 'Token cleared', !!tokenEl.value.trim());
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
  const refUrl = $('mediaRefUrl')?.value?.trim();
  if (jobTypeNeedsPrompt(jobType) && !prompt) {
    setStatus(status, 'prompt required', false);
    return;
  }
  if (jobTypeNeedsRefUrl(jobType) && !refUrl && !prompt) {
    setStatus(status, pgT('media.refHint', 'Reference image URL required'), false);
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

  const fields = readJobFields(prompt);
  const jobMeta = {
    model: modelSlugVal,
    domain,
    type: jobType,
    prompt,
  };

  const jobStart = performance.now();
  showJobResultLayout();
  updateResultHeader({ ...jobMeta, elapsedMs: null });
  displayCreateJson(null);
  displayPollJson(null);
  showJobProgress(true, pgT('result.creating', 'Creating job…'), 6);
  setStatus(status, pgT('result.creating', 'Creating job…'), 'running');
  responseMeta.textContent = `POST /gateway/jobs/${jobType}`;

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
      { silent: true },
    );

    if (wait) {
      const createBody = data?.data?.createEnvelope ?? data;
      displayCreateJson(createBody);
      displayPollJson(buildWaitPollView(data));
      const url = extractJobResultUrl(data, jobType);
      const elapsed = performance.now() - jobStart;
      showJobProgress(false);
      updateResultHeader({ ...jobMeta, elapsedMs: elapsed });
      if (url) showResultUrl(url, media);
      responseMeta.textContent = `${pgT('result.done', 'Completed')} · ${formatElapsed(elapsed)}`;
      logUsageEvent({
        jobType,
        model: modelSlugVal,
        prompt,
        status: 'success',
        jobId: extractJobId(data) || undefined,
        resultUrl: url || undefined,
      });
      setStatus(status, url ? '' : pgT('result.done', 'Completed'), url ? 'preview' : 'ok');
      return;
    }

    displayCreateJson(data);
    displayPollJson({ message: pgT('result.polling', 'Polling…'), status: 'pending' });

    const jobId = extractJobId(data);
    if ($('pollJobId') && jobId) $('pollJobId').value = jobId;
    if ($('pollMedia')) $('pollMedia').value = media;

    if (!jobId) {
      showJobProgress(false);
      setStatus(status, 'No job id in create response', false);
      return;
    }

    if (pollGen !== jobPollGeneration) return;

    const pollOutcome = await runMediaJobPollLoop(jobId, media, jobMeta, pollGen);
    if (pollOutcome?.cancelled) return;

    if (pollOutcome?.success) {
      setStatus(status, '', 'preview');
    } else if (pollOutcome?.timeout) {
      setStatus(status, 'Poll timeout — max 80 attempts', false);
    } else {
      setStatus(status, 'Job failed — see Poll JSON', false);
    }
  } catch (err) {
    showJobProgress(false);
    setStatus(status, err.message, false);
    if (err.body) displayCreateJson(err.body);
  }
});

$('btnMediaRefUpload')?.addEventListener('click', () => {
  $('mediaRefFile')?.click();
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
    if (isEmbed && panelId === 'connection') updateEmbedStudio('connection', null);
    return;
  }
  document.querySelectorAll('.pg-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === panelId);
  });
  document.querySelectorAll('.pg-nav-item').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === panelId && !b.dataset.jobType);
  });
  if (isEmbed && panelId === 'connection') updateEmbedStudio('connection', null);
}

async function runPendingDeepLink() {
  if (!pendingDeepLink) return;
  const { type, model, panel } = pendingDeepLink;
  pendingDeepLink = null;

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
}

function captureDeepLinkFromUrl() {
  if (!isEmbed) return;
  const type = urlParams.get('type');
  const model = urlParams.get('model');
  const panel = urlParams.get('panel');
  if (!type && !model && !panel) return;
  pendingDeepLink = { type, model, panel };
  if (tokenEl.value.trim()) void runPendingDeepLink();
}

if (!isEmbed) captureDeepLinkFromUrl();

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
globalThis.sandboxApiFetch = sandboxApiFetch;
globalThis.sandboxAuthHeaders = sandboxAuthHeaders;
