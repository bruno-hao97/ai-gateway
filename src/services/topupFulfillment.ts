import { vndToCredits } from '../config.js';
import { sendCreditsToUser, MerchantBalanceError } from './creditsSend.js';
import {
  assertMerchantCanCover,
  fetchMerchantCreditsAi,
} from './merchantBalance.js';
import { getTopupOrder, sumReservedTopupCredits, updateTopupOrder } from './topupOrders.js';

function extractWebhookData(body: Record<string, unknown>): Record<string, unknown> | null {
  const nested = body.data;
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return body;
}

export async function fulfillTopupFromWebhook(body: Record<string, unknown>): Promise<{
  ok: boolean;
  message: string;
  orderCode?: number;
}> {
  const code = String(body.code ?? '');
  const data = extractWebhookData(body);
  if (!data) return { ok: true, message: 'Webhook không có data — bỏ qua' };

  const status = String(data.status ?? '').toUpperCase();
  const orderCode = Number(data.orderCode);
  const amount = Number(data.amount);

  if (code !== '00' && status !== 'PAID') {
    return { ok: true, message: `Webhook chưa PAID (code=${code}, status=${status})` };
  }
  if (!Number.isFinite(orderCode) || orderCode <= 0) {
    return { ok: true, message: 'Webhook ping — bỏ qua' };
  }

  const order = await getTopupOrder(orderCode);
  if (!order) {
    console.warn('[billing/webhook] unknown order', orderCode);
    return { ok: true, message: `Chưa có đơn pending #${orderCode}` };
  }

  if (order.status === 'credited') {
    return { ok: true, message: `Đơn #${orderCode} đã cộng credit`, orderCode };
  }

  if (Number.isFinite(amount) && amount > 0 && amount !== order.amountVnd) {
    const err = `Số tiền PayOS (${amount}) không khớp đơn (${order.amountVnd})`;
    await updateTopupOrder(orderCode, { status: 'failed', error: err });
    console.error('[billing/webhook] amount mismatch', orderCode);
    return { ok: true, message: err };
  }

  await updateTopupOrder(orderCode, {
    status: 'paid',
    paidAt: new Date().toISOString(),
    payosReference: String(data.reference || data.paymentLinkId || ''),
  });

  const credits = order.credits || vndToCredits(order.amountVnd);
  const message = `PayOS topup #${orderCode}`;

  try {
    const [merchantBalance, reservedCredits] = await Promise.all([
      fetchMerchantCreditsAi(),
      sumReservedTopupCredits(orderCode),
    ]);
    assertMerchantCanCover({
      merchantBalance,
      reservedCredits,
      creditsToSend: credits,
      bufferCredits: 0,
    });

    await sendCreditsToUser({
      username: order.username,
      value: credits,
      message,
      skipBuffer: true,
    });

    await updateTopupOrder(orderCode, {
      status: 'credited',
      creditedAt: new Date().toISOString(),
      error: undefined,
    });

    return {
      ok: true,
      message: `Đã cộng ${credits} credit cho @${order.username}`,
      orderCode,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await updateTopupOrder(orderCode, { status: 'failed', error: errMsg });
    console.error('[billing/webhook] sendCredits failed', orderCode, errMsg);
    if (err instanceof MerchantBalanceError) {
      console.error('[billing/webhook] merchant detail', err.detail);
    }
    return { ok: true, message: `Webhook PAID — lỗi cộng credit: ${errMsg}`, orderCode };
  }
}
