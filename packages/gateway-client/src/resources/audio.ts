import { ensureAccessToken, requestJson } from '../http.js';
import type { HttpContext } from '../http.js';
import type { GatewayEnvelope, SearchVoicesParams, TtsParams } from '../types.js';

export class AudioResource {
  constructor(private readonly ctx: HttpContext) {}

  /** POST /gateway/audio/voices */
  async searchVoices(params: SearchVoicesParams): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/audio/voices', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** POST /gateway/audio/tts */
  async tts(params: TtsParams): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/audio/tts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** GET /gateway/audio/lists */
  async lists(projectId = 'default'): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    return requestJson(
      this.ctx,
      `/gateway/audio/lists?projectId=${encodeURIComponent(projectId)}`,
    );
  }
}
