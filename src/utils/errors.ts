import type { Response } from 'express';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_CONFIGURED'
  | 'UPSTREAM_ERROR'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_CREDITS'
  | 'INTERNAL_ERROR';

export interface GatewayErrorBody {
  success: false;
  message: string;
  code?: ErrorCode;
}

export function errorBody(message: string, code?: ErrorCode): GatewayErrorBody {
  return code ? { success: false, message, code } : { success: false, message };
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code?: ErrorCode,
): void {
  res.status(status).json(errorBody(message, code));
}
