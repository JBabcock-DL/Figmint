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
  $type: DtcgTokenType;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

export type TokensV1WC3DTCGNode = DtcgTokenLeaf | TokensV1WC3DTCGGroup;

export interface TokensV1WC3DTCGGroup {
  [tokenName: string]: TokensV1WC3DTCGNode;
}

export interface TokensV1WC3DTCG {
  $schema?: string;
  [group: string]: TokensV1WC3DTCGNode | string | undefined;
}

export type LegacyCodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS';

export interface LegacyCodeSyntaxTriple {
  WEB?: string;
  ANDROID?: string;
  iOS?: string;
}

export interface LegacyTokenVariable {
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, string | number | boolean>;
  codeSyntax?: LegacyCodeSyntaxTriple;
}

export interface LegacyTokenCollection {
  name: 'Primitives' | 'Theme' | 'Typography' | 'Layout' | 'Effects';
  modes: string[];
  variables: LegacyTokenVariable[];
}

export interface TokensV1Legacy {
  collections: LegacyTokenCollection[];
}

/** Canonical internal shape — stub until Sprint 2 CTX-002 promotion fills the body. */
export interface TokensV1 {
  v: 1;
  kind: 'tokens';
}

export type TokensInput = TokensV1 | TokensV1WC3DTCG | TokensV1Legacy;
