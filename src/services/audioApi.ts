import { config } from '../config.js';
import { GommoApiError } from './gommoClient.js';
import { gommoDeviceFields } from './gommoDevice.js';

export type VoiceProvider = 'elevenlabs_cheap' | 'minimaxai_cheap' | 'omnivoice_local';

export interface VoiceItem {
  voice_id: string;
  id_base?: string;
  name: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
  server?: string;
}

export interface SearchVoicesResult {
  voices: VoiceItem[];
  hasMore: boolean;
  raw?: unknown;
}

export interface AudioInfo {
  text?: string;
  status?: string;
  id_base?: string;
  file_url?: string;
  result_url?: string;
  url?: string;
}

export interface CreateAudioResult {
  fileUrl: string;
  audioInfo: AudioInfo;
  raw: Record<string, unknown>;
}

export interface AudioListItem {
  id_base: string;
  file_url: string;
  text?: string;
  status?: string;
  created_at?: string;
}

export interface AudioApiOptions {
  accessToken: string;
  domain: string;
  projectId?: string;
}

const AUDIO_URLS = [
  `${config.gommo.authBaseUrl.replace(/\/$/, '')}/ai/audio`,
  `${config.gommo.authBaseUrl.replace(/\/$/, '')}${config.gommo.authPath}/ai/audio`,
];

function normalizeElevenLabsCheapModel(modelId: string): string {
  const map: Record<string, string> = {
    eleven_turbo_v2_5: 'eleven_flash_v2_5',
    eleven_v2_5_flash: 'eleven_flash_v2_5',
    eleven_turbo_v2: 'eleven_flash_v2',
    eleven_v2_flash: 'eleven_flash_v2',
  };
  return map[modelId] ?? modelId;
}

function providerFields(server: VoiceProvider, page: number, query?: string): Record<string, string> {
  const q = query?.trim();
  switch (server) {
    case 'elevenlabs_cheap':
      return {
        sort: 'created_date',
        page_size: '100',
        page: String(page),
        ...(q ? { search: q } : {}),
      };
    case 'minimaxai_cheap':
      return {
        type: 'system',
        'filters[explore]': 'public',
        limit: '500',
        page: String(page + 1),
        ...(q ? { search: q } : {}),
      };
    case 'omnivoice_local':
      return {
        type: 'public',
        limit: '500',
        page: String(page + 1),
        ...(q ? { search: q } : {}),
      };
    default:
      return {};
  }
}

function normalizeVoice(v: VoiceItem): VoiceItem {
  return {
    ...v,
    voice_id: v.voice_id || v.id_base || '',
    id_base: v.id_base || v.voice_id,
  };
}

function parseVoicesEnvelope(parsed: Record<string, unknown>): SearchVoicesResult {
  const dataRaw = parsed.data;
  if (dataRaw && typeof dataRaw === 'object' && !Array.isArray(dataRaw)) {
    const dataBlock = dataRaw as { items?: VoiceItem[]; pagination?: { page?: number; pages?: number } };
    if (Array.isArray(dataBlock.items)) {
      const { page, pages } = dataBlock.pagination || {};
      return {
        voices: dataBlock.items.map(normalizeVoice),
        hasMore: page != null && pages != null ? page < pages : false,
        raw: parsed,
      };
    }
  }

  const voicesBlock = parsed.voices as { data?: { voices?: VoiceItem[]; has_more?: boolean } } | undefined;
  const list = voicesBlock?.data?.voices;
  if (Array.isArray(list) && list.length) {
    return {
      voices: list.map(normalizeVoice),
      hasMore: Boolean(voicesBlock?.data?.has_more),
      raw: parsed,
    };
  }

  if (Array.isArray(dataRaw)) {
    return { voices: (dataRaw as VoiceItem[]).map(normalizeVoice), hasMore: false, raw: parsed };
  }

  return { voices: [], hasMore: false, raw: parsed };
}

function extractAudioFileUrl(audioInfo?: AudioInfo | null): string | null {
  if (!audioInfo) return null;
  return audioInfo.file_url || audioInfo.result_url || audioInfo.url || null;
}

