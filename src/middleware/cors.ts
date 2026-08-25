import cors from 'cors';
import type { Request, RequestHandler } from 'express';
import { config } from '../config.js';

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'x-admin-key'],
};

function isSameOrigin(origin: string, req: Request): boolean {
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | undefined, req: Request, allowed: readonly string[]): boolean {
  if (!origin) return true;
  if (allowed.includes('*') || allowed.includes(origin)) return true;
  return isSameOrigin(origin, req);
}

/** CORS for cross-origin browser clients. Same-origin (e.g. /portal on :3001) always allowed. */
export function gatewayCors(): RequestHandler | null {
  const allowed = config.corsOrigins;
  if (allowed.length === 0) return null;

  return (req, res, next) => {
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin, req, allowed)) {
      next(new Error('Not allowed by CORS'));
      return;
    }
    cors({ ...corsOptions, origin: origin ?? true })(req, res, next);
  };
}
