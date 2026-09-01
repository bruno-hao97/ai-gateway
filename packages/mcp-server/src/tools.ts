import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { McpServerConfig } from './config.js';
import {
  buildImageFields,
  buildVideoFields,
  createGatewayClient,
  errorResult,
  extractJobId,
  extractPollSnapshot,
  jsonResult,
  mapModelsType,
} from './helpers.js';

const catalogEnumHint =
  'Do NOT invent values. Call gommo_models_list first. Only set after user confirms or when catalog has exactly one option.';

export function registerGatewayTools(server: McpServer, config: McpServerConfig): void {
  const client = createGatewayClient(config);

  server.tool(
    'gommo_models_list',
    'List available media models by type. Always call before create to read ratio/resolution/duration/mode enums.',
    {
      type: z.enum(['image', 'video', 'audio']).describe('Media model type. audio maps to music catalog.'),
    },
    async ({ type }) => {
      try {
        const jobType = mapModelsType(type);
        const envelope = await client.models.list({ type: jobType });
        return jsonResult({ success: true, type, jobType, data: envelope.data ?? envelope });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_credit_balance',
    'Get the latest credit balance for the authenticated user before creating media.',
    {},
    async () => {
      try {
        const me = await client.auth.me(config.domain);
        const credits =
          me.balancesInfo?.credits_ai ??
          me.data?.balancesInfo?.credits_ai ??
          null;
        return jsonResult({
          success: true,
          credits_ai: credits,
          username: me.username ?? me.data?.username ?? null,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_account_info',
    'Get account profile and subscription/credit information for the authenticated user.',
    {},
    async () => {
      try {
        const me = await client.auth.me(config.domain);
        return jsonResult({ success: true, ...me });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_image_create',
    'Create an asynchronous image task. Returns id_base — poll with gommo_image_status or gommo_task_stream.',
    {
      model: z.string().describe('Model slug from gommo_models_list'),
      prompt: z.string().describe('Image prompt'),
      ratio: z.string().optional().describe(catalogEnumHint),
      resolution: z.string().optional().describe(catalogEnumHint),
      mode: z.string().optional().describe(catalogEnumHint),
      num_outputs: z.number().int().min(1).max(16).optional(),
      project_id: z.string().optional(),
      privacy: z.enum(['PRIVATE', 'PUBLIC']).optional(),
      images: z.array(z.object({ url: z.string() })).optional(),
      references: z.array(z.object({ url: z.string() })).optional(),
      subjects: z.array(z.object({ url: z.string() })).optional(),
      template_id: z.string().optional(),
    },
    async (args) => {
      try {
        const envelope = await client.jobs.create({
          type: 'image',
          modelSlug: args.model,
          fields: buildImageFields(args),
          wait: false,
        });
        const id_base = extractJobId(envelope);
        return jsonResult({
          success: true,
          id_base,
          message: 'Poll with gommo_image_status or gommo_task_stream',
          raw: envelope,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_image_status',
    'Get latest status and output URL for an image task by id_base.',
    {
      id_base: z.string().describe('id_base from gommo_image_create response'),
    },
    async ({ id_base }) => {
      try {
        const envelope = await client.jobs.poll({ id: id_base, media: 'image' });
        const snapshot = extractPollSnapshot(envelope);
        return jsonResult({ success: true, id_base, ...snapshot, raw: envelope });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_video_create',
    'Create an asynchronous video task. Returns id_base — poll with gommo_video_status or gommo_task_stream.',
    {
      model: z.string().describe('Model slug from gommo_models_list type=video'),
      prompt: z.string().optional(),
      ratio: z.string().optional().describe(catalogEnumHint),
      resolution: z.string().optional().describe(catalogEnumHint),
      duration: z.string().optional().describe(catalogEnumHint),
      mode: z.string().optional().describe(catalogEnumHint),
      project_id: z.string().optional(),
      privacy: z.enum(['PRIVATE', 'PUBLIC']).optional(),
      images: z.array(z.object({ url: z.string() })).optional(),
      references: z.array(z.object({ url: z.string() })).optional(),
      subjects: z.array(z.object({ url: z.string() })).optional(),
      video_url: z.string().optional(),
      video_urls: z.array(z.object({ url: z.string() })).optional(),
      audio_urls: z.array(z.object({ url: z.string() })).optional(),
      image_url: z.string().optional(),
      remix_url: z.string().optional(),
      subType: z.string().optional(),
      background_source: z.enum(['input_video', 'input_image']).optional(),
      extendVideo: z.boolean().optional(),
      start_seconds: z.number().optional(),
      end_seconds: z.number().optional(),
      multi_shots: z.boolean().optional(),
      multi_shot_mode: z.string().optional(),
      multi_prompt: z
        .array(z.object({ prompt: z.string(), duration: z.number().optional() }))
        .optional(),
      cameos: z.string().optional(),
      template_id: z.string().optional(),
    },
    async (args) => {
      try {
        const envelope = await client.jobs.create({
          type: 'video',
          modelSlug: args.model,
          fields: buildVideoFields(args),
          wait: false,
        });
        const id_base = extractJobId(envelope);
        return jsonResult({
          success: true,
          id_base,
          message: 'Poll with gommo_video_status or gommo_task_stream',
          raw: envelope,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_video_status',
    'Get latest status and output URL for a video task by id_base.',
    {
      id_base: z.string().describe('id_base from gommo_video_create response'),
    },
    async ({ id_base }) => {
      try {
        const envelope = await client.jobs.poll({ id: id_base, media: 'video' });
        const snapshot = extractPollSnapshot(envelope);
        return jsonResult({ success: true, id_base, ...snapshot, raw: envelope });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'gommo_task_stream',
    'Poll a media task until success, failure, or timeout. Default: every 30s, up to 30 minutes.',
    {
      type: z.enum(['image', 'video']),
      id_base: z.string().describe('id_base from create response — never internal task_id'),
      interval_seconds: z.number().int().min(5).max(60).optional().describe('Poll interval. Default 30.'),
      max_wait_seconds: z
        .number()
        .int()
        .min(60)
        .max(1800)
        .optional()
        .describe('Max wait. Default 1800 (30 min).'),
    },
    async ({ type, id_base, interval_seconds, max_wait_seconds }) => {
      try {
        const intervalMs = (interval_seconds ?? 30) * 1000;
        const maxAttempts = Math.max(1, Math.floor((max_wait_seconds ?? 1800) / (interval_seconds ?? 30)));
        const poll = await client.jobs.pollUntilDone(id_base, type, {
          intervalMs,
          maxAttempts,
        });
        return jsonResult({ success: poll.success, type, id_base, ...poll });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
