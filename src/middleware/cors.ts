import cors from 'cors';
import type { RequestHandler } from 'express';
import { config } from '../config.js';

export function gatewayCors(): RequestHandler | null {
  const origins = config.corsOrigins;
  if (origins.length === 0) return null;

  return cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origins.includes('*') || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-admin-key'],
  });
}
