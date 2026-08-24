import { Router } from 'express';
import { config, isGommoMerchantConfigured, isPayOsConfigured } from '../config.js';
import { CREDIT_PACKAGES, getCreditPackage } from '../services/creditPackages.js';
import { createTopupPayOsPayment, verifyPayOsWebhookSignature } from '../services/payos.js';
import {
  bearerAccessToken,
  PaymentIdentityError,
  verifyPaymentIdentity,
} from '../services/paymentIdentity.js';
import { fulfillTopupFromWebhook } from '../services/topupFulfillment.js';
import { createTopupOrder, getTopupOrder, sumReservedTopupCredits } from '../services/topupOrders.js';
import {
  assertMerchantCanCover,
  fetchMerchantCreditsAi,
  MerchantBalanceError,
} from '../services/merchantBalance.js';
import { sendError } from '../utils/errors.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      payosConfigured: isPayOsConfigured(),
      merchantReady: isGommoMerchantConfigured(),
      webhookUrl: config.payos.webhookUrl || null,
      returnUrl: config.payos.returnUrl,
    },
  });
});

router.get('/packages', (_req, res) => {
  res.json({ success: true, data: CREDIT_PACKAGES });
});

/** POST /billing/topup/create — Bearer user + body { username, packageId } */
router.post('/topup/create', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const packageId = String(req.body?.packageId || '').trim();
    const creditPackage = getCreditPackage(packageId);

    if (!username) {
      sendError(res, 400, 'username bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    if (!creditPackage) {
      sendError(res, 400, 'Gói credit không hợp lệ', 'VALIDATION_ERROR');
      return;
    }
    if (!isPayOsConfigured()) {
      sendError(res, 503, 'PayOS chưa cấu hình trên server', 'NOT_CONFIGURED');
      return;
    }
    if (!isGommoMerchantConfigured()) {
      sendError(res, 503, 'Merchant Gommo chưa cấu hình', 'NOT_CONFIGURED');
      return;
    }

    await verifyPaymentIdentity({
      accessToken: bearerAccessToken(String(req.headers.authorization || '')),
      expectedUsername: username,
      amountVnd: creditPackage.amountVnd,
    });

    const [merchantBalance, reservedCredits] = await Promise.all([
      fetchMerchantCreditsAi(),
      sumReservedTopupCredits(),
    ]);
    assertMerchantCanCover({
      merchantBalance,
      reservedCredits,
      creditsToSend: creditPackage.credits,
      bufferCredits: config.topup.merchantBufferCredits,
    });

    const payment = await createTopupPayOsPayment({
      username,
      amountVnd: creditPackage.amountVnd,
    });

    const order = await createTopupOrder({
      orderCode: payment.orderCode,
      username,
      packageId: creditPackage.id,
      amountVnd: creditPackage.amountVnd,
      credits: creditPackage.credits,
    });

    res.json({
      success: true,
      data: {
        ...payment,
        username,
        packageId: creditPackage.id,
        credits: creditPackage.credits,
        order,
      },
    });
  } catch (err) {
    if (err instanceof MerchantBalanceError) {
      res.status(503).json({
        success: false,
        message: err.message,
        code: 'INSUFFICIENT_CREDITS',
      });
      return;
    }
    if (err instanceof PaymentIdentityError) {
      res.status(err.status).json({
        success: false,
        message: err.message,
        code: err.code,
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing/topup/create]', message);
    sendError(res, 500, message, 'INTERNAL_ERROR');
  }
});

router.get('/topup/orders/:orderCode', async (req, res) => {
  try {
    const orderCode = Number(req.params.orderCode);
    if (!Number.isFinite(orderCode)) {
      sendError(res, 400, 'orderCode không hợp lệ', 'VALIDATION_ERROR');
      return;
    }
    const order = await getTopupOrder(orderCode);
    if (!order) {
      sendError(res, 404, 'Không tìm thấy đơn', 'VALIDATION_ERROR');
      return;
    }
    res.json({ success: true, data: order });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendError(res, 500, message, 'INTERNAL_ERROR');
  }
});

/** PayOS webhook — PAID → fulfill credits (internal sendBalances) */
router.get('/webhook/payos', (_req, res) => {
  res.json({ success: true, message: 'PayOS webhook endpoint ready' });
});

router.post('/webhook/payos', async (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const signature = String(body.signature || req.headers['x-payos-signature'] || '');

    if (!verifyPayOsWebhookSignature(body, signature)) {
      console.warn('[billing/webhook/payos] invalid signature');
      sendError(res, 400, 'Invalid PayOS signature', 'VALIDATION_ERROR');
      return;
    }

    const result = await fulfillTopupFromWebhook(body);
    if (!result.ok) {
      console.error('[billing/webhook/payos]', result.message);
    } else {
      console.log('[billing/webhook/payos]', result.message);
    }

    res.json({ success: true, message: result.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing/webhook/payos] unhandled', message);
    sendError(res, 500, message, 'INTERNAL_ERROR');
  }
});

export default router;
