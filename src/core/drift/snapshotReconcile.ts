import { getSnapshot, persistSnapshot } from '@/core/sync/snapshotStore';
import { pluginLog } from '@/core/pluginLog';

import { parseVariableDriftId } from './variableKeys';
import type { VariableComparable } from './types';
import { variableStatesEqual } from './variableEqual';

/**
 * Push-sourced snapshot rows written when a PR opened (pre-fix) recorded Figma before
 * merge. Ignore them for drift classify until repo matches or the row is removed.
 */
export function isPrematurePushSnapshot(
  figma: VariableComparable | null,
  repo: VariableComparable | null,
  snapshot: VariableComparable | null,
  source: 'push' | 'pull' | undefined,
): boolean {
  if (source !== 'push' || snapshot === null || figma === null) {
    return false;
  }
  if (!variableStatesEqual(figma, snapshot)) {
    return false;
  }
  if (repo === null) {
    return true;
  }
  return !variableStatesEqual(figma, repo);
}

export function resolveSnapshotForClassify(
  figma: VariableComparable | null,
  repo: VariableComparable | null,
  snapshot: VariableComparable | null,
  source: 'push' | 'pull' | undefined,
): VariableComparable | null {
  if (isPrematurePushSnapshot(figma, repo, snapshot, source)) {
    return null;
  }
  return snapshot;
}

function isVariableComparable(value: unknown): value is VariableComparable {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as VariableComparable).resolvedType === 'string' &&
    typeof (value as VariableComparable).valuesByMode === 'object'
  );
}

/**
 * Remove premature push snapshot keys from the canvas store so fetch/detect stay correct.
 */
export function reconcilePrematurePushSnapshotKeys(
  figmaTokens: Record<string, VariableComparable>,
  repoTokens: Record<string, VariableComparable>,
): number {
  const snapshot = getSnapshot();
  const nextKeys: Record<string, (typeof snapshot.keys)[string]> = {};
  let removed = 0;

  for (const entryKey of Object.keys(snapshot.keys)) {
    const entry = snapshot.keys[entryKey];
    if (!entryKey.startsWith('var/')) {
      nextKeys[entryKey] = entry;
      continue;
    }
    if (!isVariableComparable(entry.value)) {
      nextKeys[entryKey] = entry;
      continue;
    }
    const parsed = parseVariableDriftId(entryKey);
    if (parsed === null) {
      nextKeys[entryKey] = entry;
      continue;
    }
    const mapKey = parsed.collectionName + '/' + parsed.variableName;
    const figma = figmaTokens[mapKey] !== undefined ? figmaTokens[mapKey] : null;
    const repo = repoTokens[mapKey] !== undefined ? repoTokens[mapKey] : null;
    if (isPrematurePushSnapshot(figma, repo, entry.value, entry.source)) {
      removed += 1;
      continue;
    }
    nextKeys[entryKey] = entry;
  }

  if (removed > 0) {
    persistSnapshot({
      v: 1,
      kind: 'snapshot',
      fileKey: snapshot.fileKey,
      updatedAt: new Date().toISOString(),
      keys: nextKeys,
      registry: snapshot.registry,
    });
    pluginLog('[snapshot] reconciled premature push keys', String(removed));
  }

  return removed;
}

export function readVariableSnapshotSources(): Record<string, 'push' | 'pull'> {
  const snapshot = getSnapshot();
  const result: Record<string, 'push' | 'pull'> = {};
  for (const entryKey of Object.keys(snapshot.keys)) {
    if (!entryKey.startsWith('var/')) {
      continue;
    }
    const parsed = parseVariableDriftId(entryKey);
    if (parsed === null) {
      continue;
    }
    const entry = snapshot.keys[entryKey];
    const mapKey = parsed.collectionName + '/' + parsed.variableName;
    result[mapKey] = entry.source;
  }
  return result;
}
