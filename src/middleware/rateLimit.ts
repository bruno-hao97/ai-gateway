import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { errorBody } from '../utils/errors.js';

function limitHandler(scope: 'gateway' | 'admin' | 'billing') {
  const max =
    scope === 'admin'
      ? config.rateLimit.adminMax
      : scope === 'billing'
        ? config.rateLimit.billingMax
        : config.rateLimit.gatewayMax;
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, res) {
      res.status(429).json(errorBody('Too many requests', 'RATE_LIMITED'));
    },
  });
}

export const gatewayRateLimit = limitHandler('gateway');
export const adminRateLimit = limitHandler('admin');
export const billingRateLimit = limitHandler('billing');
