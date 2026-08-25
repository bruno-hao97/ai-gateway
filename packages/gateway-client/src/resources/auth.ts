import { requestForm } from '../http.js';
import type { HttpContext } from '../http.js';
import type { LoginOptions, LoginResult, MeResponse } from '../types.js';

export class AuthResource {
  constructor(private readonly ctx: HttpContext) {}

  /** POST /api/apps/go-mmo/auth/login — returns access_token and sets client token if bound. */
  async login(options: LoginOptions): Promise<LoginResult> {
    const domain = options.domain || '79ai.net';
    const body = new URLSearchParams({
      email: options.email,
      password: options.password,
      domain,
    });
    const result = await requestForm<LoginResult>(this.ctx, '/api/apps/go-mmo/auth/login', body);
    if (typeof result.access_token === 'string') {
      this.ctx.accessToken = result.access_token;
    }
    return result;
  }

  /** POST /api/apps/go-mmo/ai/me — credits and profile. */
  async me(domain = '79ai.net'): Promise<MeResponse> {
    const token = this.ctx.accessToken;
    if (!token) throw new Error('accessToken required for me()');
    const body = new URLSearchParams({ access_token: token, domain });
    return requestForm<MeResponse>(this.ctx, '/api/apps/go-mmo/ai/me', body);
  }

  setAccessToken(token: string | undefined): void {
    this.ctx.accessToken = token;
  }

  getAccessToken(): string | undefined {
    return this.ctx.accessToken;
  }
}
