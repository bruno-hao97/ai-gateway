import type { ChatMemoryMode } from './chat-settings';

/** Keep the last N user turns (and their assistant replies) for upstream context. */
export function sliceHistoryForUpstream<T extends { role: string }>(
  messages: T[],
  mode: ChatMemoryMode,
  maxTurns: number,
): T[] {
  if (mode === 'all' || maxTurns <= 0) return messages;
  if (messages.length === 0) return messages;

  let userTurns = 0;
  let startIdx = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      userTurns += 1;
      if (userTurns > maxTurns) break;
      startIdx = i;
    }
  }

  return messages.slice(startIdx);
}
