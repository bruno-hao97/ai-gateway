import {
  extractJobId,
  extractPollSnapshot,
  GatewayClient,
  type JobType,
} from '@ai-gateway/client';

export function createGatewayClient(config: {
  gatewayUrl: string;
  accessToken: string;
}): GatewayClient {
  return new GatewayClient({
    baseUrl: config.gatewayUrl,
    accessToken: config.accessToken,
  });
}

export function mapModelsType(type: 'image' | 'video' | 'audio'): JobType {
  if (type === 'audio') return 'music';
  return type;
}

export function buildImageFields(args: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    prompt: String(args.prompt || '').trim(),
  };
  for (const key of ['ratio', 'resolution', 'mode', 'num_outputs', 'privacy', 'template_id', 'project_id']) {
    if (args[key] != null && args[key] !== '') fields[key] = args[key];
  }
  if (Array.isArray(args.images)) fields.images = args.images;
  if (Array.isArray(args.references)) fields.references = args.references;
  if (Array.isArray(args.subjects)) fields.subjects = args.subjects;
  return fields;
}

export function buildVideoFields(args: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const prompt = String(args.prompt || '').trim();
  if (prompt) fields.prompt = prompt;

  for (const key of [
    'ratio',
    'resolution',
    'duration',
    'mode',
    'privacy',
    'template_id',
    'project_id',
    'video_url',
    'image_url',
    'remix_url',
    'subType',
    'background_source',
    'extendVideo',
    'start_seconds',
    'end_seconds',
    'multi_shots',
    'multi_shot_mode',
    'cameos',
    'source',
    'generation_group_name',
  ]) {
    if (args[key] != null && args[key] !== '') fields[key] = args[key];
  }

  if (Array.isArray(args.images)) fields.images = args.images;
  if (Array.isArray(args.references)) fields.references = args.references;
  if (Array.isArray(args.subjects)) fields.subjects = args.subjects;
  if (Array.isArray(args.video_urls)) fields.video_urls = args.video_urls;
  if (Array.isArray(args.audio_urls)) fields.audio_urls = args.audio_urls;
  if (Array.isArray(args.multi_prompt)) fields.multi_prompt = args.multi_prompt;

  return fields;
}

export function jsonResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function textResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  };
}

export function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

export { extractJobId, extractPollSnapshot };
