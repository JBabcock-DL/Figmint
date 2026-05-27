import type { CodeSyntaxPlatform, ColorValue, TokensV1 } from './tokens.v1';

/** W3C DTCG `$type` values recognized by adapters and contract detection. */
export type DtcgTokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'shadow'
  | 'typography'
  | 'border'
  | 'transition'
  | 'gradient';

export interface DtcgTokenLeaf {
  $value: string | number | boolean | Record<string, unknown> | unknown[];
  $type?: DtcgTokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
}

export type TokensV1WC3DTCGNode = DtcgTokenLeaf | TokensV1WC3DTCGGroup;

export interface TokensV1WC3DTCGGroup {
  $type?: DtcgTokenType;
  [tokenName: string]: TokensV1WC3DTCGNode | DtcgTokenType | undefined;
}

/** W3C DTCG wire shape — top-level keys are collection groups or `$schema`. */
export interface TokensV1WC3DTCG {
  $schema?: string;
  [group: string]: TokensV1WC3DTCGNode | string | undefined;
}

export interface LegacyTokenVariable {
  name: string;
  type?: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, string | number | boolean | ColorValue>;
  codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>;
  description?: string;
}

export interface LegacyTokenCollection {
  name: 'Primitives' | 'Theme' | 'Typography' | 'Layout' | 'Effects';
  modes: readonly string[];
  variables: readonly LegacyTokenVariable[];
}

/** Detroit Labs Foundations legacy wire shape (`collections[]`). */
export interface TokensV1Legacy {
  collections: readonly LegacyTokenCollection[];
}

/** Normalizer entry union — canonical or either wire format. */
export type TokensInput = TokensV1 | TokensV1WC3DTCG | TokensV1Legacy;
