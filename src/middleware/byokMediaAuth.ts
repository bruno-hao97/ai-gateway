import type { NextFunction, Request, Response } from 'express';
import { getGatewayAuth, type GatewayAuth } from './gatewayAuth.js';
import { resolveMediaGommoAuth, type ResolvedMediaGommoAuth } from '../services/byokGatewayAuth.js';

type RequestWithMediaAuth = Request & { gatewayMediaAuth?: ResolvedMediaGommoAuth };

/** After gatewayAuth — sets gatewayMediaAuth when a primary BYOK Gommo account exists. */
export async function byokMediaAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getGatewayAuth(req);
    (req as RequestWithMediaAuth).gatewayMediaAuth = await resolveMediaGommoAuth({
      sessionAccessToken: auth.accessToken,
      sessionDomain: auth.domain,
    });
    next();
  } catch (err) {
    next(err);
  }
}

export function getMediaGatewayAuth(req: Request): ResolvedMediaGommoAuth {
  const media = (req as RequestWithMediaAuth).gatewayMediaAuth;
  if (media) return media;
  const auth = getGatewayAuth(req);
  return { ...auth, source: 'session' };
}

export function readMediaAuthSource(req: Request): ResolvedMediaGommoAuth['source'] {
  return getMediaGatewayAuth(req).source;
}

export function mediaAuthAsGatewayAuth(req: Request): GatewayAuth {
  const { accessToken, domain } = getMediaGatewayAuth(req);
  return { accessToken, domain };
}
