/** 79ai-style model price badges + detail modal (catalog prices[] only). */

const $mp = (id) => document.getElementById(id);

const PRICE_TAB_ALL = 'all';

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
let activePriceTab = PRICE_TAB_ALL;

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

function mpColHeaderKey(dim) {
  if (dim === 'ratio') return 'media.priceColRatio';
  if (dim === 'duration') return 'media.priceColDuration';
  return 'media.priceColResolution';
}

function mpColHeaderFallback(dim) {
  if (dim === 'ratio') return 'RATIO';
  if (dim === 'duration') return 'DURATION';
  return 'RESOLUTION';
}

function mpModeTabs(parsed) {
  return globalThis.ModelPricing.groupByMode(parsed.rows).filter((g) => g.mode);
}

function mpRowsForTab(parsed, activeTab) {
  if (activeTab === PRICE_TAB_ALL) return parsed.rows;
  const groups = globalThis.ModelPricing.groupByMode(parsed.rows);
  if (!parsed.hasModes) return parsed.rows;
  const group =
    groups.find((g) => g.modeKey === activeTab) ||
    groups.find((g) => g.mode) ||
    groups[0];
  return group?.rows || [];
}

function mpResolveInitialTab(parsed, selections) {
  if (!parsed.hasModes) return '__default__';
  const selMode = String(selections.mode || '').trim();
  if (selMode) {
    const hit = mpModeTabs(parsed).find((g) =>
      globalThis.ModelPricing.formatModeLabel(g.mode).toLowerCase() ===
        globalThis.ModelPricing.formatModeLabel(selMode).toLowerCase() ||
      String(g.mode).toLowerCase() === selMode.toLowerCase(),
    );
    if (hit) return hit.modeKey;
  }
  return PRICE_TAB_ALL;
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

function mpGroupForTab(parsed, activeTab) {
  if (!parsed.hasModes || activeTab === PRICE_TAB_ALL) return null;
  const groups = globalThis.ModelPricing.groupByMode(parsed.rows);
  return groups.find((g) => g.modeKey === activeTab) || null;
}

function renderPriceDetailTabs(parsed, activeTab) {
  const nav = $mp('priceDetailTabs');
  const wrap = $mp('priceDetailTabsWrap');
  if (!nav) return;

  const modeTabs = mpModeTabs(parsed);
  if (!parsed.hasModes || !modeTabs.length) {
    if (wrap) wrap.hidden = true;
    nav.hidden = true;
    nav.innerHTML = '';
    return;
  }

  const tabs = [
    { id: PRICE_TAB_ALL, label: mpT('media.priceAll', 'All') },
    ...modeTabs.map((g) => ({ id: g.modeKey, label: g.label })),
  ];

  if (wrap) wrap.hidden = false;
  nav.hidden = false;
  nav.innerHTML = tabs
    .map((t) => {
      const active = t.id === activeTab;
      const chevron =
        t.id !== PRICE_TAB_ALL
          ? '<span class="pg-price-tab-chevron" aria-hidden="true">▾</span>'
          : '';
      return `<button type="button" class="pg-price-tab${active ? ' active' : ''}" data-price-tab="${mpEscape(t.id)}" role="tab" aria-selected="${active}">
        ${mpEscape(t.label)}${chevron}
      </button>`;
    })
    .join('');
}

function renderPriceFlatTable(rows, parsedRows) {
  const loc = mpLocale();
  const sel = mpReadCatalogSelections();
  const dim = globalThis.ModelPricing.primaryRowDim(rows);
  const colKey = mpColHeaderKey(dim);
  const colLabel = mpT(colKey, mpColHeaderFallback(dim));
  const sorted = [...rows].sort((a, b) => {
    const la = globalThis.ModelPricing.rowDimValue(a, dim);
    const lb = globalThis.ModelPricing.rowDimValue(b, dim);
    return la.localeCompare(lb, undefined, { numeric: true });
  });

  if (!sorted.length) {
    return `<p class="pg-price-empty">${mpEscape(mpT('media.priceEmpty', 'No pricing rows in catalog.'))}</p>`;
  }

  return `<table class="pg-price-table">
    <thead>
      <tr>
        <th>${mpEscape(colLabel)}</th>
        <th>${mpEscape(mpT('media.priceColPrice', 'PRICE'))}</th>
      </tr>
    </thead>
    <tbody>
      ${sorted
        .map((row) => {
          const highlight = globalThis.ModelPricing.rowIsHighlighted(row, parsedRows, sel);
          return `<tr class="${highlight ? 'pg-price-row-active' : ''}">
            <td>${mpEscape(globalThis.ModelPricing.rowDimValue(row, dim))}</td>
            <td class="pg-price-cell">${mpEscape(globalThis.ModelPricing.formatCredits(row.price, loc))}</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>`;
}

function renderPriceModeBlock(group, parsedRows, opts = {}) {
  const { showHeader = true } = opts;
  const loc = mpLocale();
  const modeKicker = mpT('media.priceModeLabel', 'MODE');
  const range = globalThis.ModelPricing.formatRange(group.min, group.max, loc);
  const table = renderPriceFlatTable(group.rows, parsedRows);
  const soloClass = showHeader ? '' : ' pg-price-mode-block--solo';

  const header = showHeader
    ? `<header class="pg-price-mode-head">
        <h3 class="pg-price-mode-title">
          <span class="pg-price-mode-kicker">${mpEscape(modeKicker)}</span>
          <span class="pg-price-mode-name">${mpEscape(group.label)}</span>
        </h3>
        <span class="pg-price-mode-range">${mpEscape(range)}</span>
      </header>`
    : '';

  return `<section class="pg-price-mode-block${soloClass}">
    ${header}
    <div class="pg-price-mode-body">${table}</div>
  </section>`;
}

function renderPriceSoloBox(rows, parsedRows) {
  const table = renderPriceFlatTable(rows, parsedRows);
  if (table.startsWith('<p')) return table;
  return `<section class="pg-price-mode-block pg-price-mode-block--solo">
    <div class="pg-price-mode-body">${table}</div>
  </section>`;
}

function renderPriceGroupedByMode(parsed) {
  const groups = mpModeTabs(parsed);
  if (!groups.length) {
    return renderPriceSoloBox(parsed.rows, parsed.rows);
  }

  return groups.map((group) => renderPriceModeBlock(group, parsed.rows)).join('');
}

function renderPriceDetailBody(parsed, activeTab) {
  const body = $mp('priceDetailBody');
  if (!body) return;

  if (activeTab === PRICE_TAB_ALL && parsed.hasModes) {
    body.innerHTML = renderPriceGroupedByMode(parsed);
    return;
  }

  const group = mpGroupForTab(parsed, activeTab);
  if (group) {
    body.innerHTML = renderPriceModeBlock(group, parsed.rows, { showHeader: false });
    return;
  }

  body.innerHTML = renderPriceSoloBox(
    mpRowsForTab(parsed, activeTab),
    parsed.rows,
  );
}

function mpNormalizeActiveTab(parsed, activeTab) {
  if (!parsed.hasModes) return '__default__';
  if (activeTab === PRICE_TAB_ALL) return PRICE_TAB_ALL;
  const modeTabs = mpModeTabs(parsed);
  if (modeTabs.some((t) => t.modeKey === activeTab)) return activeTab;
  return PRICE_TAB_ALL;
}

function renderPriceDetailModal() {
  const model = activePriceModel;
  const parsed = model?.raw
    ? globalThis.ModelPricing.parseModelPrices(model.raw)
    : { rows: [], count: 0, modes: [], hasModes: false };
  const titleEl = $mp('priceDetailTitle');
  const subEl = $mp('priceDetailSubtitle');
  if (titleEl) titleEl.textContent = mpT('media.priceDetail', 'Detailed pricing');
  if (subEl && model) {
    const nodeCount = parsed.hasModes ? parsed.modes.length : 0;
    const items = mpT('media.priceItems', '{n} items').replace('{n}', String(parsed.count));
    const nodes = nodeCount
      ? mpT('media.priceNodes', '{n} nodes').replace('{n}', String(nodeCount))
      : '';
    subEl.textContent = [model.name, items, nodes].filter(Boolean).join(' · ');
  }

  activePriceTab = mpNormalizeActiveTab(parsed, activePriceTab);
  renderPriceDetailTabs(parsed, activePriceTab);
  renderPriceDetailBody(parsed, activePriceTab);
}

function openPriceDetailModal(model) {
  if (!model?.raw) return;
  const parsed = globalThis.ModelPricing.parseModelPrices(model.raw);
  if (!parsed.count) return;
  activePriceModel = model;
  activePriceTab = mpResolveInitialTab(parsed, mpReadCatalogSelections());
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
  $mp('mediaPriceFootLabel')?.addEventListener('click', () => {
    if (activePriceModel) openPriceDetailModal(activePriceModel);
  });
  $mp('mediaPriceFootLabel')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (activePriceModel) openPriceDetailModal(activePriceModel);
  });
  $mp('priceDetailClose')?.addEventListener('click', closePriceDetailModal);
  $mp('priceDetailOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'priceDetailOverlay') closePriceDetailModal();
  });
  $mp('priceDetailTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-price-tab]');
    if (!btn) return;
    activePriceTab = btn.dataset.priceTab || activePriceTab;
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
