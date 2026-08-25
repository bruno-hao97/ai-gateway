import { ensureAccessToken, requestJson } from '../http.js';
import type { HttpContext } from '../http.js';
import {
  classifyPollStatus,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_MAX_ATTEMPTS,
  extractJobId,
  extractPollSnapshot,
  sleep,
} from '../poll.js';
import type {
  CreateJobParams,
  GatewayEnvelope,
  JobType,
  PollJobParams,
  PollMedia,
  PollResult,
  PollUntilDoneOptions,
} from '../types.js';
import { pollMediaForJobType } from '../types.js';

export class JobsResource {
  constructor(private readonly ctx: HttpContext) {}

  /** POST /gateway/jobs/:type */
  async create(params: CreateJobParams): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    const { type, modelSlug, fields, wait = false } = params;
    return requestJson(this.ctx, `/gateway/jobs/${encodeURIComponent(type)}`, {
      method: 'POST',
      body: JSON.stringify({ modelSlug, fields, wait }),
    });
  }

  /** GET /gateway/jobs/:id?media= */
  async poll(params: PollJobParams): Promise<GatewayEnvelope> {
    ensureAccessToken(this.ctx);
    const { id, media } = params;
    return requestJson(
      this.ctx,
      `/gateway/jobs/${encodeURIComponent(id)}?media=${encodeURIComponent(media)}`,
    );
  }

  /**
   * Create with wait:true — server polls upstream.
   * Convenience wrapper around create({ wait: true }).
   */
  async createAndWait(params: Omit<CreateJobParams, 'wait'>): Promise<GatewayEnvelope> {
    return this.create({ ...params, wait: true });
  }

  /**
   * Client-side poll loop (3.5s default, max 80 attempts).
   * Use after create({ wait: false }) or when you already have a job id.
   */
  async pollUntilDone(
    jobId: string,
    media: PollMedia,
    options: PollUntilDoneOptions = {},
  ): Promise<PollResult> {
    ensureAccessToken(this.ctx);
    const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxAttempts = options.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const envelope = await this.poll({ id: jobId, media });
      const snapshot = extractPollSnapshot(envelope);
      options.onProgress?.(attempt, snapshot);

      const phase = classifyPollStatus(snapshot.status, snapshot.resultUrl);
      if (phase === 'success') {
        return { success: true, ...snapshot };
      }
      if (phase === 'failed') {
        return { success: false, error: snapshot.status || 'failed', ...snapshot };
      }

      await sleep(intervalMs, options.signal);
    }

    return {
      success: false,
      timeout: true,
      error: 'Poll timeout (~5 min)',
      status: '',
      resultUrl: null,
      idBase: jobId,
    };
  }

  /**
   * create(wait:false) → pollUntilDone with media inferred from job type.
   */
  async createAndPoll(
    params: Omit<CreateJobParams, 'wait'>,
    options: PollUntilDoneOptions = {},
  ): Promise<{ create: GatewayEnvelope; poll: PollResult }> {
    const createEnvelope = await this.create({ ...params, wait: false });
    const jobId = extractJobId(createEnvelope);
    const media = pollMediaForJobType(params.type);

    if (!jobId) {
      return {
        create: createEnvelope,
        poll: { success: false, error: 'No job id in create response', status: '', resultUrl: null },
      };
    }

    if (!media) {
      const snap = extractPollSnapshot(createEnvelope);
      return {
        create: createEnvelope,
        poll: {
          success: Boolean(snap.resultUrl),
          ...snap,
          error: snap.resultUrl ? undefined : 'Job type does not support poll media',
        },
      };
    }

    const poll = await this.pollUntilDone(jobId, media, options);
    return { create: createEnvelope, poll };
  }

  /** Resolve poll media for a job type. */
  pollMediaFor(type: JobType): PollMedia | null {
    return pollMediaForJobType(type);
  }
}
