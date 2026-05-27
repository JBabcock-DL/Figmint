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
 * §12 table chrome → variable path map (Theme · Light unless noted).
 * Builders resolve paths to `Variable` instances before calling bind helpers.
 */
export const TABLE_CHROME_BINDINGS: Record<
  string,
  { path: string; collection: string; mode?: string }
> = {
  tableFill: { path: 'color/background/default', collection: 'Theme', mode: 'Light' },
  tableStroke: { path: 'color/border/subtle', collection: 'Theme', mode: 'Light' },
  tableShadow: { path: 'Effect/shadow-sm', collection: 'Effects', mode: 'Light' },
  headerFill: { path: 'color/background/variant', collection: 'Theme', mode: 'Light' },
  headerStroke: { path: 'color/border/subtle', collection: 'Theme', mode: 'Light' },
  headerText: { path: 'color/background/content-muted', collection: 'Theme', mode: 'Light' },
  rowStroke: { path: 'color/border/subtle', collection: 'Theme', mode: 'Light' },
  primaryText: { path: 'color/background/content', collection: 'Theme', mode: 'Light' },
  mutedText: { path: 'color/background/content-muted', collection: 'Theme', mode: 'Light' },
  swatchStroke: { path: 'color/border/subtle', collection: 'Theme', mode: 'Light' },
  radiusPreviewFill: { path: 'color/neutral/100', collection: 'Primitives' },
  radiusPreviewStroke: { path: 'color/border/subtle', collection: 'Theme', mode: 'Light' },
  spacingPreviewFill: { path: 'color/primary/200', collection: 'Primitives' },
  effectsPreviewFill: { path: 'color/background/default', collection: 'Theme', mode: 'Light' },
  categoryRowFill: { path: 'color/background/variant', collection: 'Theme', mode: 'Light' },
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
