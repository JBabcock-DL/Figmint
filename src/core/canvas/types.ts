export interface ColumnDef {
  id: string;
  width: number;
}

export type ColumnTableKey =
  | 'primitives/color-ramp'
  | 'primitives/space'
  | 'primitives/radius'
  | 'primitives/elevation'
  | 'primitives/typeface'
  | 'primitives/font-weight'
  | 'theme/semantic-group'
  | 'layout/spacing'
  | 'layout/radius'
  | 'typography/styles'
  | 'effects/shadows'
  | 'effects/color'
  | 'token-overview/platform-mapping';

export interface AxisSizing {
  primaryAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO';
}

export type BodyCellLayoutMode = 'VERTICAL' | 'HORIZONTAL';

export type StyleGuidePageSlug =
  | 'primitives'
  | 'theme'
  | 'text-styles'
  | 'token-overview'
  | 'layout'
  | 'effects';

export interface CanvasPageTarget {
  pageSlug: StyleGuidePageSlug;
  /** Optional explicit PageNode id — when omitted, resolve via slug + legacy fallbacks */
  pageId?: string;
}

export interface CanvasBuildContext {
  tokens: import('@detroitlabs/figmint-contracts').TokensV1;
  pushResult?: import('@/core/audit/types').PushResult;
  pageId?: string;
}

export interface CanvasBuildResult {
  ok: boolean;
  builder: StyleGuidePageSlug;
  durationMs: number;
  pageId: string;
  pageName: string;
  tableCount: number;
  swatchCount: number;
  warnings: string[];
  audit?: import('@detroitlabs/figmint-contracts').AuditReportV1;
  stats?: Record<string, number>;
}

export interface CodeSyntaxTriple {
  WEB: string;
  ANDROID: string;
  iOS: string;
}

export interface ColorRampRow {
  tokenPath: string;
  resolvedHex: string;
  codeSyntax: CodeSyntaxTriple;
}

export interface PrimitiveFloatRow {
  tokenPath: string;
  resolvedPx: number;
  resolvedValue: string;
  codeSyntax: CodeSyntaxTriple;
}

export interface PrimitiveStringRow {
  tokenPath: string;
  resolvedValue: string;
  codeSyntax: CodeSyntaxTriple;
}

export interface ThemeRow {
  tokenPath: string;
  resolvedHexLight: string;
  resolvedHexDark: string;
  resolvedHslLight?: string | null;
  resolvedHslDark?: string | null;
  aliasLight: string | null;
  aliasDark: string | null;
  codeSyntax: CodeSyntaxTriple;
  themeVariableId?: string;
}
