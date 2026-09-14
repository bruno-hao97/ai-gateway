import { config } from '../config.js';
import { resolveByokOwner } from './byokIdentity.js';
import { GommoClient } from './gommoClient.js';
import { dispatchObservabilityEvent } from './observabilityWebhook.js';
import { ownerHasJobWebhooks } from './observabilityStore.js';
import { startPolling } from './polling.js';
import type { JobType } from '../types/gommo.js';
import { pollMediaForJobType } from '../types/gommo.js';

const activePolls = new Set<string>();

function pollKey(ownerId: string, jobId: string): string {
  return `${ownerId}:${jobId}`;
}

export interface BackgroundJobWebhookInput {
  accessToken: string;
  domain: string;
  jobType: JobType;
  modelSlug: string;
  providerJobId: string;
}

async function runBackgroundJobWebhookPoll(input: BackgroundJobWebhookInput): Promise<void> {
  if (!config.observability.backgroundJobPoll) return;

  const pollMedia = pollMediaForJobType(input.jobType);
  if (!pollMedia) return;

  let ownerId = '';
  try {
    const owner = await resolveByokOwner(input.accessToken, input.domain);
    ownerId = owner.ownerId;
  } catch {
    return;
  }

  if (!(await ownerHasJobWebhooks(ownerId))) return;

  const key = pollKey(ownerId, input.providerJobId);
  if (activePolls.has(key)) return;
  activePolls.add(key);

  try {
    const client = new GommoClient({
      accessToken: input.accessToken,
      domain: input.domain,
    });
    const pollResult = await startPolling(client, input.providerJobId, pollMedia);
    const succeeded = pollResult.success;
    const jobId = pollResult.idBase ?? input.providerJobId;

    await dispatchObservabilityEvent({
      accessToken: input.accessToken,
      domain: input.domain,
      type: succeeded ? 'job.completed' : 'job.failed',
      data: {
        jobType: input.jobType,
        modelSlug: input.modelSlug,
        jobId,
        resultUrl: pollResult.resultUrl,
        coverUrl: pollResult.coverUrl,
        status: succeeded ? 'success' : 'failed',
        error: pollResult.error,
        background: true,
      },
    });
  } finally {
    activePolls.delete(key);
  }
}

/** Poll async media jobs in the background and deliver webhooks when wait=false. */
export function scheduleBackgroundJobWebhookPoll(input: BackgroundJobWebhookInput): void {
  void runBackgroundJobWebhookPoll(input).catch((err) => {
    console.error('[observability] background job poll failed:', err);
  });
}
