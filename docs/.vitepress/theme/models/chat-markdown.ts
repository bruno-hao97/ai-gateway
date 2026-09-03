/** Minimal safe markdown for assistant chat bubbles. */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) =>
    stash(`<pre class="or-chat-md-pre"><code>${code}</code></pre>`),
  );

  s = s.replace(/`([^`\n]+)`/g, (_match, code) =>
    stash(`<code class="or-chat-md-code">${code}</code>`),
  );

  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\n/g, '<br>');

  placeholders.forEach((html, i) => {
    s = s.replace(`\x00MD${i}\x00`, html);
  });

  return s;
}
