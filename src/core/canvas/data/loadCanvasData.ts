import platformMappingRowsJson from './platform-mapping-rows.json';
import typographySlotsJson from './typography-slots.json';
import layoutEffectsJson from './layout-effects.json';

export interface TypographyBaseSlot {
  slot: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
}

export interface TypographyBodyVariant {
  variant: string;
  fontNameStyle: string;
  textDecoration: string;
  weightAlias: string;
  textFillBinding: string | null;
  italicFallback: string | null;
}

export interface TypographySlotsData {
  collection: string;
  modes: string[];
  baseMode: string;
  properties: string[];
  fontFamilyAliases: Record<string, string>;
  baseSlots: TypographyBaseSlot[];
  bodyVariants: {
    variants: TypographyBodyVariant[];
    sizes: string[];
  };
}

export interface PlatformMappingRow {
  tokenPath: string;
  collection: 'Theme' | 'Typography' | 'Primitives' | 'Layout' | 'Effects';
  defaultHex: string;
}

export interface PlatformMappingRowsData {
  rows: PlatformMappingRow[];
}

export interface LayoutEffectsReferenceRow {
  path: string;
  alias?: string;
  codeSyntax?: { WEB: string; ANDROID: string; iOS: string };
}

export interface LayoutEffectsReferenceData {
  layout: {
    spacing: LayoutEffectsReferenceRow[];
    radius: LayoutEffectsReferenceRow[];
  };
  effects: {
    blurs: LayoutEffectsReferenceRow[];
    color: { path: string };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertTypographySlotsData(raw: unknown): TypographySlotsData {
  if (!isRecord(raw)) {
    throw new Error('typography-slots.json: expected object');
  }
  if (!Array.isArray(raw.baseSlots) || raw.baseSlots.length === 0) {
    throw new Error('typography-slots.json: baseSlots must be a non-empty array');
  }
  if (!isRecord(raw.bodyVariants) || !Array.isArray(raw.bodyVariants.variants)) {
    throw new Error('typography-slots.json: bodyVariants.variants required');
  }
  return raw as unknown as TypographySlotsData;
}

function assertPlatformMappingRowsData(raw: unknown): PlatformMappingRowsData {
  if (!isRecord(raw)) {
    throw new Error('platform-mapping-rows.json: expected object');
  }
  if (!Array.isArray(raw.rows) || raw.rows.length < 22) {
    throw new Error('platform-mapping-rows.json: rows must contain at least 22 entries');
  }
  return raw as unknown as PlatformMappingRowsData;
}

/** Validated typography slot definitions (27 styles = 15 base + 12 body variants). */
export function loadTypographySlots(): TypographySlotsData {
  return assertTypographySlotsData(typographySlotsJson);
}

/** Minimum Step 17 platform-mapping row set (≥22 rows). */
export function loadPlatformMappingRows(): PlatformMappingRowsData {
  return assertPlatformMappingRowsData(platformMappingRowsJson);
}

function assertLayoutEffectsData(raw: unknown): LayoutEffectsReferenceData {
  if (!isRecord(raw)) {
    throw new Error('layout-effects.json: expected object');
  }
  if (!isRecord(raw.layout) || !Array.isArray((raw.layout as Record<string, unknown>).spacing)) {
    throw new Error('layout-effects.json: layout.spacing required');
  }
  if (!isRecord(raw.effects) || !Array.isArray((raw.effects as Record<string, unknown>).blurs)) {
    throw new Error('layout-effects.json: effects.blurs required');
  }
  return raw as unknown as LayoutEffectsReferenceData;
}

/** Canonical layout/effects token paths for Vitest oracles (lifted from DesignOps). */
export function loadLayoutEffectsReference(): LayoutEffectsReferenceData {
  return assertLayoutEffectsData(layoutEffectsJson);
}

/** All 27 published slot text style names derived from typography-slots.json. */
export function listExpectedSlotStyleNames(): string[] {
  const data = loadTypographySlots();
  const names: string[] = [];
  for (let i = 0; i < data.baseSlots.length; i++) {
    names.push(data.baseSlots[i].slot);
  }
  const sizes = data.bodyVariants.sizes;
  const variants = data.bodyVariants.variants;
  for (let si = 0; si < sizes.length; si++) {
    const size = sizes[si];
    for (let vi = 0; vi < variants.length; vi++) {
      names.push('Body/' + size + '/' + variants[vi].variant);
    }
  }
  return names;
}
