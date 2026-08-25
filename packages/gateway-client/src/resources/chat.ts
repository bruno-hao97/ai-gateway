import { ensureAccessToken, requestJson, requestRaw } from '../http.js';
import type { HttpContext } from '../http.js';
import type { ChatParams, GatewayEnvelope } from '../types.js';

export class ChatResource {
  constructor(private readonly ctx: HttpContext) {}

  /** POST /gateway/chat — JSON response (action=chat or set_model). */
  async send(params: ChatParams): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * POST /gateway/chat action=stream — yields SSE chunks as strings.
   */
  async *stream(params: Omit<ChatParams, 'action'>): AsyncGenerator<string, void, unknown> {
    ensureAccessToken(this.ctx);
    const res = await requestRaw(this.ctx, '/gateway/chat', {
      method: 'POST',
      body: JSON.stringify({ ...params, action: 'stream' }),
    });

    if (!res.body) {
      const text = await res.text();
      if (text) yield text;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }
}
