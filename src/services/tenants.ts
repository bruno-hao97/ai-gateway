import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import { config } from '../config.js';

export interface TenantConfig {
  id: string;
  hosts: string[];
  gommoDomain: string;
  appName: string;
  lockDomain: boolean;
}

export interface TenantsFile {
  defaultTenantId: string;
  devQueryParam: string;
  tenants: TenantConfig[];
}

const TENANTS_HEADER = 'x-gateway-tenant';

let cached: TenantsFile | null = null;
let hostIndex: Map<string, TenantConfig> | null = null;
let idIndex: Map<string, TenantConfig> | null = null;
let domainIndex: Map<string, TenantConfig> | null = null;

function tenantsFilePath(): string {
  const fromEnv = (process.env.TENANTS_FILE || '').trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  return path.join(process.cwd(), 'config', 'tenants.json');
}

function normalizeHost(raw: string): string {
  const host = raw.trim().toLowerCase();
  if (!host) return '';
  const withoutPort = host.includes(':') && !host.startsWith('[') ? host.split(':')[0]! : host;
  return withoutPort.replace(/^\[|\]$/g, '');
}

function rebuildIndexes(file: TenantsFile): void {
  hostIndex = new Map();
  idIndex = new Map();
  domainIndex = new Map();
  for (const tenant of file.tenants) {
    idIndex.set(tenant.id.toLowerCase(), tenant);
    domainIndex.set(tenant.gommoDomain.toLowerCase(), tenant);
    for (const host of tenant.hosts) {
      hostIndex.set(normalizeHost(host), tenant);
    }
  }
}

export function loadTenantsFile(): TenantsFile {
  if (cached) return cached;
  const filePath = tenantsFilePath();
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as TenantsFile;
  if (!Array.isArray(parsed.tenants) || !parsed.tenants.length) {
    throw new Error(`Invalid tenants file: ${filePath}`);
  }
  cached = parsed;
  rebuildIndexes(parsed);
  return parsed;
}

/** Test helper — reset in-memory cache. */
export function clearTenantsCache(): void {
  cached = null;
  hostIndex = null;
  idIndex = null;
  domainIndex = null;
}

export function listTenants(): TenantConfig[] {
  return [...loadTenantsFile().tenants];
}

export function getTenantById(id: string): TenantConfig | undefined {
  loadTenantsFile();
  return idIndex?.get(id.trim().toLowerCase());
}

export function getTenantByHost(host: string): TenantConfig | undefined {
  loadTenantsFile();
  const key = normalizeHost(host);
  if (!key) return undefined;
  return hostIndex?.get(key);
}

export function getTenantByGommoDomain(domain: string): TenantConfig | undefined {
  loadTenantsFile();
  return domainIndex?.get(domain.trim().toLowerCase());
}

export function getDefaultTenant(): TenantConfig {
  const file = loadTenantsFile();
  const fallback = file.tenants[0];
  return getTenantById(file.defaultTenantId) ?? fallback;
}

function readTenantIdHeader(req: Request): string {
  const raw = req.headers[TENANTS_HEADER];
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return '';
}

function readTenantQuery(req: Request): string {
  const file = loadTenantsFile();
  const key = file.devQueryParam || 'tenant';
  const fromQuery = req.query[key];
  if (typeof fromQuery === 'string') return fromQuery.trim();
  return '';
}

/** Resolve dealer site from Host, X-Gateway-Tenant, or ?tenant= (dev). */
export function resolveTenantFromRequest(req: Request): TenantConfig | undefined {
  const byHeader = readTenantIdHeader(req);
  if (byHeader) {
    const tenant = getTenantById(byHeader);
    if (tenant) return tenant;
  }

  const host = normalizeHost(req.headers.host || '');
  if (host) {
    const byHost = getTenantByHost(host);
    if (byHost) return byHost;
  }

  const byQuery = readTenantQuery(req);
  if (byQuery) {
    const tenant = getTenantById(byQuery);
    if (tenant) return tenant;
  }

  return undefined;
}

function readClientDomain(req: Request): string {
  const fromQuery = typeof req.query.domain === 'string' ? req.query.domain.trim() : '';
  const fromBody =
    req.body && typeof req.body.domain === 'string' ? req.body.domain.trim() : '';
  return fromQuery || fromBody;
}

/**
 * Gommo `domain` for this request.
 * When a tenant is resolved, client cannot switch to another dealer's domain.
 */
export function resolveGommoDomain(req: Request): string {
  const tenant = resolveTenantFromRequest(req);
  const clientDomain = readClientDomain(req);

  if (tenant) {
    if (tenant.lockDomain || !clientDomain) {
      return tenant.gommoDomain;
    }
    if (clientDomain.toLowerCase() === tenant.gommoDomain.toLowerCase()) {
      return tenant.gommoDomain;
    }
    return tenant.gommoDomain;
  }

  if (clientDomain) {
    const known = getTenantByGommoDomain(clientDomain);
    if (known) return known.gommoDomain;
    return clientDomain;
  }

  return config.gommo.apiDomain;
}

export function publicTenantPayload(tenant: TenantConfig) {
  return {
    id: tenant.id,
    gommoDomain: tenant.gommoDomain,
    appName: tenant.appName,
    lockDomain: tenant.lockDomain,
  };
}
