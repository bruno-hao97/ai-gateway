import { isByokEnabled } from '../config.js';
import type { GatewayAuth } from '../middleware/gatewayAuth.js';
import { resolveByokOwner } from './byokIdentity.js';
import { getDecryptedSecret, getPrimaryGommoAccount } from './byokStore.js';

export type MediaGommoAuthSource = 'session' | 'byok_primary';

export interface ResolvedMediaGommoAuth extends GatewayAuth {
  source: MediaGommoAuthSource;
  byokAccountId?: string;
  byokLabel?: string;
}

export async function resolveMediaGommoAuth(input: {
  sessionAccessToken: string;
  sessionDomain: string;
}): Promise<ResolvedMediaGommoAuth> {
  const fallback: ResolvedMediaGommoAuth = {
    accessToken: input.sessionAccessToken,
    domain: input.sessionDomain,
    source: 'session',
  };

  if (!isByokEnabled()) return fallback;

  try {
    const owner = await resolveByokOwner(input.sessionAccessToken, input.sessionDomain);
    const primary = await getPrimaryGommoAccount(owner.ownerId);
    if (!primary?.gommoDomain) return fallback;

    const accessToken = await getDecryptedSecret(primary);
    return {
      accessToken,
      domain: primary.gommoDomain,
      source: 'byok_primary',
      byokAccountId: primary.id,
      byokLabel: primary.label || primary.gommoDomain,
    };
  } catch {
    return fallback;
  }
}

export async function readPrimaryGommoAccountSummary(input: {
  sessionAccessToken: string;
  sessionDomain: string;
}): Promise<{
  linked: boolean;
  primary?: {
    id: string;
    domain: string;
    username?: string;
    label?: string;
  };
}> {
  if (!isByokEnabled()) return { linked: false };

  try {
    const owner = await resolveByokOwner(input.sessionAccessToken, input.sessionDomain);
    const primary = await getPrimaryGommoAccount(owner.ownerId);
    if (!primary) return { linked: false };

    return {
      linked: true,
      primary: {
        id: primary.id,
        domain: primary.gommoDomain || '',
        username: primary.gommoUsername,
        label: primary.label,
      },
    };
  } catch {
    return { linked: false };
  }
}
