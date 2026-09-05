export type ChatAttachmentPurpose = 'chat' | 'job';
export type ChatJobTarget = 'image' | 'video';

export interface ChatAttachment {
  type: 'image' | 'video';
  url: string;
  name?: string;
  /** chat = hỏi agent; job = ref cho media job generate */
  purpose?: ChatAttachmentPurpose;
  /** job ref thuộc image job hay video job */
  jobTarget?: ChatJobTarget;
}

export interface ChatMessageMeta {
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  modelLabel?: string;
  jobType?: 'image' | 'video';
  imageRatio?: string;
  videoDuration?: string;
  costCredits?: number;
  balanceAfter?: number;
  reasoning?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  attachments?: ChatAttachment[];
  meta?: ChatMessageMeta;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** Chat model catalog id — see /gateway/chat-models */
  modelId?: string;
  /** Set when merged from Gommo server */
  remote?: boolean;
  /** Last message snippet for sidebar preview */
  preview?: string;
  pinned?: boolean;
  pinnedAt?: number;
}

export interface ChatBackup {
  version: 1;
  exportedAt: number;
  sessions: ChatSession[];
  messages: Record<string, ChatMessage[]>;
}

const SESSIONS_KEY = 'gw_portal_chat_sessions_v1';
const messagesKey = (sessionId: string) => `gw_portal_chat_messages_v1:${sessionId}`;

function normalizeAttachment(raw: unknown): ChatAttachment | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const url = typeof a.url === 'string' ? a.url.trim() : '';
  if (!url) return null;
  const rawType = typeof a.type === 'string' ? a.type : '';
  const type = rawType === 'video' ? 'video' : 'image';
  const purposeRaw = typeof a.purpose === 'string' ? a.purpose : '';
  const purpose = purposeRaw === 'job' ? 'job' : purposeRaw === 'chat' ? 'chat' : undefined;
  const jobTargetRaw = typeof a.jobTarget === 'string' ? a.jobTarget : '';
  const jobTarget =
    jobTargetRaw === 'video' ? 'video' : jobTargetRaw === 'image' ? 'image' : undefined;
  return {
    type,
    url,
    name: typeof a.name === 'string' ? a.name : undefined,
    purpose,
    jobTarget,
  };
}

function normalizeMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const id = typeof m.id === 'string' ? m.id.trim() : '';
  if (!id) return null;
  const role = m.role === 'assistant' || m.role === 'user' ? m.role : null;
  if (!role) return null;
  const text = typeof m.text === 'string' ? m.text : '';
  const createdAt = typeof m.createdAt === 'number' ? m.createdAt : Date.now();
  const attachments = Array.isArray(m.attachments)
    ? m.attachments.map(normalizeAttachment).filter((a): a is ChatAttachment => Boolean(a))
    : undefined;
  const metaRaw = m.meta;
  const meta =
    metaRaw && typeof metaRaw === 'object' && !Array.isArray(metaRaw)
      ? (metaRaw as ChatMessage['meta'])
      : undefined;
  return {
    id,
    role,
    text,
    createdAt,
    attachments: attachments?.length ? attachments : undefined,
    meta,
    isError: m.isError === true,
  };
}

function normalizeSession(raw: unknown): ChatSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const id = typeof s.id === 'string' ? s.id.trim() : '';
  if (!id) return null;
  const title = typeof s.title === 'string' ? s.title : 'New chat';
  const createdAt = typeof s.createdAt === 'number' ? s.createdAt : Date.now();
  const updatedAt = typeof s.updatedAt === 'number' ? s.updatedAt : createdAt;
  const modelId = typeof s.modelId === 'string' ? s.modelId.trim() : undefined;
  const remote = s.remote === true;
  const preview = typeof s.preview === 'string' ? s.preview.trim() : undefined;
  const pinned = s.pinned === true;
  const pinnedAt = typeof s.pinnedAt === 'number' ? s.pinnedAt : undefined;
  return {
    id,
    title,
    createdAt,
    updatedAt,
    modelId: modelId || undefined,
    remote: remote || undefined,
    preview: preview || undefined,
    pinned: pinned || undefined,
    pinnedAt: pinned ? pinnedAt ?? updatedAt : undefined,
  };
}

function previewFromMessages(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg.text.trim() || msg.isError) continue;
    const line = msg.text.replace(/\s+/g, ' ').trim();
    return line.length > 56 ? `${line.slice(0, 56)}…` : line;
  }
  return '';
}

function readSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSession).filter((s): s is ChatSession => Boolean(s));
  } catch {
    return [];
  }
}

function writeSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function listChatSessions(): ChatSession[] {
  return readSessions().sort((a, b) => {
    const aPin = a.pinned ? 1 : 0;
    const bPin = b.pinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    if (a.pinned && b.pinned) {
      return (b.pinnedAt ?? b.updatedAt) - (a.pinnedAt ?? a.updatedAt);
    }
    return b.updatedAt - a.updatedAt;
  });
}

export function getChatSession(sessionId: string): ChatSession | null {
  return readSessions().find((s) => s.id === sessionId) ?? null;
}

export function createChatSession(modelId?: string, id?: string): ChatSession {
  const now = Date.now();
  const session: ChatSession = {
    id: id?.trim() || crypto.randomUUID(),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    modelId: modelId?.trim() || undefined,
  };
  const sessions = readSessions();
  if (!sessions.some((s) => s.id === session.id)) {
    sessions.unshift(session);
    writeSessions(sessions);
    localStorage.setItem(messagesKey(session.id), JSON.stringify([]));
  }
  return session;
}

