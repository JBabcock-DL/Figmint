import { DTCG_TYPES, DTCG_WALK_MAX_DEPTH, LEGACY_COLLECTION_NAMES } from './internal/constants';

export type TokenWireFormat = 'dtcg' | 'legacy';

export function detectFormat(raw: unknown): TokenWireFormat | null {
  if (isLegacyWire(raw)) {
    return 'legacy';
  }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    !Array.isArray(raw) &&
    hasDtcgLeaf(raw as Record<string, unknown>, 0)
  ) {
    return 'dtcg';
  }
  return null;
}

function isLegacyWire(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.collections) || obj.collections.length === 0) {
    return false;
  }
  const first: unknown = obj.collections[0];
  if (typeof first !== 'object' || first === null) {
    return false;
  }
  const collection = first as Record<string, unknown>;
  if (typeof collection.name !== 'string' || !LEGACY_COLLECTION_NAMES.has(collection.name)) {
    return false;
  }
  return Array.isArray(collection.variables);
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
      DTCG_TYPES.has(node.$type as import('@detroitlabs/figmint-contracts').DtcgTokenType)
    ) {
      return true;
    }
    if (hasDtcgLeaf(node, depth + 1)) {
      return true;
    }
  }
  return false;
}
