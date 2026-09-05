/**
 * Strip agent/workflow internal monologue from user-visible chat replies.
 * Applies to all models — upstream may put chain-of-thought in `content`, not `reasoning_content`.
 */

/** Match when the line/paragraph starts with internal phrasing. */
const INTERNAL_START_PATTERNS: RegExp[] = [
  /^người dùng\b/i,
  /^user\b.*\b(asked|asks|wants|is asking|greeted|said|is greeting)\b/i,
  /^the user\b/i,
  /^đang trả lời\b/i,
  /^đang xác định\b/i,
  /^chào lại bằng\b/i,
  /^hệ thống chỉ lưu\b/i,
  /^sẽ dùng\b/i,
  /^tôi sẽ\b/i,
  /^quyết định\b/i,
  /^không cần (dùng|gọi) tool/i,
  /^không thể gọi tool/i,
  /^no need to (use|call)\b/i,
  /^i (will|should|need to|decide|'ll)\b/i,
  /^let me (think|decide|check|analyze|consider)\b/i,
  /^reply (directly|in vietnamese|with)\b/i,
  /^moonix\b.*\b(assistant|trợ lý)\b/i,
  /^moonix\b.*\b(trả lời|reply|respond)/i,
  /^chủ nhân là\b/i,
  /^sẽ dùng pipe/i,
  /^trả lời (trực tiếp|bằng)\b/i,
  /^only (the|stored) (owner|user) (info|information)/i,
  /^chọn giữa\b/i,
  /^cần chọn\b/i,
  /^mình chỉ nhớ\b.*\busername\b/i,
  /^tool gọi không\b/i,
  /^trả về lỗi\b/i,
];

/** Technical agent lines — whole line must look internal (not embedded in user answer). */
const INTERNAL_LINE_PATTERNS: RegExp[] = [
  /\bpipe-token\b/i,
  /\bconversation\.memory\b/i,
  /\bgommo_action\b/i,
  /\bwire format\b/i,
  /\bcapabilityId\b/i,
  /\bsession_id\b/i,
  /\bsession proxy\b/i,
  /\bnative trong session\b/i,
  /\bschema cho pipe\b/i,
  /\blỗi upstream\b/i,
  /\bemit\b.*\bpipe\b/i,
];

const USER_FACING_TAIL_PATTERNS: RegExp[] = [
  /(Có\s*[—–\-]\s*mình nhớ[\s\S]*)$/i,
  /(Theo thông tin đã lưu[\s\S]*)$/i,
  /(Xin chào!?\s*Mình là[\s\S]*)$/i,
  /(Hello!?\s+I'm[\s\S]*)$/i,
  /(Chào bạn![\s\S]*)$/i,
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function looksLikeToolCallJson(block: string): boolean {
  const t = block.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return false;
  return /capabilityId|models\.read|gommo_action/i.test(t);
}

/** Remove inline agent tool-call JSON (often HTML-entity encoded) from user-visible replies. */
export function stripToolCallJson(text: string): string {
  const decoded = decodeHtmlEntities(text);
  let out = '';
  let i = 0;
  while (i < decoded.length) {
    if (decoded[i] === '{') {
      let depth = 0;
      let j = i;
      for (; j < decoded.length; j++) {
        if (decoded[j] === '{') depth++;
        else if (decoded[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      if (depth === 0 && j < decoded.length) {
        const block = decoded.slice(i, j + 1);
        if (looksLikeToolCallJson(block)) {
          i = j + 1;
          continue;
        }
      }
    }
    out += decoded[i];
    i++;
  }
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function splitLines(text: string): string[] {
  return normalizeNewlines(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  const normalized = normalizeNewlines(text);
  if (normalized.includes('\n\n')) {
    return normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }
  return splitLines(normalized);
}

function flattenToLines(text: string): string[] {
  const paragraphs = splitParagraphs(text);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.includes('\n')) {
      lines.push(...splitLines(paragraph));
    } else {
      lines.push(paragraph);
    }
  }
  return lines;
}

export function isAgentMonologueLine(line: string): boolean {
  const t = stripToolCallJson(line).trim();
  if (!t) return true;
  if (INTERNAL_START_PATTERNS.some((rx) => rx.test(t))) return true;
  if (INTERNAL_LINE_PATTERNS.some((rx) => rx.test(t))) return true;
  return false;
}

/** @deprecated use isAgentMonologueLine */
export function isAgentMonologueParagraph(paragraph: string): boolean {
  const lines = flattenToLines(paragraph);
  if (lines.length === 0) return true;
  if (lines.length === 1) return isAgentMonologueLine(lines[0]!);
  return lines.every((line) => isAgentMonologueLine(line));
}

export function looksUserFacing(line: string): boolean {
  const t = line.trim();
  if (!t || isAgentMonologueLine(t)) return false;
  if (/^(xin chào|chào\b|hello\b|hi\b|hey\b)/i.test(t)) return true;
  if (/^có\s*[—–\-]\s*mình nhớ/i.test(t)) return true;
  if (/^theo thông tin đã lưu/i.test(t)) return true;
  if (/^(\* |- |\d+\.)/.test(t)) return true;
  if (/\*\*[^*]+\*\*/.test(t)) return true;
  if (/[?!]/.test(t) && t.length >= 20) return true;
  return t.length >= 32;
}

export function extractUserFacingTail(text: string): string {
  const raw = text.trim();
  if (!raw) return '';
  for (const rx of USER_FACING_TAIL_PATTERNS) {
    const match = raw.match(rx);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return '';
}

export interface SanitizedChatReply {
  display: string;
  thoughts: string;
}

function sanitizeLines(lines: string[]): SanitizedChatReply {
  const thoughts: string[] = [];
  const display: string[] = [];

  for (const line of lines) {
    const tail = extractUserFacingTail(line);
    if (tail && tail.length < line.length) {
      const prefix = line.slice(0, line.length - tail.length).trim();
      if (prefix) thoughts.push(prefix);
      display.push(tail);
      continue;
    }
    if (isAgentMonologueLine(line)) {
      thoughts.push(line);
    } else {
      display.push(line);
    }
  }

  return {
    display: display.join('\n').trim(),
    thoughts: thoughts.join('\n').trim(),
  };
}

/** Remove agent monologue; keep user-facing lines. Never returns empty if raw has a recoverable tail. */
export function sanitizeChatReply(text: string): SanitizedChatReply {
  const raw = stripToolCallJson(text ?? '');
  if (!raw.trim()) return { display: '', thoughts: '' };

  const tail = extractUserFacingTail(raw);
  if (tail) {
    const prefix = raw.slice(0, raw.length - tail.length).trim();
    return {
      display: tail,
      thoughts: prefix,
    };
  }

  const lines = flattenToLines(raw);
  if (lines.length === 0) return { display: raw.trim(), thoughts: '' };

  let { display, thoughts } = sanitizeLines(lines);

  if (!display) {
    const facing = lines.filter((line) => looksUserFacing(line));
    if (facing.length > 0) {
      display = facing.join('\n').trim();
    }
  }

  if (!display) {
    const trailing: string[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      if (isAgentMonologueLine(line)) {
        if (trailing.length > 0) break;
        continue;
      }
      trailing.unshift(line);
      if (looksUserFacing(line)) break;
    }
    display = trailing.join('\n').trim();
  }

  if (!display) {
    const lastLine = lines[lines.length - 1]?.trim() ?? '';
    if (lastLine && !isAgentMonologueLine(lastLine)) {
      display = lastLine;
    }
  }

  return {
    display,
    thoughts: thoughts || (!display ? raw.trim() : ''),
  };
}
