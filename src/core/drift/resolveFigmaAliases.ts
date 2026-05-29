/// <reference types="@figma/plugin-typings" />

import type { FigmaCollectionSnapshot, FigmaVariableSnapshot } from '@/core/audit/types';

import type { VariableComparable } from './types';

/** Figma-only chrome — not part of the five canonical repo collections. */
export const DRIFT_SYNC_EXCLUDED_COLLECTIONS = ['Documentation'];

function isVariableAlias(value: unknown): value is VariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as VariableAlias).type === 'VARIABLE_ALIAS' &&
    typeof (value as VariableAlias).id === 'string'
  );
}

function buildVariableIdIndex(
  collections: FigmaCollectionSnapshot[],
): Map<string, FigmaVariableSnapshot> {
  const index = new Map<string, FigmaVariableSnapshot>();
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    for (let j = 0; j < collection.variables.length; j++) {
      index.set(collection.variables[j].id, collection.variables[j]);
    }
  }
  return index;
}

function pickTargetModeValue(
  target: FigmaVariableSnapshot,
  sourceModeName: string,
): VariableValue | undefined {
  const values = target.valuesByMode;
  if (values[sourceModeName] !== undefined) {
    return values[sourceModeName];
  }
  if (values.Default !== undefined) {
    return values.Default;
  }
  const modeNames = Object.keys(values);
  if (modeNames.length > 0) {
    return values[modeNames[0]];
  }
  return undefined;
}

function resolveVariableValue(
  value: VariableValue,
  sourceModeName: string,
  index: Map<string, FigmaVariableSnapshot>,
  visiting: Set<string>,
): VariableValue | null {
  if (!isVariableAlias(value)) {
    return value;
  }
  if (visiting.has(value.id)) {
    return null;
  }
  const target = index.get(value.id);
  if (target === undefined) {
    return null;
  }
  visiting.add(value.id);
  const raw = pickTargetModeValue(target, sourceModeName);
  if (raw === undefined) {
    visiting.delete(value.id);
    return null;
  }
  const resolved = resolveVariableValue(raw, sourceModeName, index, visiting);
  visiting.delete(value.id);
  return resolved;
}

function resolveComparableValues(
  comparable: VariableComparable,
  index: Map<string, FigmaVariableSnapshot>,
): VariableComparable | null {
  const resolvedValues: Record<string, VariableValue> = {};
  const modeNames = Object.keys(comparable.valuesByMode);
  for (let i = 0; i < modeNames.length; i++) {
    const modeName = modeNames[i];
    const visiting = new Set<string>();
    const resolved = resolveVariableValue(
      comparable.valuesByMode[modeName],
      modeName,
      index,
      visiting,
    );
    if (resolved === null) {
      return null;
    }
    resolvedValues[modeName] = resolved;
  }
  return {
    resolvedType: comparable.resolvedType,
    valuesByMode: resolvedValues,
    codeSyntax: Object.assign({}, comparable.codeSyntax),
  };
}

export function resolveFigmaVariableAliases(
  comparables: Record<string, VariableComparable>,
  collections: FigmaCollectionSnapshot[],
): Record<string, VariableComparable> {
  const index = buildVariableIdIndex(collections);
  const result: Record<string, VariableComparable> = {};
  for (const key of Object.keys(comparables)) {
    const resolved = resolveComparableValues(comparables[key], index);
    if (resolved !== null) {
      result[key] = resolved;
    }
  }
  return result;
}
