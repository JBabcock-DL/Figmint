import type {
  CollectionId,
  TokensV1WC3DTCG,
  TokensV1WC3DTCGGroup,
  TokensV1WC3DTCGNode,
} from '@detroitlabs/figmint-contracts';

import { COLLECTION_IDS, COLLECTION_ID_SET } from './internal/constants';
import { AdapterFormatError } from './internal/names';

function isSchemaOrScalarEntry(key: string, value: unknown): boolean {
  return key === '$schema' || value === undefined || typeof value === 'string';
}

function isCollectionId(key: string): key is CollectionId {
  return COLLECTION_ID_SET.has(key as CollectionId);
}

function mergeOrphanGroupsIntoPrimitives(
  existing: TokensV1WC3DTCGGroup | undefined,
  orphans: Record<string, TokensV1WC3DTCGNode>,
): TokensV1WC3DTCGGroup {
  const base = existing ?? {};
  for (const key of Object.keys(orphans)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(base, key)) {
      throw new AdapterFormatError(
        `Top-level group "${key}" conflicts with an existing group under primitives`,
        key,
      );
    }
  }
  return { ...base, ...orphans };
}

/**
 * Figmint DTCG expects top-level keys to be collection ids (`primitives`, `theme`, …).
 * Generic W3C exports (Tokens Studio, Style Dictionary, hand-authored palettes) often
 * use semantic groups (`color`, `spacing`) at the root — fold those under `primitives`.
 */
export function normalizeDtcgTopLevel(input: TokensV1WC3DTCG): TokensV1WC3DTCG {
  const collectionGroups: Partial<Record<CollectionId, TokensV1WC3DTCGGroup>> = {};
  const orphanGroups: Record<string, TokensV1WC3DTCGNode> = {};

  for (const [key, value] of Object.entries(input)) {
    if (isSchemaOrScalarEntry(key, value)) {
      continue;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new AdapterFormatError(`Invalid DTCG group node: ${key}`, key);
    }
    const node = value as TokensV1WC3DTCGGroup;
    if (isCollectionId(key)) {
      collectionGroups[key] = node;
    } else {
      orphanGroups[key] = node;
    }
  }

  if (Object.keys(orphanGroups).length === 0) {
    return input;
  }

  const normalized: TokensV1WC3DTCG = {};
  if (typeof input.$schema === 'string') {
    normalized.$schema = input.$schema;
  }

  normalized.primitives = mergeOrphanGroupsIntoPrimitives(
    collectionGroups.primitives,
    orphanGroups,
  );

  for (const collectionId of COLLECTION_IDS) {
    if (collectionId === 'primitives') {
      continue;
    }
    const group = collectionGroups[collectionId];
    if (group !== undefined) {
      normalized[collectionId] = group;
    }
  }

  return normalized;
}