export function upsertChatSession(session: ChatSession, messages: ChatMessage[] = []) {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...session, updatedAt: Date.now() };
  } else {
    sessions.unshift(session);
  }
  writeSessions(sessions);
  if (messages.length) saveChatMessages(session.id, messages);
}

export function touchChatSession(
  sessionId: string,
  patch?: Partial<Pick<ChatSession, 'title' | 'modelId' | 'preview'>>,
) {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return;
  sessions[idx] = {
    ...sessions[idx],
    ...patch,
    updatedAt: Date.now(),
  };
  writeSessions(sessions);
}

export function deleteChatSession(sessionId: string) {
  writeSessions(readSessions().filter((s) => s.id !== sessionId));
  localStorage.removeItem(messagesKey(sessionId));
}

export function loadChatMessages(sessionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(messagesKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMessage).filter((m): m is ChatMessage => Boolean(m));
  } catch {
    return [];
  }
}

export function saveChatMessages(sessionId: string, messages: ChatMessage[]) {
  localStorage.setItem(messagesKey(sessionId), JSON.stringify(messages));
  const preview = previewFromMessages(messages);
  touchChatSession(sessionId, preview ? { preview } : undefined);
}

export function backfillChatSessionPreviews(): void {
  for (const session of readSessions()) {
    if (session.preview) continue;
    const preview = previewFromMessages(loadChatMessages(session.id));
    if (preview) touchChatSession(session.id, { preview });
  }
}

export function titleFromMessage(text: string): string {
  const line = text.trim().replace(/\s+/g, ' ');
  if (!line) return 'New chat';
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}

export type ChatDateGroup = 'today' | 'yesterday' | 'older';

export function chatDateGroup(updatedAt: number): ChatDateGroup {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;
  if (updatedAt >= startToday) return 'today';
  if (updatedAt >= startYesterday) return 'yesterday';
  return 'older';
}

export function groupSessionsByDate(sessions: ChatSession[]): Record<ChatDateGroup, ChatSession[]> {
  const out: Record<ChatDateGroup, ChatSession[]> = {
    today: [],
    yesterday: [],
    older: [],
  };
  for (const session of sessions) {
    out[chatDateGroup(session.updatedAt)].push(session);
  }
  return out;
}

export function chatAppPath(localePrefix: '' | '/vi', sessionId?: string): string {
  const base = `${localePrefix}/app/chat/`;
  if (!sessionId) return base;
  return `${base}?session=${encodeURIComponent(sessionId)}`;
}

export function renameChatSession(sessionId: string, title: string): void {
  const trimmed = title.trim();
  if (!trimmed || !getChatSession(sessionId)) return;
  touchChatSession(sessionId, { title: trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed });
}

export function togglePinChatSession(sessionId: string): boolean {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return false;
  const nextPinned = !sessions[idx]!.pinned;
  sessions[idx] = {
    ...sessions[idx]!,
    pinned: nextPinned || undefined,
    pinnedAt: nextPinned ? Date.now() : undefined,
  };
  writeSessions(sessions);
  return nextPinned;
}

export function duplicateChatSession(sessionId: string): ChatSession | null {
  const source = getChatSession(sessionId);
  if (!source) return null;
  const messages = loadChatMessages(sessionId);
  const copy = createChatSession(source.modelId);
  const title = source.title === 'New chat' ? 'New chat' : `${source.title} (copy)`;
  touchChatSession(copy.id, {
    title: title.length > 80 ? `${title.slice(0, 80)}…` : title,
    preview: source.preview,
  });
  const copiedMessages = messages.map((m) => ({
    ...m,
    id: crypto.randomUUID(),
    meta: m.meta ? { ...m.meta } : undefined,
    attachments: m.attachments ? m.attachments.map((a) => ({ ...a })) : undefined,
  }));
  saveChatMessages(copy.id, copiedMessages);
  return getChatSession(copy.id);
}

export function clearAllChatSessions(): void {
  for (const session of readSessions()) {
    localStorage.removeItem(messagesKey(session.id));
  }
  localStorage.removeItem(SESSIONS_KEY);
}

export function purgeRemoteChatSessions(): number {
  const sessions = readSessions();
  const remote = sessions.filter((s) => s.remote);
  writeSessions(sessions.filter((s) => !s.remote));
  for (const session of remote) {
    localStorage.removeItem(messagesKey(session.id));
  }
  return remote.length;
}

export function exportChatBackup(): ChatBackup {
  const sessions = listChatSessions();
  const messages: Record<string, ChatMessage[]> = {};
  for (const session of sessions) {
    messages[session.id] = loadChatMessages(session.id);
  }
  return { version: 1, exportedAt: Date.now(), sessions, messages };
}

export function importChatBackup(raw: string): number {
  const parsed = JSON.parse(raw) as ChatBackup;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) {
    throw new Error('Invalid backup format');
  }
  let count = 0;
  for (const session of parsed.sessions) {
    const normalized = normalizeSession(session);
    if (!normalized) continue;
    const msgs = (parsed.messages?.[normalized.id] ?? [])
      .map(normalizeMessage)
      .filter((m): m is ChatMessage => Boolean(m));
    upsertChatSession(normalized, msgs);
    count += 1;
  }
  return count;
}

export function downloadChatBackup() {
  const backup = exportChatBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
