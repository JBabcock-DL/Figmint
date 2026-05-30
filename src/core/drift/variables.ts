/// <reference types="@figma/plugin-typings" />

import type { Token, TokensV1 } from '@detroitlabs/fighub-contracts';

import type { FigmaCollectionSnapshot } from '@/core/audit/types';
import { DISPLAY_NAME } from '@/core/variables/collections';
import { mapCodeSyntax } from '@/core/variables/codeSyntax';
import { resolveTokens } from '@/core/variables/resolveTokens';

import { classifyThreeWay, isSynced } from './classify';
import { normalizeVariableComparable } from './normalizeComparable';
import {
  DRIFT_SYNC_EXCLUDED_COLLECTIONS,
  resolveFigmaVariableAliases,
} from './resolveFigmaAliases';
import { toUnsyncedDriftDirection } from './types';
import { resolveSnapshotForClassify } from './snapshotReconcile';
import type {
  VariableComparable,
  VariableDriftDetectInput,
  VariableDriftDetectResult,
} from './types';
import { variableStatesEqual } from './variableEqual';
import { toVariableDriftId } from './variableKeys';

function tokenTypeToResolvedType(type: Token['type']): VariableResolvedDataType {
  return type;
}

function coerceVariableValue(value: unknown): VariableValue | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (
      typeof record.r === 'number' &&
      typeof record.g === 'number' &&
      typeof record.b === 'number' &&
      typeof record.a === 'number'
    ) {
      return {
        r: record.r,
        g: record.g,
        b: record.b,
        a: record.a,
      };
    }
    if (record.type === 'VARIABLE_ALIAS' && typeof record.id === 'string') {
      return record as unknown as VariableAlias;
    }
  }
  return null;
}

function buildComparableFromResolved(
  resolvedType: VariableResolvedDataType,
  valuesByMode: Record<string, unknown>,
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
): VariableComparable | null {
  const comparableValues: Record<string, VariableValue> = {};
  for (const modeName of Object.keys(valuesByMode)) {
    const coerced = coerceVariableValue(valuesByMode[modeName]);
    if (coerced === null) {
      return null;
    }
    comparableValues[modeName] = coerced;
  }
  return {
    resolvedType: resolvedType,
    valuesByMode: comparableValues,
    codeSyntax: codeSyntax,
  };
}

function variableKey(collectionName: string, variableName: string): string {
  const normalizedName = variableName.startsWith('/') ? variableName.slice(1) : variableName;
  return collectionName + '/' + normalizedName;
}

export interface FlattenFigmaSnapshotsOptions {
  /** Resolve VARIABLE_ALIAS mode values to literals (matches repo resolveTokens for compare/push). */
  resolveAliases?: boolean;
  /** Omit collections from the flattened map (defaults to Documentation when resolving aliases). */
  excludeCollections?: string[];
}

export function flattenFigmaVariableSnapshots(
  collections: FigmaCollectionSnapshot[],
  options?: FlattenFigmaSnapshotsOptions,
): Record<string, VariableComparable> {
  const resolveAliases = options?.resolveAliases === true;
  const exclude = new Set(
    options?.excludeCollections !== undefined
      ? options.excludeCollections
      : resolveAliases
        ? DRIFT_SYNC_EXCLUDED_COLLECTIONS
        : [],
  );
  const result: Record<string, VariableComparable> = {};
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    if (exclude.has(collection.name)) {
      continue;
    }
    for (let j = 0; j < collection.variables.length; j++) {
      const variable = collection.variables[j];
      const key = variableKey(collection.name, variable.name);
      result[key] = {
        resolvedType: variable.resolvedType,
        valuesByMode: Object.assign({}, variable.valuesByMode),
        codeSyntax: Object.assign({}, variable.codeSyntax),
      };
    }
  }
  const resolved = resolveAliases ? resolveFigmaVariableAliases(result, collections) : result;
  const normalized: Record<string, VariableComparable> = {};
  for (const key of Object.keys(resolved)) {
    const slashIndex = key.indexOf('/');
    normalized[key] = normalizeVariableComparable(resolved[key], {
      collectionName: key.slice(0, slashIndex),
      variableName: key.slice(slashIndex + 1),
    });
  }
  return normalized;
}

export function flattenRepoTokens(tokens: TokensV1): Record<string, VariableComparable> {
  const resolved = resolveTokens(tokens);
  const tokenByKey = new Map<string, Token>();
  for (let i = 0; i < tokens.tokens.length; i++) {
    const token = tokens.tokens[i];
    tokenByKey.set(token.collection + ':' + token.name, token);
  }

  const result: Record<string, VariableComparable> = {};
  for (let i = 0; i < resolved.tokens.length; i++) {
    const entry = resolved.tokens[i];
    const token = tokenByKey.get(entry.collection + ':' + entry.name);
    if (!token) {
      continue;
    }
    const displayName = DISPLAY_NAME[entry.collection];
    const key = variableKey(displayName, entry.name);
    const comparable = buildComparableFromResolved(
      tokenTypeToResolvedType(entry.type),
      entry.resolvedValuesByMode,
      mapCodeSyntax(token),
    );
    if (comparable !== null) {
      result[key] = normalizeVariableComparable(comparable, { token: token });
    }
  }
  return result;
}

function splitVariableKey(key: string): { collectionName: string; variableName: string } {
  const slashIndex = key.indexOf('/');
  return {
    collectionName: key.slice(0, slashIndex),
    variableName: key.slice(slashIndex + 1),
  };
}

export function detectVariableDrift(input: VariableDriftDetectInput): VariableDriftDetectResult {
  const keySet: Record<string, boolean> = {};
  for (const key of Object.keys(input.figmaTokens)) {
    keySet[key] = true;
  }
  for (const key of Object.keys(input.repoTokens)) {
    keySet[key] = true;
  }
  for (const key of Object.keys(input.snapshotTokens)) {
    keySet[key] = true;
  }

  const drifts: VariableDriftDetectResult['drifts'] = [];
  let syncedCount = 0;

  for (const key of Object.keys(keySet)) {
    const figmaValue = input.figmaTokens[key] !== undefined ? input.figmaTokens[key] : null;
    const repoValue = input.repoTokens[key] !== undefined ? input.repoTokens[key] : null;
    const snapshotValue =
      input.snapshotTokens[key] !== undefined ? input.snapshotTokens[key] : null;
    const snapshotSource =
      input.snapshotSources !== undefined ? input.snapshotSources[key] : undefined;
    const baselineSnapshot = resolveSnapshotForClassify(
      figmaValue,
      repoValue,
      snapshotValue,
      snapshotSource,
    );

    const direction = classifyThreeWay(
      figmaValue,
      repoValue,
      baselineSnapshot,
      variableStatesEqual,
    );
    if (isSynced(direction)) {
      syncedCount += 1;
      continue;
    }

    const parts = splitVariableKey(key);
    drifts.push({
      id: toVariableDriftId(parts.collectionName, parts.variableName),
      kind: 'variable',
      direction: toUnsyncedDriftDirection(direction),
      figma: figmaValue,
      repo: repoValue,
      lastSynced: snapshotValue,
    });
  }

  return {
    drifts: drifts,
    syncedCount: syncedCount,
  };
}
