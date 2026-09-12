import type { ChatGatewayRequest, ChatMessage } from './gommoChat.js';
import type { OpenAiChatMessage } from './openaiChat.js';

export function modelFieldFromChatRequest(req: ChatGatewayRequest): string | undefined {
  const model = String(req.model || '').trim();
  if (!model) return undefined;
  const server = String(req.server || '').trim();
  return server ? `${model}::${server}` : model;
}

export function chatRequestToOpenAiMessages(req: ChatGatewayRequest): {
  messages: OpenAiChatMessage[];
  system?: string;
} {
  const systemParts: string[] = [];
  const custom = req.systemCustomPrompt || req.customSystemPrompt;
  if (typeof custom === 'string' && custom.trim()) {
    systemParts.push(custom.trim());
  }

  const openAiMessages: OpenAiChatMessage[] = [];
  const gommoMessages = Array.isArray(req.messages) ? req.messages : [];

  for (const msg of gommoMessages) {
    const text = String(msg.text || '').trim();
    if (!text) continue;
    if (msg.role === 'model') {
      openAiMessages.push({ role: 'assistant', content: text });
      continue;
    }
    openAiMessages.push({ role: 'user', content: text });
  }

  const query = String(req.query || '').trim();
  if (query && !openAiMessages.some((m) => m.role === 'user' && messageText(m.content) === query)) {
    openAiMessages.push({ role: 'user', content: query });
  }

  if (!openAiMessages.length && query) {
    openAiMessages.push({ role: 'user', content: query });
  }

  return {
    messages: openAiMessages,
    system: systemParts.length ? systemParts.join('\n\n') : undefined,
  };
}

function messageText(content: OpenAiChatMessage['content']): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

export function openAiMessagesWithSystem(
  messages: OpenAiChatMessage[],
  system?: string,
): OpenAiChatMessage[] {
  const out = [...messages];
  if (system?.trim()) {
    out.unshift({ role: 'system', content: system.trim() });
  }
  return out;
}

export function gommoMessagesFromOpenAi(messages: OpenAiChatMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: messageText(m.content),
    }))
    .filter((m) => m.text);
}

export function extractAssistantTextFromOpenAiResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : '';
  } catch {
    return '';
  }
}

export function extractAssistantTextFromAnthropicResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    if (!Array.isArray(parsed.content)) return '';
    return parsed.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text!)
      .join('')
      .trim();
  } catch {
    return '';
  }
}

export function readAnthropicUsage(raw: string): { tokensIn?: number; tokensOut?: number } {
  try {
    const parsed = JSON.parse(raw) as {
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      tokensIn: parsed.usage?.input_tokens,
      tokensOut: parsed.usage?.output_tokens,
    };
  } catch {
    return {};
  }
}
