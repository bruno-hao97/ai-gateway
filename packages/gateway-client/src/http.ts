import { GatewayError, parseGatewayError } from './errors.js';
import type { GatewayClientOptions, GatewayEnvelope } from './types.js';

export interface HttpContext {
  baseUrl: string;
  accessToken?: string;
  fetchImpl: typeof fetch;
}

export function resolveBaseUrl(baseUrl?: string): string {
  return (baseUrl || 'http://localhost:3001').replace(/\/$/, '');
}

export function createHttpContext(options: GatewayClientOptions): HttpContext {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    accessToken: options.accessToken,
    fetchImpl: options.fetch ?? globalThis.fetch.bind(globalThis),
  };
}

function authHeaders(ctx: HttpContext, json = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (ctx.accessToken) headers.Authorization = `Bearer ${ctx.accessToken}`;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function parseJson(res: Response): Promise<GatewayEnvelope> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as GatewayEnvelope;
  } catch {
    return { message: text };
  }
}

export async function requestJson<T = GatewayEnvelope>(
  ctx: HttpContext,
  path: string,
  init: RequestInit & { auth?: boolean; expectJson?: boolean } = {},
): Promise<T> {
  const { auth = true, expectJson = true, ...fetchInit } = init;
  const headers: Record<string, string> = {
    ...(expectJson ? authHeaders(ctx, !(fetchInit.body instanceof FormData)) : {}),
    ...(fetchInit.headers as Record<string, string> | undefined),
  };
  if (auth && ctx.accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${ctx.accessToken}`;
  }

  const res = await ctx.fetchImpl(`${ctx.baseUrl}${path}`, { ...fetchInit, headers });
  const body = await parseJson(res);

  if (!res.ok || body.success === false) {
    throw parseGatewayError(res.status, body);
  }

  return body as T;
}

export async function requestForm<T = GatewayEnvelope>(
  ctx: HttpContext,
  path: string,
  body: URLSearchParams,
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (auth && ctx.accessToken) {
    headers.Authorization = `Bearer ${ctx.accessToken}`;
  }

  const res = await ctx.fetchImpl(`${ctx.baseUrl}${path}`, {
    method: 'POST',
    headers,
    body,
  });
  const parsed = await parseJson(res);

  if (!res.ok || parsed.success === false) {
    throw parseGatewayError(res.status, parsed);
  }

  return parsed as T;
}

export async function requestRaw(
  ctx: HttpContext,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...authHeaders(ctx),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await ctx.fetchImpl(`${ctx.baseUrl}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await parseJson(res);
    throw parseGatewayError(res.status, body);
  }

  return res;
}

export function toBlob(input: { data: Blob | ArrayBuffer | Uint8Array; mimeType?: string }): Blob {
  if (input.data instanceof Blob) return input.data;
  if (input.data instanceof ArrayBuffer) {
    return new Blob([input.data], { type: input.mimeType || 'application/octet-stream' });
  }
  const copy = new Uint8Array(input.data.byteLength);
  copy.set(input.data);
  return new Blob([copy.buffer], { type: input.mimeType || 'application/octet-stream' });
}

export function ensureAccessToken(ctx: HttpContext): string {
  if (!ctx.accessToken) {
    throw new GatewayError('accessToken is required — set on GatewayClient or call auth.login()', 401, 'UNAUTHORIZED');
  }
  return ctx.accessToken;
}
