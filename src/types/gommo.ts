export type JobType =
  | 'image'
  | 'video'
  | 'tts'
  | 'music'
  | 'avatar-lipsync'
  | 'image-upscale'
  | 'remove-bg'
  | 'video-upscale'
  | 'video-vfx'
  | 'video-subtitle'
  | 'video-cut';

export type PollMedia = 'image' | 'video' | 'music';

export const POLL_MEDIA: Record<JobType, PollMedia | null> = {
  image: 'image',
  video: 'video',
  tts: null,
  music: 'music',
  'avatar-lipsync': 'video',
  'image-upscale': 'image',
  'remove-bg': 'image',
  'video-upscale': 'video',
  'video-vfx': 'video',
  'video-subtitle': 'video',
  'video-cut': 'video',
};

export function pollMediaForJobType(jobType: JobType): PollMedia | null {
  return POLL_MEDIA[jobType] ?? null;
}

export interface GommoEnvelope<T = Record<string, unknown>> {
  success?: boolean;
  data?: T;
  raw?: Record<string, unknown>;
  message?: string;
  _rawText?: string;
}

export interface GommoModel {
  model?: string;
  slug?: string;
  model_id?: string;
  id?: string;
  id_base?: string;
  name?: string;
  status?: string;
  status_message?: string;
  description?: string;
  ratios?: unknown[];
  modes?: unknown[];
  mode?: unknown[];
  resolutions?: unknown[];
  durations?: unknown[];
  duration?: unknown[];
}

export function parseModelsList(envelopeOrData: unknown): GommoModel[] {
  if (Array.isArray(envelopeOrData)) return envelopeOrData as GommoModel[];
  const root = envelopeOrData as { envelope?: unknown; data?: unknown };
  const d = (root?.envelope as { data?: unknown })?.data ?? root?.data ?? root;
  if (Array.isArray(d)) return d as GommoModel[];
  if (d && Array.isArray((d as { models?: GommoModel[] }).models)) {
    return (d as { models: GommoModel[] }).models;
  }
  if (d && Array.isArray((d as { items?: GommoModel[] }).items)) {
    return (d as { items: GommoModel[] }).items;
  }
  return [];
}

export function modelSlug(model: GommoModel): string {
  return (
    model?.model ||
    model?.slug ||
    model?.model_id ||
    model?.id ||
    model?.id_base ||
    ''
  );
}

/** Lấy ratio đầu tiên từ model catalog — không đoán giá trị. */
export function pickFirstRatio(model: GommoModel): string | undefined {
  const ratios = model.ratios;
  if (!Array.isArray(ratios) || ratios.length === 0) return undefined;
  const first = ratios[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    const obj = first as Record<string, unknown>;
    const value = obj.value ?? obj.ratio ?? obj.id ?? obj.name;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
