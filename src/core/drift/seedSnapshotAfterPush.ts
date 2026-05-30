/// <reference types="@figma/plugin-typings" />

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { readFigmaVariableState } from '@/core/audit/readFigmaVariableState';
import { pluginLog } from '@/core/pluginLog';
import { clearVariableSnapshotKeys, updateSnapshotKeys } from '@/core/sync/snapshotStore';

import { normalizeVariableComparable } from './normalizeComparable';
import { variableStatesEqual } from './variableEqual';
import { toVariableDriftId } from './variableKeys';
import { flattenFigmaVariableSnapshots, flattenRepoTokens } from './variables';

/**
 * After a successful variable push (bootstrap or pull apply), record synced keys as the
 * drift baseline so Fetch latest does not false-positive on hex/float COLOR representation.
 */
export async function seedVariableSnapshotFromTokens(tokens: TokensV1): Promise<number> {
  clearVariableSnapshotKeys();

  const figmaCollections = await readFigmaVariableState();
  const figmaFlat = flattenFigmaVariableSnapshots(figmaCollections, { resolveAliases: true });
  const repoFlat = flattenRepoTokens(tokens);

  const updates: { key: string; value: unknown; source: 'pull' }[] = [];
  for (const mapKey of Object.keys(repoFlat)) {
    const figma = figmaFlat[mapKey];
    const repo = repoFlat[mapKey];
    if (figma === undefined || repo === undefined) {
      continue;
    }
    if (!variableStatesEqual(figma, repo)) {
      continue;
    }
    const slashIndex = mapKey.indexOf('/');
    if (slashIndex <= 0) {
      continue;
    }
    updates.push({
      key: toVariableDriftId(mapKey.slice(0, slashIndex), mapKey.slice(slashIndex + 1)),
      value: normalizeVariableComparable(repo),
      source: 'pull',
    });
  }

  if (updates.length > 0) {
    updateSnapshotKeys(updates);
  }

  pluginLog('[snapshot] seeded variable keys after push', String(updates.length));
  return updates.length;
}
