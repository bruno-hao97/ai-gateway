export interface ChatAttachment {
  type: 'image';
  url: string;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  attachments?: ChatAttachment[];
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
  return {
    type: 'image',
    url,
    name: typeof a.name === 'string' ? a.name : undefined,
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
  return {
    id,
    role,
    text,
    createdAt,
    attachments: attachments?.length ? attachments : undefined,
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
  return { id, title, createdAt, updatedAt, modelId: modelId || undefined, remote: remote || undefined };
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
  return readSessions().sort((a, b) => b.updatedAt - a.updatedAt);
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
  patch?: Partial<Pick<ChatSession, 'title' | 'modelId'>>,
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
  touchChatSession(sessionId);
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
