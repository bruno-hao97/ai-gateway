import type { CatalogModel } from './catalog-api';
import { catalogOptionsForField, type CatalogJobField, type CatalogOption } from './catalog-api';
import { pickMsg, resolveLabelLocale, type PortalLocale } from './portal-locale';

export type { CatalogJobField, CatalogOption };

export const CATALOG_JOB_FIELD_ORDER: CatalogJobField[] = ['ratio', 'mode', 'resolution', 'duration'];

const CATALOG_JOB_FIELD_LABELS: Record<CatalogJobField, { en: string; vi: string; th: string }> = {
  ratio: { en: 'Aspect ratio', vi: 'Tỉ lệ ảnh', th: 'อัตราส่วนภาพ' },
  mode: { en: 'Mode', vi: 'Chế độ', th: 'โหมด' },
  resolution: { en: 'Resolution', vi: 'Độ phân giải', th: 'ความละเอียด' },
  duration: { en: 'Duration', vi: 'Thời lượng', th: 'ความยาว' },
};

export function catalogJobFieldLabel(
  field: CatalogJobField,
  localeOrVi: PortalLocale | boolean = 'en',
): string {
  const locale = resolveLabelLocale(localeOrVi);
  const labels = CATALOG_JOB_FIELD_LABELS[field];
  return pickMsg(locale, labels.en, labels.vi, labels.th);
}

const STORAGE_KEY = 'gw_portal_chat_image_fields_v2';

export type CatalogJobFieldValues = Partial<Record<CatalogJobField, string>>;

export interface CatalogJobFieldDef {
  field: CatalogJobField;
  options: CatalogOption[];
}

export function catalogJobFieldDefs(model: CatalogModel | null | undefined): CatalogJobFieldDef[] {
  if (!model) return [];
  return CATALOG_JOB_FIELD_ORDER.map((field) => ({
    field,
    options: catalogOptionsForField(model, field),
  })).filter((def) => def.options.length > 0);
}

function readStoredFields(): Record<string, CatalogJobFieldValues> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CatalogJobFieldValues>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredFields(all: Record<string, CatalogJobFieldValues>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function readImageFieldValues(modelSlug: string): CatalogJobFieldValues {
  return readStoredFields()[modelSlug.trim()] ?? {};
}

export function writeImageFieldValues(modelSlug: string, values: CatalogJobFieldValues) {
  const key = modelSlug.trim();
  if (!key) return;
  const all = readStoredFields();
  all[key] = { ...values };
  writeStoredFields(all);
}

function preferredDefault(field: CatalogJobField, options: CatalogOption[]): string | undefined {
  if (!options.length) return undefined;
  const values = new Set(options.map((o) => o.value));
  const prefer: Record<CatalogJobField, string[]> = {
    ratio: ['1_1', '1:1', '1x1', 'auto'],
    mode: ['low', 'low_basic', 'relaxed', 'fast', 'standard'],
    resolution: ['1k', '2k'],
    duration: [],
  };
  for (const candidate of prefer[field]) {
    if (values.has(candidate)) return candidate;
  }
  return options[0]!.value;
}

export function pickCatalogFieldValue(
  field: CatalogJobField,
  options: CatalogOption[],
  preferred?: string,
): string {
  if (!options.length) {
    throw new Error(`Model has no ${field} options in catalog`);
  }
  const trimmed = preferred?.trim();
  if (trimmed) {
    const exact = options.find((o) => o.value === trimmed);
    if (exact) return exact.value;
    // Drop stale stored labels (e.g. "Low" before type-aware parsing).
    const byLabel = options.find((o) => o.label === trimmed);
    if (byLabel) return byLabel.value;
  }
  const fallback = preferredDefault(field, options);
  return fallback ?? options[0]!.value;
}

export function resolveImageFieldValues(
  model: CatalogModel,
  current?: CatalogJobFieldValues,
): CatalogJobFieldValues {
  const stored = readImageFieldValues(model.slug);
  const merged = { ...stored, ...current };
  const out: CatalogJobFieldValues = {};
  for (const def of catalogJobFieldDefs(model)) {
    out[def.field] = pickCatalogFieldValue(def.field, def.options, merged[def.field]);
  }
  return out;
}

export function validateCatalogJobFields(
  model: CatalogModel,
  values: CatalogJobFieldValues,
  localeOrVi: PortalLocale | boolean = 'en',
): string | null {
  const locale = resolveLabelLocale(localeOrVi);
  for (const def of catalogJobFieldDefs(model)) {
    const val = values[def.field]?.trim();
    if (!val) {
      return pickMsg(
        locale,
        `Select ${def.field} from catalog — never guess values.`,
        `Chọn ${def.field} từ catalog — không đoán giá trị.`,
        `เลือก ${def.field} จากแคตตาล็อก — ห้ามเดาค่า`,
      );
    }
    if (!def.options.some((o) => o.value === val)) {
      const label = catalogJobFieldLabel(def.field, locale);
      return pickMsg(
        locale,
        `Invalid ${label.toLowerCase()} for this model.`,
        `${label} không hợp lệ cho model này.`,
        `${label} ไม่ถูกต้องสำหรับโมเดลนี้`,
      );
    }
  }
  return null;
}

export function buildImageJobFields(
  model: CatalogModel,
  prompt: string,
  values: CatalogJobFieldValues,
): Record<string, string> {
  const fields: Record<string, string> = { prompt: prompt.trim() };
  for (const def of catalogJobFieldDefs(model)) {
    const val = values[def.field]?.trim();
    if (val) fields[def.field] = val;
  }
  return fields;
}

export function formatImageJobFieldSummary(
  values: CatalogJobFieldValues,
  localeOrVi: PortalLocale | boolean = 'en',
): string {
  const locale = resolveLabelLocale(localeOrVi);
  return CATALOG_JOB_FIELD_ORDER.filter((f) => values[f])
    .map((f) => `${catalogJobFieldLabel(f, locale)} ${values[f]}`)
    .join(' · ');
}
