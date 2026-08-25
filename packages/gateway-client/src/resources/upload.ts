import { ensureAccessToken, requestJson, toBlob } from '../http.js';
import type { HttpContext } from '../http.js';
import type { GatewayEnvelope, UploadFileInput } from '../types.js';

export class UploadResource {
  constructor(private readonly ctx: HttpContext) {}

  /** POST /gateway/upload/image — multipart field `file`. */
  async image(input: UploadFileInput): Promise<GatewayEnvelope<{ url: string }>> {
    ensureAccessToken(this.ctx);
    const form = new FormData();
    const blob = toBlob(input);
    form.append('file', blob, input.fileName);

    return requestJson(this.ctx, '/gateway/upload/image', {
      method: 'POST',
      body: form,
      headers: {},
    });
  }

  /** POST /gateway/upload/video — multipart field `video_file`. */
  async video(input: UploadFileInput): Promise<GatewayEnvelope<{ url: string }>> {
    ensureAccessToken(this.ctx);
    const form = new FormData();
    const blob = toBlob(input);
    form.append('video_file', blob, input.fileName);

    return requestJson(this.ctx, '/gateway/upload/video', {
      method: 'POST',
      body: form,
      headers: {},
    });
  }
}
