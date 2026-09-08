/** 79ai-style model price badges + detail modal (catalog prices[] only). */

const $mp = (id) => document.getElementById(id);

function mpT(key, fallback) {
  return globalThis.PortalI18n?.t(key, fallback) ?? fallback ?? key;
}

function mpLocale() {
  return globalThis.PortalI18n?.getLocale() || 'en';
}

function mpEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let activePriceModel = null;
let activePriceTab = 'all';

function mpReadCatalogSelections() {
  const out = {};
  document.querySelectorAll('[data-catalog-field]').forEach((sel) => {
    const key = sel.dataset.catalogField;
    const val = sel.value?.trim();
    if (key && val) out[key] = val;
  });
  return out;
}

function mpCurrentPrice(model) {
  if (!model?.raw) return null;
  const parsed = globalThis.ModelPricing.parseModelPrices(model.raw);
  if (parsed.rows.length) {
    return globalThis.ModelPricing.resolvePrice(parsed.rows, mpReadCatalogSelections());
  }
  return globalThis.ModelPricing.fallbackPrice(model.raw);
}

function mpSetBadge(el, price) {
  if (!el) return;
  if (price == null) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = globalThis.ModelPricing.formatCredits(price, mpLocale());
}

function mpUpdatePriceLinks(parsed, visible) {
  const count = parsed?.count || 0;
  const show = visible && count > 0;
  for (const id of ['btnOpenPriceList', 'btnOpenPriceListFoot', 'mediaPriceFootLabel']) {
    const el = $mp(id);
    if (el) el.hidden = !show;
  }
  for (const id of ['mediaPriceCount', 'mediaPriceFootCount']) {
    const el = $mp(id);
    if (el) el.textContent = String(count);
  }
}

function mpUpdateParamsCard(model, parsed) {
  const card = $mp('mediaParamsCard');
  const container = $mp('catalogFields');
  if (!card) return;
  const hasFields = container && container.children.length > 0;
  const hasPrices = (parsed?.count || 0) > 0;
  card.hidden = !model || (!hasFields && !hasPrices);
}

function syncModelPriceUi(model) {
  activePriceModel = model || null;
  const parsed = model?.raw ? globalThis.ModelPricing.parseModelPrices(model.raw) : { rows: [], count: 0 };
  const price = model ? mpCurrentPrice(model) : null;

  mpSetBadge($mp('mediaPriceBadge'), price);
  mpSetBadge($mp('mediaParamsPriceBadge'), price);

  const creditsEl = $mp('mediaModelMetaCredits');
  if (creditsEl) {
    if (price != null && document.body.classList.contains('pg-embed')) {
      creditsEl.hidden = true;
    } else if (price != null) {
      creditsEl.textContent = `${globalThis.ModelPricing.formatCredits(price, mpLocale())} credits`;
      creditsEl.hidden = false;
    } else if (model?.creditsLabel && model.creditsLabel !== '—') {
      creditsEl.textContent = model.creditsLabel;
      creditsEl.hidden = false;
    } else {
      creditsEl.hidden = true;
      creditsEl.textContent = '';
    }
  }

  mpUpdatePriceLinks(parsed, !!model);
  mpUpdateParamsCard(model, parsed);

  if ($mp('priceDetailOverlay') && !$mp('priceDetailOverlay').hidden) {
    renderPriceDetailModal();
  }
}

function renderPriceDetailTabs(parsed, activeTab) {
  const nav = $mp('priceDetailTabs');
  if (!nav) return;
  const tabs = [{ id: 'all', label: mpT('media.priceAll', 'All'), count: parsed.count }];
  const groups = globalThis.ModelPricing.groupByMode(parsed.rows);
  for (const g of groups) {
    if (!g.mode) continue;
    tabs.push({
      id: g.modeKey,
      label: g.label,
      count: g.rows.length,
    });
  }

  nav.innerHTML = tabs
    .map((t) => {
      const active = t.id === activeTab;
      return `<button type="button" class="pg-price-tab${active ? ' active' : ''}" data-price-tab="${mpEscape(t.id)}" role="tab" aria-selected="${active}">
        ${mpEscape(t.label)} <span class="pg-price-tab-count">${t.count}</span>
      </button>`;
    })
    .join('');
}

