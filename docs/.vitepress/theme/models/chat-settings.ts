export type ChatMemoryMode = 'all' | 'limited';

export interface ChatSettings {
  memoryMode: ChatMemoryMode;
  /** Max user turns sent upstream when memoryMode is limited */
  memoryTurns: number;
  webSearch: boolean;
  webFetch: boolean;
  /** Use stream API for token-by-token replies (incl. Auto Router) */
  preferStream: boolean;
}

const STORAGE_KEY = 'gw_portal_chat_settings_v1';

const DEFAULTS: ChatSettings = {
  memoryMode: 'all',
  memoryTurns: 24,
  webSearch: false,
  webFetch: false,
  preferStream: false,
};

export function readChatSettings(): ChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ChatSettings>;
    return {
      memoryMode: parsed.memoryMode === 'limited' ? 'limited' : 'all',
      memoryTurns:
        typeof parsed.memoryTurns === 'number' && parsed.memoryTurns > 0
          ? Math.min(200, Math.floor(parsed.memoryTurns))
          : DEFAULTS.memoryTurns,
      webSearch: parsed.webSearch === true,
      webFetch: parsed.webFetch === true,
      preferStream: parsed.preferStream === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeChatSettings(settings: ChatSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
