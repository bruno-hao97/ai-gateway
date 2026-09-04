/** Minimal safe markdown for assistant chat bubbles. */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://example.invalid');
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function renderInlineMarkdown(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/`([^`\n]+)`/g, (_m, code) => `<code class="or-chat-md-code">${code}</code>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const url = String(href).trim();
    if (!isSafeUrl(url)) return label;
    return `<a class="or-chat-md-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return s;
}

function renderListBlock(lines: string[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul';
  const items = lines
    .map((line) => {
      const content = ordered
        ? line.replace(/^\d+\.\s+/, '')
        : line.replace(/^[-*]\s+/, '');
      return `<li>${renderInlineMarkdown(content)}</li>`;
    })
    .join('');
  return `<${tag} class="or-chat-md-list">${items}</${tag}>`;
}

export function renderChatMarkdown(text: string): string {
  if (!text) return '';

  const placeholders: string[] = [];
  const stash = (html: string) => {
    const key = `\x00MD${placeholders.length}\x00`;
    placeholders.push(html);
    return key;
  };

  let s = escapeHtml(text);

  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langLabel = lang ? String(lang) : '';
    return stash(
      `<div class="or-chat-md-pre-wrap">` +
        `<button type="button" class="or-chat-md-copy" data-copy-code title="Copy">Copy</button>` +
        (langLabel ? `<span class="or-chat-md-lang">${escapeHtml(langLabel)}</span>` : '') +
        `<pre class="or-chat-md-pre"><code>${code}</code></pre>` +
        `</div>`,
    );
  });

  const lines = s.split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let listLines: string[] = [];
  let listOrdered = false;

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p class="or-chat-md-p">${renderInlineMarkdown(para.join('\n'))}</p>`);
    para = [];
  };

  const flushList = () => {
    if (!listLines.length) return;
    out.push(renderListBlock(listLines, listOrdered));
    listLines = [];
  };

  for (const line of lines) {
    const ul = /^[-*]\s+/.test(line);
    const ol = /^\d+\.\s+/.test(line);
    if (ul || ol) {
      flushPara();
      const ordered = ol;
      if (listLines.length && listOrdered !== ordered) flushList();
      listOrdered = ordered;
      listLines.push(line);
      continue;
    }
    flushList();
    if (!line.trim()) {
      flushPara();
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushPara();
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      const content = line.replace(/^#{1,3}\s+/, '');
      out.push(`<${tag} class="or-chat-md-heading">${renderInlineMarkdown(content)}</${tag}>`);
      continue;
    }
    para.push(line);
  }
  flushList();
  flushPara();

  let html = out.join('');

  placeholders.forEach((block, i) => {
    html = html.replace(`\x00MD${i}\x00`, block);
  });

  return html || `<p class="or-chat-md-p">${renderInlineMarkdown(text)}</p>`;
}
