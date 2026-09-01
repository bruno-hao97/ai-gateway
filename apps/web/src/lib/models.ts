export interface CatalogModel {
  slug: string;
  name: string;
  ratios: string[];
  modes: string[];
  resolutions: string[];
  durations: string[];
  raw: Record<string, unknown>;
}

function optionValues(list: unknown[] | undefined): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const v = row.value ?? row.ratio ?? row.mode ?? row.resolution ?? row.duration ?? row.label ?? row.name;
      if (typeof v === 'string' && v.trim()) out.push(v.trim());
    }
  }
  return [...new Set(out)];
}

export function parseModelsEnvelope(envelope: unknown): CatalogModel[] {
  let list: unknown[] = [];
  if (Array.isArray(envelope)) list = envelope;
  else if (envelope && typeof envelope === 'object') {
    const root = envelope as Record<string, unknown>;
    const data = root.data;
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === 'object' && Array.isArray((data as { models?: unknown[] }).models)) {
      list = (data as { models: unknown[] }).models;
    }
  }

  return list
    .map((m) => {
      const row = m as Record<string, unknown>;
      const slug = String(
        row.model || row.slug || row.model_id || row.id || row.id_base || '',
      ).trim();
      if (!slug) return null;
      const ratios = optionValues((row.ratios ?? row.ratio) as unknown[]);
      const modes = optionValues((row.modes ?? row.mode) as unknown[]);
      const resolutions = optionValues((row.resolutions ?? row.resolution) as unknown[]);
      const durations = optionValues((row.durations ?? row.duration) as unknown[]);
      return {
        slug,
        name: String(row.name || slug),
        ratios,
        modes,
        resolutions,
        durations,
        raw: row,
      } satisfies CatalogModel;
    })
    .filter(Boolean) as CatalogModel[];
}