function renderPriceDetailBody(model, parsed, activeTab) {
  const body = $mp('priceDetailBody');
  if (!body) return;

  const groups = globalThis.ModelPricing.groupByMode(parsed.rows);
  const visible =
    activeTab === 'all'
      ? groups
      : groups.filter((g) => g.modeKey === activeTab || g.mode === activeTab);

  if (!visible.length) {
    body.innerHTML = `<p class="pg-price-empty">${mpEscape(mpT('media.priceEmpty', 'No pricing rows in catalog.'))}</p>`;
    return;
  }

  const loc = mpLocale();
  body.innerHTML = visible
    .map((g) => {
      const rows = [...g.rows].sort((a, b) => {
        const la = globalThis.ModelPricing.rowLabel(a);
        const lb = globalThis.ModelPricing.rowLabel(b);
        return la.localeCompare(lb);
      });
      const modeTitle = g.mode
        ? `${mpT('media.priceModeLabel', 'MODE')} ${mpEscape(g.label)}`
        : mpT('media.priceOptions', 'Options');
      return `<section class="pg-price-mode-block">
        <header class="pg-price-mode-head">
          <span class="pg-price-mode-title">${modeTitle}</span>
          <span class="pg-price-mode-range">${mpEscape(globalThis.ModelPricing.formatRange(g.min, g.max, loc))}</span>
        </header>
        <table class="pg-price-table">
          <thead>
            <tr>
              <th>${mpEscape(mpT('media.priceColResolution', 'RESOLUTION'))}</th>
              <th>${mpEscape(mpT('media.priceColPrice', 'PRICE'))}</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
              <td>${mpEscape(globalThis.ModelPricing.rowLabel(r))}</td>
              <td class="pg-price-cell">${mpEscape(globalThis.ModelPricing.formatCredits(r.price, loc))}</td>
            </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`;
    })
    .join('');
}

function renderPriceDetailModal() {
  const model = activePriceModel;
  const parsed = model?.raw ? globalThis.ModelPricing.parseModelPrices(model.raw) : { rows: [], count: 0, modes: [], hasModes: false };
  const titleEl = $mp('priceDetailTitle');
  const subEl = $mp('priceDetailSubtitle');
  if (titleEl) titleEl.textContent = mpT('media.priceDetail', 'Detailed pricing');
  if (subEl && model) {
    const modeCount = parsed.hasModes ? parsed.modes.length : 0;
    const items = mpT('media.priceItems', '{n} items').replace('{n}', String(parsed.count));
    const modes = modeCount
      ? mpT('media.priceModes', '{n} modes').replace('{n}', String(modeCount))
      : '';
    subEl.textContent = [model.name, items, modes].filter(Boolean).join(' · ');
  }
  renderPriceDetailTabs(parsed, activePriceTab);
  renderPriceDetailBody(model, parsed, activePriceTab);
}

function openPriceDetailModal(model) {
  if (!model?.raw) return;
  const parsed = globalThis.ModelPricing.parseModelPrices(model.raw);
  if (!parsed.count) return;
  activePriceModel = model;
  activePriceTab = 'all';
  const overlay = $mp('priceDetailOverlay');
  if (!overlay) return;
  renderPriceDetailModal();
  overlay.hidden = false;
  document.body.classList.add('pg-price-modal-open');
}

function closePriceDetailModal() {
  const overlay = $mp('priceDetailOverlay');
  if (overlay) overlay.hidden = true;
  document.body.classList.remove('pg-price-modal-open');
}

function wireModelPriceUi() {
  $mp('btnOpenPriceList')?.addEventListener('click', () => {
    if (activePriceModel) openPriceDetailModal(activePriceModel);
  });
  $mp('btnOpenPriceListFoot')?.addEventListener('click', () => {
    if (activePriceModel) openPriceDetailModal(activePriceModel);
  });
  $mp('priceDetailClose')?.addEventListener('click', closePriceDetailModal);
  $mp('priceDetailOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'priceDetailOverlay') closePriceDetailModal();
  });
  $mp('priceDetailTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-price-tab]');
    if (!btn) return;
    activePriceTab = btn.dataset.priceTab || 'all';
    renderPriceDetailModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $mp('priceDetailOverlay') && !$mp('priceDetailOverlay').hidden) {
      closePriceDetailModal();
    }
  });
  window.addEventListener('portal-locale-change', () => {
    syncModelPriceUi(activePriceModel);
  });
}

globalThis.ModelPriceUi = {
  init: wireModelPriceUi,
  sync: syncModelPriceUi,
  open: openPriceDetailModal,
  close: closePriceDetailModal,
  getActivePrice: () => (activePriceModel ? mpCurrentPrice(activePriceModel) : null),
  getActiveModel: () => activePriceModel,
};
