/** Parse Gommo catalog price rows — never invent values; read from models list only. */

function mpStr(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

function mpNum(v) {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/[^\d.]/g, ''));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function mpUniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function mpFormatCredits(n, locale = 'en') {
  if (n == null || Number.isNaN(n)) return '—';
  const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
  return n.toLocaleString(loc);
}

function mpFormatRange(min, max, locale = 'en') {
  if (min == null || max == null) return '—';
  if (min === max) return mpFormatCredits(min, locale);
  return `${mpFormatCredits(min, locale)}–${mpFormatCredits(max, locale)}`;
}

function mpFormatModeLabel(mode) {
  const s = mpStr(mode);
  if (!s || s === '__default__') return '';
  if (/^relax/i.test(s)) return s.toLowerCase().includes('ed') ? s : 'Relaxed';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mpNormKey(v) {
  return mpStr(v).toLowerCase();
}

function mpDimEqual(a, b) {
  const x = mpNormKey(a);
  const y = mpNormKey(b);
  if (!x || !y) return true;
  return x === y;
}

function mpRowSpecificity(row, sel) {
  let score = 0;
  for (const key of ['mode', 'resolution', 'ratio', 'duration']) {
    const want = mpStr(sel[key]);
    const have = mpStr(row[key]);
    if (!want) continue;
    if (have && mpDimEqual(have, want)) score += 1;
    else if (have) return -1;
  }
  return score;
}

function mpRowMatches(row, sel) {
  return mpRowSpecificity(row, sel) >= 0;
}

function mpParsePriceRows(raw) {
  if (!raw || typeof raw !== 'object') return [];

  const rows = [];

  if (Array.isArray(raw.prices)) {
    for (const item of raw.prices) {
      if (!item || typeof item !== 'object') continue;
      const price = mpNum(item.price ?? item.credit ?? item.credits ?? item.cost);
      if (price == null) continue;
      rows.push({
        mode: mpStr(item.mode),
        resolution: mpStr(item.resolution),
        ratio: mpStr(item.ratio),
        duration: mpStr(item.duration),
        price,
      });
    }
  }

  if (!rows.length && Array.isArray(raw.ratio)) {
    for (const item of raw.ratio) {
      if (!item || typeof item !== 'object') continue;
      const price = mpNum(item.credit ?? item.price ?? item.credits ?? item.cost);
      if (price == null) continue;
      rows.push({
        mode: mpStr(item.mode),
        resolution: mpStr(item.resolution),
        ratio: mpStr(item.ratio ?? item.value ?? item.type),
        duration: mpStr(item.duration),
        price,
      });
    }
  }

  return rows;
}

function mpParseModelPrices(raw) {
  const rows = mpParsePriceRows(raw);
  const modeKeys = mpUniq(rows.map((r) => r.mode || '__default__'));
  const modeCounts = new Map();
  for (const key of modeKeys) {
    const count = rows.filter((r) => (r.mode || '__default__') === key).length;
    modeCounts.set(key, count);
  }
  return {
    rows,
    count: rows.length,
    modes: modeKeys.filter((k) => k !== '__default__'),
    modeCounts,
    hasModes: modeKeys.some((k) => k !== '__default__'),
  };
}

function mpResolvePrice(rows, selections = {}) {
  if (!rows?.length) return null;
  const sel = selections || {};
  let best = null;
  let bestScore = -1;
  for (const row of rows) {
    const score = mpRowSpecificity(row, sel);
    if (score < 0) continue;
    if (score > bestScore) {
      bestScore = score;
      best = row.price;
    }
  }
  if (best != null) return best;
  return Math.min(...rows.map((r) => r.price));
}

function mpGroupByMode(rows) {
  const keys = mpUniq(rows.map((r) => r.mode || '__default__'));
  return keys.map((key) => {
    const groupRows = rows.filter((r) => (r.mode || '__default__') === key);
    const prices = groupRows.map((r) => r.price);
    return {
      modeKey: key,
      mode: key === '__default__' ? '' : key,
      label: mpFormatModeLabel(key === '__default__' ? '' : key) || 'Default',
      rows: groupRows,
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  });
}

function mpRowLabel(row) {
  return (
    mpStr(row.resolution) ||
    mpStr(row.ratio) ||
    mpStr(row.duration) ||
    mpStr(row.mode) ||
    '—'
  );
}

function mpFallbackPrice(raw) {
  const n = mpNum(raw?.credit ?? raw?.credits ?? raw?.price ?? raw?.cost);
  return n;
}

globalThis.ModelPricing = {
  parseModelPrices: mpParseModelPrices,
  parsePriceRows: mpParsePriceRows,
  resolvePrice: mpResolvePrice,
  groupByMode: mpGroupByMode,
  formatCredits: mpFormatCredits,
  formatRange: mpFormatRange,
  formatModeLabel: mpFormatModeLabel,
  rowLabel: mpRowLabel,
  fallbackPrice: mpFallbackPrice,
};
