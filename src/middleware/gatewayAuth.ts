import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { GommoApiError, GommoClient } from '../services/gommoClient.js';
import { sendError } from '../utils/errors.js';

export interface GatewayAuth {
  accessToken: string;
  domain: string;
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export function readDomain(req: Request): string {
  const fromQuery = typeof req.query.domain === 'string' ? req.query.domain.trim() : '';
  const fromBody =
    req.body && typeof req.body.domain === 'string' ? req.body.domain.trim() : '';
  return fromQuery || fromBody || config.gommo.apiDomain;
}

export function gatewayAuth(req: Request, res: Response, next: NextFunction): void {
  const accessToken = readBearerToken(req);
  if (!accessToken) {
    sendError(res, 401, 'Authorization Bearer token required', 'UNAUTHORIZED');
    return;
  }
  (req as Request & { gatewayAuth: GatewayAuth }).gatewayAuth = {
    accessToken,
    domain: readDomain(req),
  };
  next();
}

export function getGatewayAuth(req: Request): GatewayAuth {
  return (req as Request & { gatewayAuth: GatewayAuth }).gatewayAuth;
}

export function clientFromReq(req: Request, projectId = 'default'): GommoClient {
  const auth = getGatewayAuth(req);
  return new GommoClient({
    accessToken: auth.accessToken,
    domain: auth.domain,
    projectId,
  });
}

export function sendGommoError(res: Response, err: unknown): void {
  if (err instanceof GommoApiError) {
    res.status(err.status && err.status >= 400 ? err.status : 502).json({
      success: false,
      message: err.message,
      code: 'UPSTREAM_ERROR',
      ...(err.envelope ? { data: err.envelope.data, raw: err.envelope.raw } : {}),
    });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error('[gateway]', message);
  sendError(res, 500, message, 'INTERNAL_ERROR');
}
