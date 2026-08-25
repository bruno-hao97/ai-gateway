import type { ErrorCode, GatewayEnvelope } from './types.js';

export class GatewayError extends Error {
  readonly status: number;
  readonly code?: ErrorCode;
  readonly body?: GatewayEnvelope;

  constructor(message: string, status: number, code?: ErrorCode, body?: GatewayEnvelope) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function parseGatewayError(
  status: number,
  body: GatewayEnvelope & { message?: string; code?: ErrorCode },
): GatewayError {
  return new GatewayError(
    body.message || `HTTP ${status}`,
    status,
    body.code,
    body,
  );
}
