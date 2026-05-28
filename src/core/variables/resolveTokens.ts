import type {
  CollectionId,
  Token as TokenV1,
  TokenAliasRef,
  TokensV1,
} from '@detroitlabs/fighub-contracts';

import { isTokenAliasRef } from './types';

export interface ResolvedTokenView {
  collection: CollectionId;
  name: string;
  type: TokenV1['type'];
  resolvedValuesByMode: Record<string, unknown>;
}

export interface ResolveTokensResult {
  tokens: ResolvedTokenView[];
  errors: string[];
}

function tokenKey(collection: CollectionId, name: string): string {
  return collection + ':' + name;
}

function collectAliasTargets(token: TokenV1): TokenAliasRef[] {
  const refs: TokenAliasRef[] = [];
  const values = token.valuesByMode as Record<string, unknown>;
  for (const modeName of Object.keys(values)) {
    const value = values[modeName];
    if (isTokenAliasRef(value)) {
      refs.push(value);
    }
  }
  return refs;
}

export function resolveTokens(tokensDoc: TokensV1): ResolveTokensResult {
  const tokenIndex = new Map<string, TokenV1>();
  for (const token of tokensDoc.tokens) {
    tokenIndex.set(tokenKey(token.collection, token.name), token);
  }

  const resolvedCache = new Map<string, Record<string, unknown>>();
  const visiting = new Set<string>();
  const errors: string[] = [];

  function resolveValue(raw: unknown, stack: string[]): unknown {
    if (!isTokenAliasRef(raw)) {
      return raw;
    }
    const targetKey = tokenKey(raw.aliasOf.collection, raw.aliasOf.name);
    const target = tokenIndex.get(targetKey);
    if (!target) {
      errors.push('Unresolved alias target: ' + targetKey);
      return null;
    }
    const resolvedTarget = resolveTokenValues(target, stack.concat(targetKey));
    if (Object.keys(resolvedTarget).length === 0) {
      return null;
    }
    const firstMode = Object.keys(resolvedTarget)[0];
    return resolvedTarget[firstMode];
  }

  function resolveTokenValues(token: TokenV1, stack: string[]): Record<string, unknown> {
    const key = tokenKey(token.collection, token.name);
    const cached = resolvedCache.get(key);
    if (cached) {
      return cached;
    }
    if (visiting.has(key)) {
      errors.push('Alias cycle detected at ' + key);
      return {};
    }
    visiting.add(key);

    const resolved: Record<string, unknown> = {};
    const values = token.valuesByMode as Record<string, unknown>;
    for (const modeName of Object.keys(values)) {
      resolved[modeName] = resolveValue(values[modeName], stack);
    }

    visiting.delete(key);
    resolvedCache.set(key, resolved);
    return resolved;
  }

  const tokens: ResolvedTokenView[] = [];
  for (const token of tokensDoc.tokens) {
    const refs = collectAliasTargets(token);
    for (const ref of refs) {
      const targetKey = tokenKey(ref.aliasOf.collection, ref.aliasOf.name);
      if (!tokenIndex.has(targetKey)) {
        errors.push('Missing alias target: ' + targetKey);
      }
    }

    tokens.push({
      collection: token.collection,
      name: token.name,
      type: token.type,
      resolvedValuesByMode: resolveTokenValues(token, [tokenKey(token.collection, token.name)]),
    });
  }

  return { tokens, errors };
}

/** Topological order for intra-collection alias dependencies (creation order). */
export function sortTokensForPush(tokens: TokenV1[], collectionId: CollectionId): TokenV1[] {
  const inCollection = tokens.filter((token) => token.collection === collectionId);
  const nameSet = new Set(inCollection.map((token) => token.name));
  const deps = new Map<string, Set<string>>();

  for (const token of inCollection) {
    const tokenDeps = new Set<string>();
    const values = token.valuesByMode as Record<string, unknown>;
    for (const modeName of Object.keys(values)) {
      const value = values[modeName];
      if (isTokenAliasRef(value) && value.aliasOf.collection === collectionId) {
        if (nameSet.has(value.aliasOf.name) && value.aliasOf.name !== token.name) {
          tokenDeps.add(value.aliasOf.name);
        }
      }
    }
    deps.set(token.name, tokenDeps);
  }

  const sorted: TokenV1[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string): boolean {
    if (visited.has(name)) {
      return true;
    }
    if (visiting.has(name)) {
      return false;
    }
    visiting.add(name);
    const tokenDeps = deps.get(name);
    if (tokenDeps) {
      for (const dep of tokenDeps) {
        if (!visit(dep)) {
          return false;
        }
      }
    }
    visiting.delete(name);
    visited.add(name);
    const token = inCollection.find((entry) => entry.name === name);
    if (token) {
      sorted.push(token);
    }
    return true;
  }

  for (const token of inCollection) {
    if (!visit(token.name)) {
      return inCollection;
    }
  }

  return sorted;
}
