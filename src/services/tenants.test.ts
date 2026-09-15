import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import type { Request } from 'express';
import {
  clearTenantsCache,
  getTenantByHost,
  getTenantById,
  loadTenantsFile,
  resolveGommoDomain,
  resolveTenantFromRequest,
} from './tenants.js';

function mockReq(opts: {
  host?: string;
  headerTenant?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}): Request {
  return {
    headers: {
      host: opts.host,
      ...(opts.headerTenant ? { 'x-gateway-tenant': opts.headerTenant } : {}),
    },
    query: opts.query ?? {},
    body: opts.body ?? {},
  } as Request;
}

describe('tenants', () => {
  beforeEach(() => {
    clearTenantsCache();
    loadTenantsFile();
  });

  it('resolves 79ai from localhost host', () => {
    const tenant = getTenantByHost('localhost:5173');
    assert.equal(tenant?.id, '79ai');
    assert.equal(tenant?.gommoDomain, '79ai.net');
  });

  it('resolves vmedia from hostname', () => {
    const tenant = getTenantByHost('vmedia.docs.example.com');
    assert.equal(tenant?.id, 'vmedia');
    assert.equal(tenant?.gommoDomain, 'vmedia.net');
  });

  it('resolves tenant from X-Gateway-Tenant header', () => {
    const tenant = resolveTenantFromRequest(mockReq({ headerTenant: 'vmedia' }));
    assert.equal(tenant?.id, 'vmedia');
  });

  it('locks domain for vmedia tenant', () => {
    const domain = resolveGommoDomain(
      mockReq({
        headerTenant: 'vmedia',
        body: { domain: '79ai.net' },
      }),
    );
    assert.equal(domain, 'vmedia.net');
  });

  it('allows client domain on unlocked localhost tenant when matching', () => {
    const domain = resolveGommoDomain(
      mockReq({
        host: 'localhost:3001',
        body: { domain: '79ai.net' },
      }),
    );
    assert.equal(domain, '79ai.net');
  });

  it('resolves ?tenant= query in dev', () => {
    const tenant = resolveTenantFromRequest(mockReq({ query: { tenant: 'vmedia' } }));
    assert.equal(getTenantById('vmedia')?.id, 'vmedia');
    assert.equal(tenant?.id, 'vmedia');
  });
});
