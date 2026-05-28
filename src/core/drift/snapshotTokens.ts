/// <reference types="@figma/plugin-typings" />

import { getSnapshot } from '@/core/sync/snapshotStore';

import { parseVariableDriftId } from './variableKeys';
import type { VariableComparable } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVariableComparable(value: unknown): value is VariableComparable {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.resolvedType !== 'string') {
    return false;
  }
  if (!isRecord(value.valuesByMode)) {
    return false;
  }
  const codeSyntax = value.codeSyntax;
  if (codeSyntax !== undefined && !isRecord(codeSyntax)) {
    return false;
  }
  return true;
}

export function readVariableSnapshotTokens(): Record<string, VariableComparable> {
  const snapshot = getSnapshot();
  const result: Record<string, VariableComparable> = {};

  for (const entryKey of Object.keys(snapshot.keys)) {
    if (!entryKey.startsWith('var/')) {
      continue;
    }
    const entry = snapshot.keys[entryKey];
    if (!isVariableComparable(entry.value)) {
      continue;
    }
    const parsed = parseVariableDriftId(entryKey);
    if (parsed === null) {
      continue;
    }
    const mapKey = parsed.collectionName + '/' + parsed.variableName;
    result[mapKey] = entry.value;
  }

  return result;
}
