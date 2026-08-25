import { ensureAccessToken, requestJson } from '../http.js';
import type { HttpContext } from '../http.js';
import type {
  BillingStatus,
  CreateTopupParams,
  CreditPackage,
  GatewayEnvelope,
  TopupOrderResult,
} from '../types.js';

export class BillingResource {
  constructor(private readonly ctx: HttpContext) {}

  /** GET /billing/status — no auth required. */
  async status(): Promise<GatewayEnvelope<BillingStatus>> {
    return requestJson(this.ctx, '/billing/status', { auth: false });
  }

  /** GET /billing/packages */
  async packages(): Promise<GatewayEnvelope<CreditPackage[]>> {
    return requestJson(this.ctx, '/billing/packages', { auth: false });
  }

  /** POST /billing/topup/create */
  async createTopup(params: CreateTopupParams): Promise<GatewayEnvelope<TopupOrderResult>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/billing/topup/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** GET /billing/topup/orders/:orderCode */
  async getOrder(orderCode: number | string): Promise<GatewayEnvelope> {
    return requestJson(this.ctx, `/billing/topup/orders/${encodeURIComponent(String(orderCode))}`, {
      auth: false,
    });
  }
}
