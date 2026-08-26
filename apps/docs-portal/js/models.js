import {
  JOB_TYPES,
  STORAGE_BASE,
  STORAGE_DOMAIN,
  defaultBaseUrl,
  docsUrl,
  extractAccessToken,
  fetchModelsCatalog,
  getStoredModelsEnvelope,
  getStoredToken,
  normalizeModels,
  setStoredToken,
} from './portal-shared.js';

const $ = (id) => document.getElementById(id);

const baseUrlEl = $('baseUrl');
const tokenEl = $('token');
const searchEl = $('search');
const typeTabsEl = $('typeTabs');
const gridEl = $('modelGrid');
const authStatusEl = $('authStatus');
const resultCountEl = $('resultCount');
const lastFetchEl = $('lastFetch');

let activeType = 'image';
let models = [];
let lastFetchAt = null;

document.getElementById('docs-nav').href = docsUrl();

baseUrlEl.value = defaultBaseUrl();
tokenEl.value = getStoredToken();
$('loginDomain').value = localStorage.getItem(STORAGE_DOMAIN) || '79ai.net';

baseUrlEl.addEventListener('change', () => {
  localStorage.setItem(STORAGE_BASE, baseUrlEl.value.replace(/\/$/, ''));
});

tokenEl.addEventListener('input', () => setStoredToken(tokenEl.value));

function baseUrl() {
  const v = baseUrlEl.value.trim().replace(/\/$/, '');
  if (!v) throw new Error('Set gateway base URL');
  return v;
}

function optionalToken() {
  const t = tokenEl.value.trim();
  return t || null;
}

function setAuthStatus(text, ok) {
  authStatusEl.textContent = text;
  authStatusEl.className = 'mc-status' + (ok === true ? ' ok' : ok === false ? ' err' : '');
}

function typeFromQuery() {
  const q = new URLSearchParams(location.search).get('type');
  return JOB_TYPES.some((t) => t.id === q) ? q : 'image';
}

function setActiveType(type) {
  activeType = type;
  for (const btn of typeTabsEl.querySelectorAll('.mc-type-tab')) {
    btn.classList.toggle('active', btn.dataset.type === type);
  }
  const url = new URL(location.href);
  url.searchParams.set('type', type);
  history.replaceState(null, '', url);
  loadFromCacheOrEmpty();
  refreshCatalog();
}

function renderTypeTabs() {
  typeTabsEl.innerHTML = '';
  for (const t of JOB_TYPES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mc-type-tab' + (t.id === activeType ? ' active' : '');
    btn.dataset.type = t.id;
    btn.setAttribute('role', 'tab');
    btn.textContent = t.label;
    btn.addEventListener('click', () => setActiveType(t.id));
    typeTabsEl.appendChild(btn);
  }
}

function filterModels(list) {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (m) =>
      m.slug.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q),
  );
}

function tagRow(label, values) {
  if (!values?.length) return '';
  const shown = values.slice(0, 4);
  const extra = values.length > 4 ? ` +${values.length - 4}` : '';
  return `<span class="mc-tag"><strong>${label}</strong> ${shown.join(', ')}${extra}</span>`;
}

function renderGrid() {
  const filtered = filterModels(models);
  resultCountEl.textContent = filtered.length
    ? `${filtered.length} model${filtered.length === 1 ? '' : 's'} (${activeType})`
    : models.length
      ? `0 matches (${models.length} total for ${activeType})`
      : `No models for ${activeType}`;

  if (lastFetchAt) {
    lastFetchEl.textContent = `Updated ${lastFetchAt.toLocaleTimeString()}`;
  } else {
    lastFetchEl.textContent = '';
  }

  if (!filtered.length) {
    gridEl.innerHTML = `
      <div class="mc-empty">
        <p>${models.length ? 'No models match your search.' : 'Could not load catalog — check gateway is running.'}</p>
        <p><a href="playground.html">Playground</a> · <a href="#" id="empty-docs">Docs — Models</a></p>
      </div>`;
    const docs = docsUrl().replace(/\/$/, '');
    $('empty-docs').href = `${docs}/models/`;
    return;
  }

  gridEl.innerHTML = filtered
    .map(
      (m) => `
    <article class="mc-card">
      <div class="mc-card-head">
        <h2 class="mc-card-name">${escapeHtml(m.name)}</h2>
        <span class="mc-card-type">${escapeHtml(activeType)}</span>
      </div>
      <p class="mc-card-slug">${escapeHtml(m.slug)}</p>
      ${m.description ? `<p class="mc-card-desc">${escapeHtml(m.description)}</p>` : ''}
      <div class="mc-tags">
        ${tagRow('ratio', m.ratios)}
        ${tagRow('mode', m.modes)}
        ${tagRow('res', m.resolutions)}
        ${tagRow('dur', m.durations)}
      </div>
      <div class="mc-card-actions">
        <a href="playground.html">Try in Playground →</a>
      </div>
    </article>`,
    )
    .join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadFromCacheOrEmpty() {
  const cached = getStoredModelsEnvelope(activeType);
  models = cached ? normalizeModels(cached) : [];
  renderGrid();
}

async function refreshCatalog() {
  resultCountEl.textContent = 'Loading…';
  try {
    const { models: list } = await fetchModelsCatalog(baseUrl(), optionalToken(), activeType, 'en');
    models = list;
    lastFetchAt = new Date();
    renderGrid();
  } catch (err) {
    resultCountEl.textContent = `Error: ${err.message}`;
    renderGrid();
  }
}

$('btnFetch').addEventListener('click', () => refreshCatalog());

$('btnLogin').addEventListener('click', async () => {
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const domain = $('loginDomain').value.trim() || '79ai.net';
  if (!email || !password) {
    setAuthStatus('Email and password required', false);
    return;
  }
  setAuthStatus('Logging in…');
  try {
    const res = await fetch(`${baseUrl()}/api/apps/go-mmo/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password, domain }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `${res.status} login failed`);
    const token = extractAccessToken(data);
    if (!token) throw new Error('No access_token in response');
    tokenEl.value = token;
    setStoredToken(token);
    localStorage.setItem(STORAGE_DOMAIN, domain);
    setAuthStatus('Login OK — token saved for Playground', true);
  } catch (err) {
    setAuthStatus(err.message, false);
  }
});

searchEl.addEventListener('input', () => renderGrid());

activeType = typeFromQuery();
renderTypeTabs();
loadFromCacheOrEmpty();
refreshCatalog();
