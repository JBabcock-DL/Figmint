import type { CollectionId, DtcgTokenType } from '@detroitlabs/figmint-contracts';

export const COLLECTION_IDS: readonly CollectionId[] = [
  'primitives',
  'theme',
  'typography',
  'layout',
  'effects',
] as const;

export const COLLECTION_ID_SET: ReadonlySet<CollectionId> = new Set(COLLECTION_IDS);

export const LEGACY_COLLECTION_NAMES: ReadonlySet<string> = new Set([
  'Primitives',
  'Theme',
  'Typography',
  'Layout',
  'Effects',
]);

export const LEGACY_TO_COLLECTION_ID: Record<string, CollectionId> = {
  Primitives: 'primitives',
  Theme: 'theme',
  Typography: 'typography',
  Layout: 'layout',
  Effects: 'effects',
};

export const DTCG_TYPES: ReadonlySet<DtcgTokenType> = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'shadow',
  'typography',
  'border',
  'transition',
  'gradient',
]);

export const DTCG_WALK_MAX_DEPTH = 12;

/** Locked mode lists per collection (DesignOps 01-collections.md). */
export const COLLECTION_MODES: Readonly<Record<CollectionId, readonly string[]>> = {
  primitives: ['Default'],
  theme: ['Light', 'Dark'],
  typography: ['85', '100', '110', '120', '130', '150', '175', '200'],
  layout: ['Default'],
  effects: ['Light', 'Dark'],
};

export const CANONICAL_COLLECTION_ORDER: readonly CollectionId[] = COLLECTION_IDS;

export const UNSUPPORTED_DTCG_TYPES: ReadonlySet<DtcgTokenType> = new Set([
  'border',
  'transition',
  'gradient',
]);
