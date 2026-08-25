import { createHttpContext, requestJson } from './http.js';
import type { HttpContext } from './http.js';
import { AuthResource } from './resources/auth.js';
import { AudioResource } from './resources/audio.js';
import { BillingResource } from './resources/billing.js';
import { ChatResource } from './resources/chat.js';
import { JobsResource } from './resources/jobs.js';
import { ModelsResource } from './resources/models.js';
import { UploadResource } from './resources/upload.js';
import type { GatewayClientOptions, GatewayEnvelope } from './types.js';

export class GatewayClient {
  private readonly ctx: HttpContext;

  readonly auth: AuthResource;
  readonly models: ModelsResource;
  readonly jobs: JobsResource;
  readonly chat: ChatResource;
  readonly upload: UploadResource;
  readonly audio: AudioResource;
  readonly billing: BillingResource;

  constructor(options: GatewayClientOptions = {}) {
    this.ctx = createHttpContext(options);
    this.auth = new AuthResource(this.ctx);
    this.models = new ModelsResource(this.ctx);
    this.jobs = new JobsResource(this.ctx);
    this.chat = new ChatResource(this.ctx);
    this.upload = new UploadResource(this.ctx);
    this.audio = new AudioResource(this.ctx);
    this.billing = new BillingResource(this.ctx);
  }

  /** GET /health */
  async health(): Promise<GatewayEnvelope<{ ok: boolean; merchantConfigured?: boolean }>> {
    return requestJson(this.ctx, '/health', { auth: false });
  }

  setAccessToken(token: string | undefined): void {
    this.ctx.accessToken = token;
  }

  getAccessToken(): string | undefined {
    return this.ctx.accessToken;
  }

  get baseUrl(): string {
    return this.ctx.baseUrl;
  }
}
