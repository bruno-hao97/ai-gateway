import { Router } from 'express';
import { config, isGommoMerchantConfigured, isPayOsConfigured } from '../config.js';
import { CREDIT_PACKAGES, getCreditPackage } from '../services/creditPackages.js';
import {
  createGommoPayment,
  mapGommoPaymentError,
  readPaymentDevice,
  syncGommoPayment,
  type InvoiceBuyer,
} from '../services/gommoPayment.js';
import { createTopupPayOsPayment, verifyPayOsWebhookSignature } from '../services/payos.js';
import {
  bearerAccessToken,
  PaymentIdentityError,
  verifyBearerUsername,
  verifyPaymentIdentity,
} from '../services/paymentIdentity.js';
import { fulfillTopupFromWebhook } from '../services/topupFulfillment.js';
import {
  createTopupOrder,
  getTopupOrder,
  listTopupOrdersForUsername,
  markGommoTopupPaid,
  sumReservedTopupCredits,
} from '../services/topupOrders.js';
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
      gommoPayment: true,
      billingMode: 'gommo',
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

/** POST /billing/payment/create — Bearer + body { packageId, invoiceBuyer?, device_* } */
router.post('/payment/create', async (req, res) => {
  try {
    const accessToken = bearerAccessToken(String(req.headers.authorization || ''));
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

    await verifyPaymentIdentity({
      accessToken,
      expectedUsername: username,
      amountVnd: creditPackage.amountVnd,
    });

    const invoiceBuyer = req.body?.invoiceBuyer as InvoiceBuyer | undefined;
    const promoCode = String(req.body?.promoCode || '').trim();
    const referralCode = String(req.body?.referralCode || '').trim();
    const referralFromBuyer =
      typeof invoiceBuyer?.referral_code === 'string' ? invoiceBuyer.referral_code.trim() : '';

    const payment = await createGommoPayment({
      accessToken,
      idBase: creditPackage.gommoIdBase,
      amountVnd: creditPackage.amountVnd,
      invoiceBuyer,
      promoCode: promoCode || undefined,
      referralCode: referralCode || referralFromBuyer || undefined,
      device: readPaymentDevice(req.body),
    });

    await createTopupOrder({
      orderCode: payment.orderCode,
      username,
      packageId: creditPackage.id,
      amountVnd: payment.amountVnd,
      credits: creditPackage.credits,
      source: 'gommo',
    });

    res.json({
      success: true,
      data: {
        ...payment,
        packageId: creditPackage.id,
        credits: creditPackage.credits,
      },
    });
  } catch (err) {
    const mapped = mapGommoPaymentError(err);
    if (mapped.code !== 'INTERNAL_ERROR') {
      res.status(mapped.status).json({ success: false, message: mapped.message, code: mapped.code });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing/payment/create]', message);
    sendError(res, 500, message, 'INTERNAL_ERROR');
  }
});

/** POST /billing/payment/sync — Bearer + body { orderCode, device_* } */
router.post('/payment/sync', async (req, res) => {
  try {
    const accessToken = bearerAccessToken(String(req.headers.authorization || ''));
    const orderCode = String(req.body?.orderCode || '').trim();

    if (!orderCode) {
      sendError(res, 400, 'orderCode bắt buộc', 'VALIDATION_ERROR');
      return;
    }

    const result = await syncGommoPayment({
      accessToken,
      orderCode,
      device: readPaymentDevice(req.body),
    });

    if (result.paid) {
      await markGommoTopupPaid(orderCode);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    const mapped = mapGommoPaymentError(err);
    if (mapped.code !== 'INTERNAL_ERROR') {
      res.status(mapped.status).json({ success: false, message: mapped.message, code: mapped.code });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing/payment/sync]', message);
    sendError(res, 500, message, 'INTERNAL_ERROR');
  }
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
      source: 'payos',
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

/** GET /billing/topup/orders?username=&limit= — Bearer must match username */
router.get('/topup/orders', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) {
      sendError(res, 400, 'username bắt buộc', 'VALIDATION_ERROR');
      return;
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

    await verifyBearerUsername({
      accessToken: bearerAccessToken(String(req.headers.authorization || '')),
      expectedUsername: username,
    });

    const orders = await listTopupOrdersForUsername(username, limit);
    res.json({ success: true, data: orders });
  } catch (err) {
    if (err instanceof PaymentIdentityError) {
      res.status(err.status).json({
        success: false,
        message: err.message,
        code: err.code,
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    sendError(res, 500, message, 'INTERNAL_ERROR');
  }
});

router.get('/topup/orders/:orderCode', async (req, res) => {
  try {
    const orderCode = decodeURIComponent(String(req.params.orderCode || '')).trim();
    if (!orderCode) {
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
