import { ensureAccessToken, requestJson } from '../http.js';
import type { HttpContext } from '../http.js';
import type { GatewayEnvelope } from '../types.js';

export interface ByokProviderInfo {
  slug: string;
  name: string;
  chatSupported: boolean;
  configured: boolean;
  credentialCount: number;
}

export interface ByokSupportedChatModel {
  gatewayModelId: string;
  byokProvider: string;
  upstreamModel: string;
  gommoServer?: string;
}

export interface ByokCredential {
  id: string;
  kind: 'provider' | 'gommo';
  providerSlug: string;
  label?: string;
  secretHint: string;
  allowedModels: string[] | null;
  priority: number;
  isFallback: boolean;
  strictOnly: boolean;
  sharedFallback: boolean;
  disabled: boolean;
  gommoDomain?: string;
  gommoUsername?: string;
  isPrimary?: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastError?: string;
}

export interface ByokPrimaryGommo {
  id: string;
  domain: string;
  username?: string;
  label?: string;
}

export interface ByokStatus {
  enabled: boolean;
  beta?: boolean;
  platformFeePercent: number;
  platformFeePerRequest?: number;
  defaultSharedFallback: boolean;
  gommoLinked: boolean;
  primaryGommo?: {
    linked: boolean;
    primary?: ByokPrimaryGommo;
  };
  providers: ByokProviderInfo[];
  supportedChatModels?: ByokSupportedChatModel[];
  ownerId: string;
}

export interface ByokUsageSummary {
  byokRequests: number;
  platformRequests: number;
  byokErrors: number;
}

export interface ByokUsageEvent {
  id: string;
  source: 'byok' | 'platform';
  route: 'chat' | 'openai';
  provider?: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  at: string;
  errorCode?: string;
}

export class ByokResource {
  constructor(private readonly ctx: HttpContext) {}

  /** GET /gateway/byok/status */
  async status(): Promise<GatewayEnvelope<ByokStatus>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/byok/status');
  }

  /** GET /gateway/byok/providers */
  async providers(): Promise<GatewayEnvelope<ByokProviderInfo[]>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/byok/providers');
  }

  /** GET /gateway/byok/credentials?kind= */
  async listCredentials(kind?: 'provider' | 'gommo'): Promise<GatewayEnvelope<ByokCredential[]>> {
    ensureAccessToken(this.ctx);
    const q = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return requestJson(this.ctx, `/gateway/byok/credentials${q}`);
  }

  /** POST /gateway/byok/credentials */
  async createCredential(params: {
    providerSlug: string;
    secret: string;
    label?: string;
    allowedModels?: string[] | null;
    sharedFallback?: boolean;
    strictOnly?: boolean;
  }): Promise<GatewayEnvelope<ByokCredential>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/byok/credentials', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** PATCH /gateway/byok/credentials/:id */
  async updateCredential(
    id: string,
    patch: Partial<
      Pick<ByokCredential, 'label' | 'sharedFallback' | 'strictOnly' | 'disabled' | 'priority'>
    >,
  ): Promise<GatewayEnvelope<ByokCredential>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, `/gateway/byok/credentials/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  /** DELETE /gateway/byok/credentials/:id */
  async deleteCredential(id: string): Promise<GatewayEnvelope<{ deleted: boolean }>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, `/gateway/byok/credentials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  /** POST /gateway/byok/credentials/:id/test */
  async testCredential(id: string): Promise<GatewayEnvelope<{ ok: boolean; message: string }>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, `/gateway/byok/credentials/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    });
  }

  /** POST /gateway/byok/gommo-accounts */
  async linkGommoAccount(params: {
    domain: string;
    access_token?: string;
    label?: string;
    setPrimary?: boolean;
  }): Promise<GatewayEnvelope<ByokCredential>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/gateway/byok/gommo-accounts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** PATCH /gateway/byok/gommo-accounts/:id/primary */
  async setPrimaryGommoAccount(id: string): Promise<GatewayEnvelope<ByokCredential>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, `/gateway/byok/gommo-accounts/${encodeURIComponent(id)}/primary`, {
      method: 'PATCH',
    });
  }

  /** GET /gateway/byok/usage */
  async usage(days = 7, limit = 50): Promise<
    GatewayEnvelope<{
      summary: ByokUsageSummary;
      events: ByokUsageEvent[];
      days: number;
    }>
  > {
    ensureAccessToken(this.ctx);
    const params = new URLSearchParams({
      days: String(days),
      limit: String(limit),
    });
    return requestJson(this.ctx, `/gateway/byok/usage?${params}`);
  }
}
