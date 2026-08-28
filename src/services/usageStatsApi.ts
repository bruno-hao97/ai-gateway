import { config } from '../config.js';
import { gommo79aiDeviceFields } from './gommoDevice.js';
import { GommoApiError } from './gommoClient.js';

const USAGE_HISTORY_URL = `${config.gommo.authBaseUrl.replace(/\/$/, '')}/api/v2/usage-history`;

export type UsageStatsPeriod = '7d' | '30d' | '90d';
export type UsageStatsType = 'all' | 'image' | 'video' | 'audio' | 'music';
export type UsageHistoryAction = 'stats' | 'logs';

export interface UsageTypeSummary {
  total: number;
  success: number;
  error: number;
  credit: number;
  credit_success: number;
  credit_error: number;
  refund: number;
  credit_net: number;
}

export interface UsageStatsChart {
  granularity: string;
  labels: string[];
  image: number[];
  video: number[];
  audio: number[];
  music: number[];
  credit: number[];
  refund: number[];
  success: number[];
  error: number[];
}

export interface UsageStatsTableRow {
  period: string;
  label: string;
  image: number;
  video: number;
  audio: number;
  music: number;
  total: number;
  success: number;
  error: number;
  credit: number;
  refund: number;
  credit_net: number;
}

export interface UsageStatsData {
  period: string;
  period_from: number;
  period_to: number;
  type: string;
  project_id: string;
  summary: UsageTypeSummary & { by_type: Record<string, UsageTypeSummary> };
  chart: UsageStatsChart;
  table: UsageStatsTableRow[];
}

export interface UsageListItem {
  id_base?: string;
  type?: string;
  model?: string;
  status?: string;
  credit?: number;
  credit_fee?: number;
  prompt?: string;
  created_at?: string | number;
  created_time?: string | number;
}

export interface UsageLogsData {
  period?: string;
  type?: string;
  items: UsageListItem[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}

/** @deprecated Use UsageLogsData */
export type UsageListData = UsageLogsData;

export interface GommoDevicePayload {
  device_id: string;
  device_name: string;
  device_info: string;
}

export interface UsageStatsApiOptions {
  accessToken: string;
  domain: string;
  projectId?: string;
}

export interface UsageHistoryRequest {
  action: UsageHistoryAction;
  period?: UsageStatsPeriod;
  type?: UsageStatsType;
  language?: string;
  device?: GommoDevicePayload;
  page?: number;
  limit?: number;
}

const VALID_PERIODS = new Set<UsageStatsPeriod>(['7d', '30d', '90d']);
const VALID_TYPES = new Set<UsageStatsType>(['all', 'image', 'video', 'audio', 'music']);

export function normalizeUsagePeriod(raw: string | undefined): UsageStatsPeriod {
  if (raw && VALID_PERIODS.has(raw as UsageStatsPeriod)) return raw as UsageStatsPeriod;
  return '30d';
}

export function normalizeUsageType(raw: string | undefined): UsageStatsType {
  if (raw && VALID_TYPES.has(raw as UsageStatsType)) return raw as UsageStatsType;
  return 'all';
}

function extractLogItems(data: Record<string, unknown>): UsageListItem[] {
  if (Array.isArray(data.items)) return data.items as UsageListItem[];
  const nested = data.data;
  if (nested && typeof nested === 'object' && Array.isArray((nested as { items?: UsageListItem[] }).items)) {
    return (nested as { items: UsageListItem[] }).items;
  }
  if (Array.isArray(data.logs)) return data.logs as UsageListItem[];
  if (Array.isArray(data.list)) return data.list as UsageListItem[];
  return [];
}

export class UsageStatsApi {
  accessToken: string;
  domain: string;
  projectId: string;

  constructor({ accessToken, domain, projectId = 'default' }: UsageStatsApiOptions) {
    this.accessToken = accessToken;
    this.domain = domain;
    this.projectId = projectId;
  }

  private buildForm(req: UsageHistoryRequest): URLSearchParams {
    const period = req.period ?? '30d';
    const type = req.type ?? 'all';
    const device = req.device ?? gommo79aiDeviceFields();
    const language = req.language || (req.action === 'logs' ? 'VI' : 'vi');
    const body = new URLSearchParams({
      access_token: this.accessToken,
      domain: this.domain,
      action: req.action,
      type,
      period,
      language,
      device_id: device.device_id,
      device_name: device.device_name,
      device_info: device.device_info,
    });
    if (this.projectId && this.projectId !== 'default') {
      body.set('project_id', this.projectId);
    }
    if (req.action === 'logs') {
      body.set('limit', String(Math.min(Math.max(req.limit ?? 30, 1), 100)));
      if (req.page != null && req.page > 1) {
        body.set('page', String(Math.max(req.page, 1)));
      }
    }
    return body;
  }

  private async post<T>(req: UsageHistoryRequest): Promise<T> {
    const res = await fetch(USAGE_HISTORY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: this.buildForm(req).toString(),
    });

    const text = await res.text();
    let parsed: { success?: boolean; message?: string; data?: T };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new GommoApiError(text || `HTTP ${res.status}`, { status: res.status });
    }

    if (!res.ok || parsed.success === false || parsed.data == null) {
      throw new GommoApiError(String(parsed.message || `HTTP ${res.status}`), {
        status: res.status,
      });
    }

    return parsed.data;
  }

  async fetchStats(opts: Omit<UsageHistoryRequest, 'action'>): Promise<UsageStatsData> {
    return this.post<UsageStatsData>({ ...opts, action: 'stats' });
  }

  async fetchLogs(opts: Omit<UsageHistoryRequest, 'action'>): Promise<UsageLogsData> {
    const raw = await this.post<Record<string, unknown>>({ ...opts, action: 'logs' });
    const items = extractLogItems(raw);
    const limit = typeof raw.limit === 'number' ? raw.limit : opts.limit ?? 30;
    return {
      period: typeof raw.period === 'string' ? raw.period : opts.period,
      type: typeof raw.type === 'string' ? raw.type : opts.type,
      items,
      total: typeof raw.total === 'number' ? raw.total : items.length,
      page: typeof raw.page === 'number' ? raw.page : opts.page ?? 1,
      limit,
      has_more: Boolean(raw.has_more) || items.length >= limit,
    };
  }

  /** @deprecated Use fetchLogs */
  async fetchList(opts: Omit<UsageHistoryRequest, 'action'>): Promise<UsageLogsData> {
    return this.fetchLogs(opts);
  }
}
