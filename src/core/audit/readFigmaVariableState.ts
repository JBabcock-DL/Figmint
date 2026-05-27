/// <reference types="@figma/plugin-typings" />

import type { LocalVariableSnapshot } from '../variables/types';

import { pluginLog } from '../pluginLog';

import type { FigmaCollectionSnapshot, FigmaVariableSnapshot } from './types';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as Record<'message', unknown>).message;
    return String(message);
  }
  return String(error);
}

function readCodeSyntax(variable: Variable): Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> {
  const result: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>> = {};
  const syntax = variable.codeSyntax;
  if (syntax.WEB) {
    result.WEB = syntax.WEB;
  }
  if (syntax.ANDROID) {
    result.ANDROID = syntax.ANDROID;
  }
  if (syntax.iOS) {
    result.iOS = syntax.iOS;
  }
  return result;
}

function snapshotVariable(
  variable: Variable,
  collection: VariableCollection,
  modeIdToName: Record<string, string>,
): FigmaVariableSnapshot | null {
  try {
    const valuesByMode: Record<string, VariableValue> = {};
    const rawByMode = variable.valuesByMode;
    const modeIds = Object.keys(rawByMode);
    for (const modeId of modeIds) {
      const modeName = modeIdToName[modeId];
      if (modeName) {
        valuesByMode[modeName] = rawByMode[modeId];
      }
    }

    return {
      id: variable.id,
      name: variable.name,
      collectionId: collection.id,
      collectionName: collection.name,
      resolvedType: variable.resolvedType,
      valuesByMode,
      codeSyntax: readCodeSyntax(variable),
    };
  } catch (error) {
    pluginLog('[figmint] skip variable snapshot', variable.name, extractErrorMessage(error));
    return null;
  }
}

/**
 * Snapshot local variables for post-push audit.
 * Uses getLocalVariablesAsync (same as push snapshot) — avoid per-id getVariableByIdAsync
 * which can throw during Figma internal resolveValue on large batches.
 */
export async function readFigmaVariableState(): Promise<FigmaCollectionSnapshot[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();

  const variablesByCollectionId = new Map<string, Variable[]>();
  for (const variable of allVariables) {
    const collectionId = variable.variableCollectionId;
    let list = variablesByCollectionId.get(collectionId);
    if (!list) {
      list = [];
      variablesByCollectionId.set(collectionId, list);
    }
    list.push(variable);
  }

  const snapshots: FigmaCollectionSnapshot[] = [];

  for (const collection of collections) {
    const modeIdToName: Record<string, string> = {};
    for (const mode of collection.modes) {
      modeIdToName[mode.modeId] = mode.name;
    }

    const modes = collection.modes.map(function (mode) {
      return { modeId: mode.modeId, name: mode.name };
    });

    const collectionVariables = variablesByCollectionId.get(collection.id);
    const variables: FigmaVariableSnapshot[] = [];

    if (collectionVariables) {
      for (const variable of collectionVariables) {
        const snap = snapshotVariable(variable, collection, modeIdToName);
        if (snap) {
          variables.push(snap);
        }
      }
    }

    snapshots.push({
      id: collection.id,
      name: collection.name,
      modes,
      variables,
    });
  }

  return snapshots;
}

/**
 * Build audit snapshots from push-time Variable handles — avoids a second
 * `getLocalVariablesAsync()` pass that can trigger Figma internal resolveValue errors.
 */
export function buildFigmaVariableStateFromLocalSnapshot(
  snapshot: LocalVariableSnapshot,
): FigmaCollectionSnapshot[] {
  const snapshots: FigmaCollectionSnapshot[] = [];

  for (const collection of snapshot.collections) {
    const modeIdToName: Record<string, string> = {};
    const modes = collection.modes.map(function (mode) {
      modeIdToName[mode.modeId] = mode.name;
      return { modeId: mode.modeId, name: mode.name };
    });

    const variables: FigmaVariableSnapshot[] = [];
    for (const variable of snapshot.variables) {
      if (variable.variableCollectionId !== collection.id) {
        continue;
      }
      const figmaSnapshot = snapshotVariable(variable, collection, modeIdToName);
      if (figmaSnapshot) {
        variables.push(figmaSnapshot);
      }
    }

    snapshots.push({
      id: collection.id,
      name: collection.name,
      modes,
      variables,
    });
  }

  return snapshots;
}
