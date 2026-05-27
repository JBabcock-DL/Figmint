import type {
  CodeSyntaxPlatform,
  CollectionId,
  Token,
  TokenAliasRef,
  TokensV1,
} from '@detroitlabs/figmint-contracts';

export type { CodeSyntaxPlatform, CollectionId, TokenAliasRef, Token as TokenV1, TokensV1 };

export type PushErrorPhase =
  | 'collection'
  | 'mode'
  | 'variable'
  | 'value'
  | 'alias'
  | 'codeSyntax'
  | 'evc';

export interface PushError {
  collection: CollectionId;
  name: string;
  phase: PushErrorPhase;
  message: string;
}

export interface CollectionPassResult {
  collection: CollectionId;
  created: number;
  updated: number;
  skipped: number;
  errors: PushError[];
  durationMs: number;
}

export interface PushResult {
  created: number;
  updated: number;
  skipped: number;
  errors: PushError[];
  passes: CollectionPassResult[];
  evc?: {
    extensionsCreated: number;
    overridesApplied: number;
    skipped: number;
  };
  totalDurationMs: number;
}

export interface PushOptions {
  evcEnabled?: boolean;
  continueOnAuditFail?: boolean;
}

/** Runtime name → Figma variable id maps, populated after each collection pass. */
export type VarMaps = Record<CollectionId, Record<string, string>>;

export interface LocalVariableSnapshot {
  collectionByName: Map<string, VariableCollection>;
  variableByKey: Map<string, Variable>;
  collections: VariableCollection[];
  variables: Variable[];
}

export function createEmptyVarMaps(): VarMaps {
  return {
    primitives: {},
    theme: {},
    typography: {},
    layout: {},
    effects: {},
  };
}

export function isTokenAliasRef(value: unknown): value is TokenAliasRef {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.aliasOf !== 'object' || record.aliasOf === null) {
    return false;
  }
  const aliasOf = record.aliasOf as Record<string, unknown>;
  return typeof aliasOf.collection === 'string' && typeof aliasOf.name === 'string';
}
