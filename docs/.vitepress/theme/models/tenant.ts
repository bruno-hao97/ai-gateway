import tenantsFile from '../../../../config/tenants.json';
import { applyTenantBinding } from './auth-api';

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

export interface PublicTenant {
  id: string;
  gommoDomain: string;
  appName: string;
  lockDomain: boolean;
}

const TENANTS = tenantsFile as TenantsFile;

const hostIndex = new Map<string, TenantConfig>();
const idIndex = new Map<string, TenantConfig>();

for (const tenant of TENANTS.tenants) {
  idIndex.set(tenant.id.toLowerCase(), tenant);
  for (const host of tenant.hosts) {
    hostIndex.set(normalizeHost(host), tenant);
  }
}

function normalizeHost(raw: string): string {
  const host = raw.trim().toLowerCase();
  if (!host) return '';
  const withoutPort = host.includes(':') && !host.startsWith('[') ? host.split(':')[0]! : host;
  return withoutPort.replace(/^\[|\]$/g, '');
}

function defaultTenant(): TenantConfig {
  return idIndex.get(TENANTS.defaultTenantId.toLowerCase()) ?? TENANTS.tenants[0];
}

function readDevTenantQuery(): string {
  if (typeof window === 'undefined') return '';
  const key = TENANTS.devQueryParam || 'tenant';
  return new URLSearchParams(window.location.search).get(key)?.trim() || '';
}

export function resolveTenantFromBrowser(): TenantConfig {
  const fromQuery = readDevTenantQuery();
  if (fromQuery) {
    const byQuery = idIndex.get(fromQuery.toLowerCase());
    if (byQuery) return byQuery;
  }

  if (typeof window !== 'undefined') {
    const byHost = hostIndex.get(normalizeHost(window.location.hostname));
    if (byHost) return byHost;
  }

  return defaultTenant();
}

let activeTenant: TenantConfig | null = null;

export function getActiveTenant(): TenantConfig {
  if (!activeTenant) activeTenant = resolveTenantFromBrowser();
  return activeTenant;
}

export function getTenantGommoDomain(): string {
  return getActiveTenant().gommoDomain;
}

export function getTenantId(): string {
  return getActiveTenant().id;
}

export function isTenantDomainLocked(): boolean {
  return getActiveTenant().lockDomain;
}

/** Bind docs/portal to dealer Gommo domain on first load. */
export function initTenantContext(): PublicTenant {
  const tenant = resolveTenantFromBrowser();
  activeTenant = tenant;
  applyTenantBinding(tenant);

  return {
    id: tenant.id,
    gommoDomain: tenant.gommoDomain,
    appName: tenant.appName,
    lockDomain: tenant.lockDomain,
  };
}

export { getStoredTenantId } from './auth-api';
