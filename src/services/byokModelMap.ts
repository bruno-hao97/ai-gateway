import fs from 'node:fs/promises';
import { config } from '../config.js';

export interface ByokModelMapEntry {
  gatewayModelId: string;
  gommoServer?: string;
  gommoModel: string;
  byokProvider: 'openai' | 'anthropic';
  upstreamModel: string;
}

interface ByokModelMapFile {
  version: number;
  entries: ByokModelMapEntry[];
}

let cached: ByokModelMapEntry[] | null = null;
let cachedMtime = 0;

async function loadEntries(): Promise<ByokModelMapEntry[]> {
  try {
    const stat = await fs.stat(config.byok.modelMapFile);
    if (cached && stat.mtimeMs === cachedMtime) return cached;
    const raw = await fs.readFile(config.byok.modelMapFile, 'utf8');
    const parsed = JSON.parse(raw) as ByokModelMapFile;
    cached = Array.isArray(parsed.entries) ? parsed.entries : [];
    cachedMtime = stat.mtimeMs;
    return cached;
  } catch {
    cached = [];
    cachedMtime = 0;
    return cached;
  }
}

export function parseGatewayModelField(model?: string): { model: string; server?: string } {
  const raw = String(model || config.gommo.chatModel).trim();
  if (!raw) return { model: '' };
  const idx = raw.indexOf('::');
  if (idx === -1) return { model: raw };
  return {
    model: raw.slice(0, idx).trim(),
    server: raw.slice(idx + 2).trim() || undefined,
  };
}

export interface ByokModelMapSummary {
  gatewayModelId: string;
  byokProvider: ByokModelMapEntry['byokProvider'];
  upstreamModel: string;
  gommoServer?: string;
}

export async function listByokModelMapSummaries(): Promise<ByokModelMapSummary[]> {
  const entries = await loadEntries();
  return entries.map((entry) => ({
    gatewayModelId: entry.gatewayModelId,
    byokProvider: entry.byokProvider,
    upstreamModel: entry.upstreamModel,
    ...(entry.gommoServer ? { gommoServer: entry.gommoServer } : {}),
  }));
}

export async function lookupByokModelMap(input: {
  modelField?: string;
}): Promise<ByokModelMapEntry | null> {
  const { model, server } = parseGatewayModelField(input.modelField);
  if (!model) return null;

  const entries = await loadEntries();
  const normalizedServer = server?.trim().toLowerCase();

  const exact = entries.find((entry) => {
    const modelMatch =
      entry.gatewayModelId === model ||
      entry.gommoModel === model ||
      entry.upstreamModel === model;
    if (!modelMatch) return false;
    if (!entry.gommoServer) return true;
    if (!normalizedServer) return true;
    return entry.gommoServer.trim().toLowerCase() === normalizedServer;
  });
  if (exact) return exact;

  return (
    entries.find(
      (entry) =>
        (entry.gatewayModelId === model || entry.gommoModel === model) && !entry.gommoServer,
    ) ?? null
  );
}
