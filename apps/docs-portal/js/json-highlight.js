/**
 * Lightweight JSON syntax highlighting for portal (no deps).
 * Escape each segment before wrapping in spans.
 */
(function (global) {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function span(cls, text) {
    return `<span class="${cls}">${escapeHtml(text)}</span>`;
  }

  function highlightJson(jsonStr) {
    let out = '';
    let i = 0;
    const len = jsonStr.length;

    while (i < len) {
      const ch = jsonStr[i];

      if (ch === '"') {
        let j = i + 1;
        while (j < len) {
          if (jsonStr[j] === '\\' && j + 1 < len) {
            j += 2;
            continue;
          }
          if (jsonStr[j] === '"') {
            j += 1;
            break;
          }
          j += 1;
        }
        const slice = jsonStr.slice(i, j);
        const keyMatch = /^\s*:/.test(jsonStr.slice(j));
        out += span(keyMatch ? 'json-key' : 'json-string', slice);
        i = j;
        continue;
      }

      if (/[0-9-]/.test(ch)) {
        let j = i + 1;
        while (j < len && /[0-9.eE+-]/.test(jsonStr[j])) j += 1;
        out += span('json-number', jsonStr.slice(i, j));
        i = j;
        continue;
      }

      if (jsonStr.startsWith('true', i)) {
        out += span('json-bool', 'true');
        i += 4;
        continue;
      }
      if (jsonStr.startsWith('false', i)) {
        out += span('json-bool', 'false');
        i += 5;
        continue;
      }
      if (jsonStr.startsWith('null', i)) {
        out += span('json-null', 'null');
        i += 4;
        continue;
      }

      if ('{}[],:'.includes(ch)) {
        out += span('json-punct', ch);
        i += 1;
        continue;
      }

      out += escapeHtml(ch);
      i += 1;
    }

    return out;
  }

  function toJsonText(data) {
    if (data == null) return '';
    if (typeof data === 'string') {
      const t = data.trim();
      if (!t) return '';
      try {
        return JSON.stringify(JSON.parse(t), null, 2);
      } catch {
        return data;
      }
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  function isJsonHighlightable(data) {
    if (data != null && typeof data === 'object') return true;
    if (typeof data !== 'string') return false;
    const t = data.trim();
    if (!t.startsWith('{') && !t.startsWith('[')) return false;
    try {
      JSON.parse(t);
      return true;
    } catch {
      return false;
    }
  }

  function setJsonPre(el, data) {
    if (!el) return '';
    const text = toJsonText(data);
    el.dataset.raw = text;
    if (!text) {
      el.classList.remove('pg-json-highlight');
      el.innerHTML = '';
      el.textContent = '';
      return '';
    }
    el.classList.add('pg-json-highlight');
    el.innerHTML = highlightJson(text);
    return text;
  }

  function setPlainPre(el, text) {
    if (!el) return '';
    el.classList.remove('pg-json-highlight');
    delete el.dataset.raw;
    el.textContent = text ?? '';
    return el.textContent;
  }

  function displayInPre(el, data) {
    if (!el) return '';
    if (isJsonHighlightable(data)) return setJsonPre(el, data);
    const text = typeof data === 'string' ? data : toJsonText(data);
    return setPlainPre(el, text);
  }

  function getRawText(el) {
    if (!el) return '';
    return el.dataset.raw ?? el.textContent ?? '';
  }

  global.GwJsonHighlight = {
    escapeHtml,
    highlightJson,
    toJsonText,
    isJsonHighlightable,
    setJsonPre,
    setPlainPre,
    displayInPre,
    getRawText,
  };
})(typeof window !== 'undefined' ? window : globalThis);