export class AudioApi {
  accessToken: string;
  domain: string;
  projectId: string;

  constructor({ accessToken, domain, projectId = 'default' }: AudioApiOptions) {
    this.accessToken = accessToken;
    this.domain = domain;
    this.projectId = projectId;
  }

  private baseFields(): URLSearchParams {
    const device = gommoDeviceFields();
    const body = new URLSearchParams({
      access_token: this.accessToken,
      domain: this.domain,
      project_id: this.projectId,
      device_id: device.device_id,
      device_name: device.device_name,
      device_info: device.device_info,
    });
    return body;
  }

  private async postAudioApi(body: URLSearchParams): Promise<Record<string, unknown>> {
    let lastErr: Error | null = null;

    for (const url of AUDIO_URLS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        const text = await res.text();
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new GommoApiError(text || `HTTP ${res.status}`, { status: res.status });
        }

        const dataBlock = parsed.data as { success?: boolean } | undefined;
        const failed =
          parsed.success === false
          || (dataBlock && typeof dataBlock === 'object' && dataBlock.success === false);

        if (!res.ok || failed) {
          throw new GommoApiError((parsed.message as string) || `HTTP ${res.status}`, {
            status: res.status,
          });
        }

        return parsed;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastErr ?? new GommoApiError('Không gọi được audio API');
  }

  async searchVoices(opts: {
    server: VoiceProvider;
    page?: number;
    query?: string;
  }): Promise<SearchVoicesResult> {
    const page = opts.page ?? 0;
    const body = this.baseFields();
    body.set('action_type', 'searchVoices');
    body.set('server', opts.server);
    for (const [key, value] of Object.entries(providerFields(opts.server, page, opts.query))) {
      body.set(key, value);
    }
    const parsed = await this.postAudioApi(body);
    return parseVoicesEnvelope(parsed);
  }

  async createTts(opts: {
    text: string;
    voice_id: string;
    server: VoiceProvider;
    model: string;
    voice_name?: string;
    language?: string;
    voice_settings?: Record<string, unknown>;
  }): Promise<CreateAudioResult> {
    const body = this.baseFields();
    body.set('action_type', 'create');
    body.set('text', opts.text.trim());
    body.set('voice_id', opts.voice_id);
    body.set('server', opts.server);
    const model =
      opts.server === 'elevenlabs_cheap'
        ? normalizeElevenLabsCheapModel(opts.model)
        : opts.model;
    body.set('model', model);

    if (opts.voice_name?.trim()) body.set('voice_name', opts.voice_name.trim());
    if (opts.language?.trim() && opts.language !== 'auto') {
      body.set('language', opts.language.trim());
    }

    const isOpenVoiceStyle =
      opts.server === 'omnivoice_local' || opts.server === 'minimaxai_cheap';
    if (isOpenVoiceStyle) body.set('audio_type', 'standard');

    const settingKey = isOpenVoiceStyle ? 'voice_setting' : 'voice_settings';
    if (opts.voice_settings) {
      for (const [key, value] of Object.entries(opts.voice_settings)) {
        if (value != null && value !== '') {
          body.set(`${settingKey}[${key}]`, String(value));
        }
      }
    }

    const parsed = await this.postAudioApi(body);
    const audioInfo = (parsed.audioInfo as AudioInfo | undefined) ?? {};
    const fileUrl = extractAudioFileUrl(audioInfo);
    if (!fileUrl) {
      throw new GommoApiError((parsed.message as string) || 'Không nhận được file audio từ server');
    }
    return { fileUrl, audioInfo, raw: parsed };
  }

  async getLists(): Promise<AudioListItem[]> {
    const body = this.baseFields();
    body.set('action_type', 'getLists');
    const parsed = await this.postAudioApi(body);
    const data = parsed.data;
    if (!Array.isArray(data)) return [];
    return (data as AudioListItem[]).filter((item) => item?.file_url && item?.id_base);
  }
}
