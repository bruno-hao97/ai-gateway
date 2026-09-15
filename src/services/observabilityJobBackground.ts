import { config } from '../config.js';
import { resolveByokOwner } from './byokIdentity.js';
import { GommoClient } from './gommoClient.js';
import {
  listPollQueueEntries,
  pollQueueEntryToInput,
  removePollQueueEntry,
  upsertPollQueueEntry,
} from './observabilityPollQueue.js';
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

interface RunPollOptions {
  /** Entry already persisted — skip upsert on queue file. */
  fromQueue?: boolean;
}

async function runBackgroundJobWebhookPoll(
  input: BackgroundJobWebhookInput,
  options: RunPollOptions = {},
): Promise<void> {
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
    if (!options.fromQueue) {
      await upsertPollQueueEntry({
        ownerId,
        domain: input.domain,
        jobType: input.jobType,
        modelSlug: input.modelSlug,
        providerJobId: input.providerJobId,
        accessToken: input.accessToken,
      });
    }

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
    if (ownerId) {
      await removePollQueueEntry(ownerId, input.providerJobId).catch((err) => {
        console.error('[observability] failed to remove poll queue entry:', err);
      });
    }
  }
}

/** Poll async media jobs in the background and deliver webhooks when wait=false. */
export function scheduleBackgroundJobWebhookPoll(input: BackgroundJobWebhookInput): void {
  void runBackgroundJobWebhookPoll(input).catch((err) => {
    console.error('[observability] background job poll failed:', err);
  });
}

/** Resume pending background polls after gateway restart. */
export async function resumeBackgroundPollQueue(): Promise<void> {
  if (!config.observability.backgroundJobPoll) return;

  const entries = await listPollQueueEntries();
  if (!entries.length) return;

  console.log(`[observability] resuming ${entries.length} background poll(s) from queue`);
  for (const entry of entries) {
    try {
      const input = pollQueueEntryToInput(entry);
      void runBackgroundJobWebhookPoll(input, { fromQueue: true }).catch((err) => {
        console.error('[observability] resumed background poll failed:', err);
      });
    } catch (err) {
      console.error('[observability] skipped invalid poll queue entry:', err);
      await removePollQueueEntry(entry.ownerId, entry.providerJobId).catch(() => undefined);
    }
  }
}
