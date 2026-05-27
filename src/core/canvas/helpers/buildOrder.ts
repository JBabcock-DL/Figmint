import type { ColumnDef } from '../types';

/**
 * Ordered checklist matching `11-cells-12-bindings-13-build-order.md` §13.
 * Builders (WO-011..013) execute these steps per table — not a monolithic `buildTable()`.
 */
export enum TableBuildStep {
  /** §13.1 — outer `doc/table/{slug}` + chrome bindings + resizeWithoutConstraints(1640, 1) */
  CreateTableRoot = 'CreateTableRoot',
  /** §13.2 — header row + FIXED/FIXED header cells */
  CreateHeader = 'CreateHeader',
  /** §13.3 — empty body frame, fills = [] */
  CreateBody = 'CreateBody',
  /** §13.4 — data rows (Hug-before-resize per §0.1) */
  AppendDataRows = 'AppendDataRows',
  /** §13.5 — text pipeline (characters → resize → textAutoResize) */
  ConfigureText = 'ConfigureText',
  /** §13.5b — Primitives color ramp swatch bind (§0.7) */
  BindSwatches = 'BindSwatches',
  /** §13.6 — strip last row bottom stroke */
  StripLastRowStroke = 'StripLastRowStroke',
  /**
   * §13.7 — effectStyleId on table root when published.
   * §0.9 — skip for `doc/table/token-overview/platform-mapping` subtree.
   */
  ApplyTableEffect = 'ApplyTableEffect',
}

/**
 * §12 table chrome → Documentation collection paths (Default mode).
 * v60 reference: Figma node 401:14. Product-token previews stay on Primitives.
 */
export const TABLE_CHROME_BINDINGS: Record<
  string,
  { path: string; collection: string; mode?: string }
> = {
  tableFill: { path: 'doc/table/surface', collection: 'Documentation' },
  tableStroke: { path: 'doc/table/border', collection: 'Documentation' },
  tableShadow: { path: 'Effect/shadow-sm', collection: 'Effects', mode: 'Light' },
  headerFill: { path: 'doc/table/header-surface', collection: 'Documentation' },
  headerStroke: { path: 'doc/table/border', collection: 'Documentation' },
  headerText: { path: 'doc/text/muted', collection: 'Documentation' },
  rowStroke: { path: 'doc/table/border', collection: 'Documentation' },
  primaryText: { path: 'doc/text/primary', collection: 'Documentation' },
  mutedText: { path: 'doc/text/muted', collection: 'Documentation' },
  swatchStroke: { path: 'doc/preview/swatch-stroke', collection: 'Documentation' },
  radiusPreviewFill: { path: 'color/neutral/100', collection: 'Primitives' },
  radiusPreviewStroke: { path: 'doc/preview/swatch-stroke', collection: 'Documentation' },
  spacingPreviewFill: { path: 'color/primary/200', collection: 'Primitives' },
  effectsPreviewFill: { path: 'doc/table/surface', collection: 'Documentation' },
  categoryRowFill: { path: 'doc/table/header-surface', collection: 'Documentation' },
};

/**
 * Context passed by page builders — no Figma API calls inside this interface.
 */
export interface TableBuildContext {
  tableSlug: string;
  columns: ColumnDef[];
  /** Resolved chrome variables keyed like TABLE_CHROME_BINDINGS entries */
  chromeVariables: Record<string, Variable | null | undefined>;
}

/** Slug that must not receive table-root shadow per §0.9 */
export const PLATFORM_MAPPING_TABLE_SLUG = 'token-overview/platform-mapping';

/**
 * Returns false when `effectStyleId` must not be applied (§0.9 platform-mapping exclusion).
 */
export function shouldApplyTableShadow(tableSlug: string): boolean {
  return tableSlug !== PLATFORM_MAPPING_TABLE_SLUG;
}
