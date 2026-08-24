const STORAGE_BASE = 'portal_base_url';
const STORAGE_TOKEN = 'portal_access_token';
const STORAGE_MODELS = 'portal_last_models';

const $ = (id) => document.getElementById(id);

const baseUrlEl = $('baseUrl');
const tokenEl = $('token');
const docsNav = $('docs-nav');

baseUrlEl.value = localStorage.getItem(STORAGE_BASE) || window.location.origin;
tokenEl.value = sessionStorage.getItem(STORAGE_TOKEN) || '';

docsNav.href =
  localStorage.getItem('portal_docs_url') ||
  (location.hostname === 'localhost' ? 'http://localhost:5173' : '/');

baseUrlEl.addEventListener('change', () => {
  localStorage.setItem(STORAGE_BASE, baseUrlEl.value.replace(/\/$/, ''));
});

tokenEl.addEventListener('input', () => {
  sessionStorage.setItem(STORAGE_TOKEN, tokenEl.value.trim());
});

function baseUrl() {
  return baseUrlEl.value.trim().replace(/\/$/, '');
}

function authHeaders() {
  const token = tokenEl.value.trim();
  if (!token) throw new Error('Nhập access_token trước');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function setStatus(el, text, ok) {
  el.textContent = text;
  el.className = 'status-line' + (ok === true ? ' ok' : ok === false ? ' err' : '');
}

function prettyJson(data) {
  return JSON.stringify(data, null, 2);
}

async function gatewayFetch(path, init = {}) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, init);
  let body;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json();
  } else {
    body = { _raw: await res.text() };
  }
  if (!res.ok) {
    const msg = body?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function pickFirstModel(envelope) {
  const list = envelope?.data;
  if (!Array.isArray(list) || list.length === 0) return null;
  const m = list[0];
  const slug = m.model || m.slug || m.modelSlug;
  let ratio = m.ratios?.[0];
  if (ratio && typeof ratio === 'object') ratio = ratio.value || ratio.ratio;
  return { slug, ratio: ratio || '' };
}

$('btnModels').addEventListener('click', async () => {
  const status = $('modelsStatus');
  const output = $('modelsOutput');
  setStatus(status, 'Đang gọi…');
  output.textContent = '…';

  try {
    const type = $('modelType').value;
    const data = await gatewayFetch(`/gateway/models?type=${encodeURIComponent(type)}`, {
      headers: authHeaders(),
    });
    sessionStorage.setItem(STORAGE_MODELS, JSON.stringify(data));
    output.textContent = prettyJson(data);
    const picked = pickFirstModel(data);
    if (picked?.slug) {
      $('modelSlug').value = picked.slug;
      if (picked.ratio) $('ratio').value = picked.ratio;
    }
    setStatus(status, `OK — ${Array.isArray(data.data) ? data.data.length : '?'} models`, true);
  } catch (err) {
    output.textContent = prettyJson(err.body || { message: err.message });
    setStatus(status, err.message, false);
  }
});

$('btnFillFromModels').addEventListener('click', () => {
  const raw = sessionStorage.getItem(STORAGE_MODELS);
  if (!raw) {
    setStatus($('jobStatus'), 'Chạy Fetch models trước', false);
    return;
  }
  const picked = pickFirstModel(JSON.parse(raw));
  if (!picked?.slug) {
    setStatus($('jobStatus'), 'Không parse được model từ response', false);
    return;
  }
  $('modelSlug').value = picked.slug;
  if (picked.ratio) $('ratio').value = picked.ratio;
  setStatus($('jobStatus'), `Filled: ${picked.slug} / ${picked.ratio || '(no ratio)'}`, true);
});

$('btnJob').addEventListener('click', async () => {
  const status = $('jobStatus');
  const output = $('jobOutput');
  setStatus(status, 'Đang tạo job…');
  output.textContent = '…';

  const modelSlug = $('modelSlug').value.trim();
  const ratio = $('ratio').value.trim();
  const prompt = $('prompt').value.trim();
  const wait = $('wait').checked;

  if (!modelSlug) {
    setStatus(status, 'modelSlug bắt buộc', false);
    return;
  }
  if (!ratio) {
    setStatus(status, 'ratio bắt buộc — lấy từ models list', false);
    return;
  }
  if (!prompt) {
    setStatus(status, 'prompt bắt buộc', false);
    return;
  }

  try {
    const body = {
      modelSlug,
      wait,
      fields: { prompt, ratio },
    };
    const data = await gatewayFetch('/gateway/jobs/image', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    output.textContent = prettyJson(data);
    const url =
      data?.data?.resultUrl ||
      data?.data?.pollResult?.resultUrl ||
      data?.raw?.imageInfo?.result_url;
    setStatus(status, url ? `OK — ${url}` : 'OK', true);
  } catch (err) {
    output.textContent = prettyJson(err.body || { message: err.message });
    setStatus(status, err.message, false);
  }
});
