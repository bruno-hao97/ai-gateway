import { ensureAccessToken, requestJson } from '../http.js';
import type { HttpContext } from '../http.js';
import type {
  BillingStatus,
  CreateTopupParams,
  CreditPackage,
  GatewayEnvelope,
  PaymentSyncResult,
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

  /** POST /billing/topup/create — legacy PayOS + sendBalances */
  async createTopup(params: CreateTopupParams): Promise<GatewayEnvelope<TopupOrderResult>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/billing/topup/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** POST /billing/payment/create — Gommo create_payment proxy */
  async createPayment(params: {
    username: string;
    packageId: string;
    invoiceBuyer?: Record<string, unknown>;
    promoCode?: string;
    referralCode?: string;
    device_id?: string;
    device_name?: string;
    device_info?: string;
  }): Promise<GatewayEnvelope<TopupOrderResult>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/billing/payment/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** POST /billing/payment/sync — Gommo payment_sync proxy */
  async syncPayment(params: {
    orderCode: string;
    device_id?: string;
    device_name?: string;
    device_info?: string;
  }): Promise<GatewayEnvelope<PaymentSyncResult>> {
    ensureAccessToken(this.ctx);
    return requestJson(this.ctx, '/billing/payment/sync', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** GET /billing/topup/orders?username=&limit= */
  async listOrders(
    username: string,
    limit = 20,
  ): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    const params = new URLSearchParams({ username, limit: String(limit) });
    return requestJson(this.ctx, `/billing/topup/orders?${params}`);
  }

  /** GET /billing/topup/orders/:orderCode */
  async getOrder(orderCode: number | string): Promise<GatewayEnvelope> {
    return requestJson(this.ctx, `/billing/topup/orders/${encodeURIComponent(String(orderCode))}`, {
      auth: false,
    });
  }
}
