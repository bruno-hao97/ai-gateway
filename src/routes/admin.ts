import { Router, type NextFunction, type Request, type Response } from 'express';
import { config, isAdminConfigured, isGommoMerchantConfigured } from '../config.js';
import { sendCreditsToUser, MerchantBalanceError } from '../services/creditsSend.js';
import { GommoRegisterError, registerGommoUser } from '../services/merchantRegister.js';
import { fetchMerchantCreditsAi } from '../services/merchantBalance.js';
import { sendError } from '../utils/errors.js';

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminConfigured()) {
    sendError(res, 503, 'ADMIN_API_KEY chưa cấu hình trên server', 'NOT_CONFIGURED');
    return;
  }
  const key = req.headers['x-admin-key'];
  if (typeof key !== 'string' || key.trim() !== config.adminApiKey) {
    sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    return;
  }
  next();
}

const router = Router();
router.use(adminAuth);

/** GET /admin/merchant/balance */
router.get('/merchant/balance', async (_req, res) => {
  try {
    if (!isGommoMerchantConfigured()) {
      sendError(res, 503, 'Merchant chưa cấu hình', 'NOT_CONFIGURED');
      return;
    }
    const credits_ai = await fetchMerchantCreditsAi();
    res.json({ success: true, data: { credits_ai } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin] merchant balance', message);
    sendError(res, 502, message, 'UPSTREAM_ERROR');
  }
});

/** POST /admin/credits/send — body: { username, value, message, type? } */
router.post('/credits/send', async (req, res) => {
  try {
    if (!isGommoMerchantConfigured()) {
      sendError(res, 503, 'Merchant chưa cấu hình', 'NOT_CONFIGURED');
      return;
    }

    const { username, value, message, type } = req.body ?? {};
    const result = await sendCreditsToUser({
      username: typeof username === 'string' ? username : '',
      value: Math.floor(Number(value)),
      message: typeof message === 'string' ? message : '',
      type: typeof type === 'string' ? type : undefined,
    });

    res.json({
      success: true,
      message: `Đã gửi ${result.creditsSent.toLocaleString('vi-VN')} credits cho ${username}`,
      data: { merchantBalanceAfter: result.merchantBalanceAfter },
    });
  } catch (err) {
    if (err instanceof MerchantBalanceError) {
      sendError(res, 402, err.message, 'INSUFFICIENT_CREDITS');
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (/bắt buộc|phải > 0/i.test(message)) {
      sendError(res, 400, message, 'VALIDATION_ERROR');
      return;
    }
    console.error('[admin] credits/send', message);
    sendError(res, 502, message, 'UPSTREAM_ERROR');
  }
});

/** POST /admin/users/register — body: { name?, email, password, phone, note? } */
router.post('/users/register', async (req, res) => {
  try {
    const { name, email, password, phone, note } = req.body ?? {};
    if (!email || !password || !phone) {
      sendError(res, 400, 'email, password, phone bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    const result = await registerGommoUser({
      name: typeof name === 'string' ? name : undefined,
      email: String(email),
      password: String(password),
      phone: String(phone),
      note: typeof note === 'string' ? note : undefined,
    });
    res.json({
      success: true,
      data: { access_token: result.accessToken },
      message: result.message,
    });
  } catch (err) {
    if (err instanceof GommoRegisterError) {
      sendError(res, err.status, err.message, 'UPSTREAM_ERROR');
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin] users/register', message);
    sendError(res, 502, message, 'UPSTREAM_ERROR');
  }
});

export default router;
