import type { ContractKind } from './types';

/** W3C DTCG `$type` values used by contract detection (adapter input types live in WO-007). */
type DtcgTokenType =
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

const KNOWN_V1_KINDS: ReadonlySet<string> = new Set([
  'ops-program',
  'component-spec',
  'drift-report',
  'handoff-context',
  'registry',
]);

const LEGACY_COLLECTION_NAMES: ReadonlySet<string> = new Set([
  'Primitives',
  'Theme',
  'Typography',
  'Layout',
  'Effects',
]);

const DTCG_TYPES: ReadonlySet<DtcgTokenType> = new Set([
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

const DTCG_WALK_MAX_DEPTH = 12;

export function detectContract(input: string): ContractKind | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.v === 1 && typeof obj.kind === 'string' && KNOWN_V1_KINDS.has(obj.kind)) {
    return obj.kind as ContractKind;
  }

  if (isLegacyTokens(obj)) {
    return 'tokens-legacy';
  }

  if (hasDtcgLeaf(obj, 0)) {
    return 'tokens-dtcg';
  }

  return null;
}

function isLegacyTokens(obj: Record<string, unknown>): boolean {
  if (!Array.isArray(obj.collections) || obj.collections.length === 0) {
    return false;
  }
  const collections: unknown[] = obj.collections;
  const first: unknown = collections[0];
  if (typeof first !== 'object' || first === null) {
    return false;
  }
  const collection = first as Record<string, unknown>;
  if (typeof collection.name !== 'string' || !LEGACY_COLLECTION_NAMES.has(collection.name)) {
    return false;
  }
  if (!Array.isArray(collection.variables)) {
    return false;
  }
  return true;
}

function hasDtcgLeaf(obj: Record<string, unknown>, depth: number): boolean {
  if (depth > DTCG_WALK_MAX_DEPTH) {
    return false;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$schema' || key.startsWith('$')) {
      continue;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }
    const node = value as Record<string, unknown>;
    if (
      '$value' in node &&
      '$type' in node &&
      typeof node.$type === 'string' &&
      DTCG_TYPES.has(node.$type as DtcgTokenType)
    ) {
      return true;
    }
    if (hasDtcgLeaf(node, depth + 1)) {
      return true;
    }
  }
  return false;
}
