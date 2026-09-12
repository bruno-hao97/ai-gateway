import { config, isByokEnabled } from '../config.js';
import {
  findProviderCredentials,
  getDecryptedSecret,
  type ByokCredential,
  type ByokProviderSlug,
} from './byokStore.js';
import { lookupByokModelMap } from './byokModelMap.js';

export interface ByokProviderRoute {
  mode: 'byok';
  provider: Exclude<ByokProviderSlug, 'gommo'>;
  credentialId: string;
  upstreamModel: string;
  apiKey: string;
  sharedFallback: boolean;
  strictOnly: boolean;
}

export type ByokChatResolution = { mode: 'platform' } | ByokProviderRoute;

function credentialAllowsModel(cred: ByokCredential, upstreamModel: string): boolean {
  if (!cred.allowedModels?.length) return true;
  return cred.allowedModels.includes(upstreamModel);
}

export async function resolveByokChatRoute(input: {
  ownerId: string;
  modelField?: string;
}): Promise<ByokChatResolution> {
  if (!isByokEnabled()) return { mode: 'platform' };

  const mapEntry = await lookupByokModelMap({ modelField: input.modelField });
  if (!mapEntry) return { mode: 'platform' };
  if (!config.byok.providers.includes(mapEntry.byokProvider)) return { mode: 'platform' };

  const provider = mapEntry.byokProvider;
  if (provider !== 'openai' && provider !== 'anthropic') return { mode: 'platform' };

  const creds = await findProviderCredentials(input.ownerId, provider);
  for (const cred of creds) {
    if (!credentialAllowsModel(cred, mapEntry.upstreamModel)) continue;
    const apiKey = await getDecryptedSecret(cred);
    return {
      mode: 'byok',
      provider,
      credentialId: cred.id,
      upstreamModel: mapEntry.upstreamModel,
      apiKey,
      sharedFallback: cred.sharedFallback ?? config.byok.defaultSharedFallback,
      strictOnly: cred.strictOnly,
    };
  }

  return { mode: 'platform' };
}

export function isByokUpstreamFailure(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}
