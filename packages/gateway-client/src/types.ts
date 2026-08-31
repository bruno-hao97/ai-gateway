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

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_CONFIGURED'
  | 'UPSTREAM_ERROR'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_CREDITS'
  | 'INTERNAL_ERROR';

export interface GatewayEnvelope<T = Record<string, unknown>> {
  success?: boolean;
  data?: T;
  message?: string;
  code?: ErrorCode;
  raw?: Record<string, unknown>;
}

export interface GatewayClientOptions {
  /** Gateway base URL, e.g. `http://localhost:3001` */
  baseUrl?: string;
  /** Gommo user access_token (Bearer) */
  accessToken?: string;
  /** Custom fetch (Node 18+, browser, Deno) */
  fetch?: typeof fetch;
}

export interface LoginOptions {
  email: string;
  password: string;
  /** Registration domain, default `79ai.net` */
  domain?: string;
}

export interface LoginResult {
  access_token: string;
  [key: string]: unknown;
}

export interface MeResponse {
  success?: boolean;
  username?: string;
  userInfo?: {
    name?: string;
    email?: string;
    username?: string;
    avatar?: string;
  };
  balancesInfo?: {
    credits_ai?: number;
  };
  data?: {
    username?: string;
    userInfo?: MeResponse['userInfo'];
    balancesInfo?: MeResponse['balancesInfo'];
  };
}

export interface GommoModel {
  model?: string;
  slug?: string;
  model_id?: string;
  id?: string;
  id_base?: string;
  name?: string;
  ratios?: unknown[];
  modes?: unknown[];
  resolutions?: unknown[];
  durations?: unknown[];
}

export interface ListModelsParams {
  type: JobType;
}

export interface CreateJobParams {
  type: JobType;
  modelSlug: string;
  fields: Record<string, unknown>;
  /** Server polls upstream when true (3.5s × 80) */
  wait?: boolean;
}

export interface PollJobParams {
  id: string;
  media: PollMedia;
}

export interface PollUntilDoneOptions {
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  onProgress?: (attempt: number, snapshot: PollSnapshot) => void;
}

export interface PollSnapshot {
  status: string;
  resultUrl: string | null;
  coverUrl?: string | null;
  idBase?: string;
}

export interface PollResult extends PollSnapshot {
  success: boolean;
  timeout?: boolean;
  error?: string;
}

export type ChatAction = 'chat' | 'stream' | 'set_model';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatParams {
  action: ChatAction;
  query?: string;
  sessionId?: string;
  messages?: ChatMessage[];
  agentId?: string;
  server?: string;
  model?: string;
  projectId?: string;
}

export type VoiceProvider = 'elevenlabs_cheap' | 'minimaxai_cheap' | 'omnivoice_local';

export interface SearchVoicesParams {
  server: VoiceProvider;
  page?: number;
  query?: string;
  projectId?: string;
}

export interface TtsParams {
  text: string;
  voice_id: string;
  server: VoiceProvider;
  model?: string;
  projectId?: string;
}

export interface UploadFileInput {
  /** Blob, File, or Buffer (Node) */
  data: Blob | ArrayBuffer | Uint8Array;
  fileName: string;
  mimeType?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  amountVnd: number;
  credits: number;
  bonusPercent: number;
  featured?: boolean;
}

export interface CreateTopupParams {
  username: string;
  packageId: string;
}

export interface BillingStatus {
  gommoPayment?: boolean;
  billingMode?: 'gommo' | 'legacy';
  payosConfigured: boolean;
  merchantReady: boolean;
  webhookUrl?: string | null;
  returnUrl?: string;
}

export interface TopupOrderResult {
  url?: string;
  orderCode?: string | number;
  username?: string;
  packageId?: string;
  credits?: number;
  qrImage?: string;
  amountVnd?: number;
  paid?: boolean;
  order?: Record<string, unknown>;
}

export interface PaymentSyncResult {
  paid: boolean;
  orderCode: string;
  deposit?: {
    status?: string;
    amount?: string;
    gateway?: string;
    created_time?: string;
  };
}
