// =============================================================================
// Branded identifier types
// =============================================================================

/** One of the five canonical collections. */
export type CollectionId = 'primitives' | 'theme' | 'typography' | 'layout' | 'effects';

/**
 * Figma Plugin API codeSyntax platforms — literal casing matches
 * `CodeSyntaxPlatform` exactly. The third value is `iOS` (i + OS), NOT `IOS`.
 *
 * @see https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/
 */
export type CodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS';

/**
 * Mode name as it appears in the variables panel. Collection-scoped:
 *   - Primitives, Layout: 'Default'
 *   - Theme, Effects: 'Light' | 'Dark'
 *   - Typography: '85' | '100' | '110' | '120' | '130' | '150' | '175' | '200'
 * Storage uses names (stable across files), not runtime mode IDs.
 */
export type ModeName = string;

// =============================================================================
// Value types
// =============================================================================

/** Color in 0..1 RGBA (matches Figma Plugin API). */
export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Structured cross-collection alias reference.
 * Field name is `aliasOf` (not `$ref`) to avoid JSON Schema reserved-word collision.
 */
export interface TokenAliasRef {
  aliasOf: {
    collection: CollectionId;
    name: string;
  };
}

// =============================================================================
// Token variants — discriminated union by `type`
// =============================================================================

interface TokenBase {
  collection: CollectionId;
  /** Slash-separated path, e.g. 'color/primary/default'. Never use dots (Figma throws). */
  name: string;
  description?: string;
  scopes?: readonly string[];
  codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>;
  extensions?: Record<string, unknown>;
  deprecated?: boolean | string;
}

export interface TokenColor extends TokenBase {
  type: 'COLOR';
  valuesByMode: Record<ModeName, ColorValue | TokenAliasRef>;
}

export interface TokenFloat extends TokenBase {
  type: 'FLOAT';
  valuesByMode: Record<ModeName, number | TokenAliasRef>;
}

export interface TokenString extends TokenBase {
  type: 'STRING';
  valuesByMode: Record<ModeName, string | TokenAliasRef>;
}

export interface TokenBoolean extends TokenBase {
  type: 'BOOLEAN';
  valuesByMode: Record<ModeName, boolean | TokenAliasRef>;
}

export type Token = TokenColor | TokenFloat | TokenString | TokenBoolean;

/** Alias used by core mappers (WO-009+) — same shape as {@link Token}. */
export type CanonicalToken = Token;

// =============================================================================
// Collection metadata
// =============================================================================

export interface Collection {
  id: CollectionId;
  modes: readonly ModeName[];
}

// =============================================================================
// Optional EVC projection (Enterprise plan only — render-time, not storage)
// =============================================================================

export interface ThemeExtension {
  name: string;
  parentCollection: 'theme' | 'effects';
  overrides: readonly {
    name: string;
    valuesByMode: Record<ModeName, ColorValue | number | string | boolean | TokenAliasRef>;
  }[];
}

// =============================================================================
// Top-level document
// =============================================================================

export interface TokensV1 {
  v: 1;
  kind: 'tokens';
  collections: readonly Collection[];
  tokens: readonly Token[];
  themes?: readonly ThemeExtension[];
}
